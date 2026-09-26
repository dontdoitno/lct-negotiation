import { z } from "zod";
import { ACTION_CODES, ActionCode } from "../engine/types";
import { getLLMProvider, isMockMode, Message } from "./provider";

export interface AnalysisResult {
  actions: ActionCode[];
  tone: "calm" | "firm" | "soft" | "harsh";
  mentionsConcrete: boolean;
  rationale: string;
}

const AnalysisSchema = z.object({
  actions: z.array(z.enum(ACTION_CODES as unknown as [ActionCode, ...ActionCode[]])).min(1).max(3),
  tone: z.enum(["calm", "firm", "soft", "harsh"]),
  mentionsConcrete: z.boolean(),
  rationale: z.string(),
});

const ACTIONS_DOC = `ack_emotion — руководитель называет эмоцию собеседника («вижу, ты на взводе»)
firm_respect — держит позицию, но без обесценивания
open_question — открытый вопрос, начинается не с «ты не...»
specific_recognition — называет конкретный вклад, не общая похвала
offer_options — предлагает варианты решения
objective_criteria — опирается на данные, нагрузку команды, правила
commit_fix — фиксирует договорённость с именами и сроками
apology — признаёт свою ошибку
postpone_with_deadline — «я подумаю» с конкретным сроком
blame — обвиняет
pressure — давит, требует, ссылается на власть
ignore_emotion — переводит на факты, проигнорировав заявленное чувство
mirror_aggression — отвечает на резкость резкостью
direct_criticism — критикует работу без опоры на факты
softness_no_substance — успокаивает, не предлагая ничего конкретного
postpone_no_deadline — «я подумаю» без срока
postpone_repeat — повторное «я подумаю» (проверь историю)
small_talk / clarify_fact / off_topic — нейтральные`;

function buildPrompt(text: string, history: string[]): Message[] {
  return [
    {
      role: "system",
      content: `Ты — анализатор переговорных реплик. Классифицируй реплику руководителя.
Верни строго JSON по схеме. Никакого текста вне JSON.

ДОСТУПНЫЕ ДЕЙСТВИЯ:
${ACTIONS_DOC}

СХЕМА ОТВЕТА:
{"actions": ["код", ...], "tone": "calm|firm|soft|harsh", "mentionsConcrete": boolean, "rationale": "одно предложение, обращение на «вы»"}`,
    },
    {
      role: "user",
      content: `ПОСЛЕДНИЕ РЕПЛИКИ:\n${history.join("\n")}\n\nРЕПЛИКА РУКОВОДИТЕЛЯ: "${text}"`,
    },
  ];
}

// The classifier heuristic is free, instant, and already tuned against the
// action taxonomy — routing it through a paid LLM call buys nothing but
// latency and cost, doubling the per-turn API spend for no gain in the
// product's core reproducibility guarantee. Keep it off by default even
// when a real provider is configured for the actor; opt in explicitly with
// ANALYZER_LLM=true if you actually want the model to classify replies too.
function shouldUseLLM(): boolean {
  return !isMockMode() && process.env.ANALYZER_LLM === "true";
}

export async function analyzeTurn(text: string, history: string[]): Promise<AnalysisResult> {
  if (!shouldUseLLM()) return mockAnalyze(text);

  const provider = getLLMProvider();
  try {
    const raw = await provider.complete(buildPrompt(text, history), { schema: {}, temperature: 0, maxTokens: 200 });
    const parsed = AnalysisSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    // LLM returned malformed output — fall back to the deterministic
    // heuristic rather than breaking the turn.
    return mockAnalyze(text);
  }
}

// ---------------------------------------------------------------------------
// Deterministic keyword heuristic — used in MOCK_MODE and as an LLM fallback.
// Not a substitute for the real analyzer's nuance, but keeps the engine
// reproducible offline and never blocks a turn.
// ---------------------------------------------------------------------------

interface Rule {
  action: ActionCode;
  test: (t: string) => boolean;
}

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));

// "я подумаю" / "надо подумать" (1st person / infinitive) = stalling —
// postpone. "давайте подумаем" (1st person plural, "let's think [it over
// together, right now]") is a collaborative invitation, not postponement —
// explicitly excluded so it doesn't false-positive on the "подума" stem.
const isPersonalPostpone = (t: string) => has(t, "подума") && !has(t, "подумаем");

const RULES: Rule[] = [
  { action: "apology", test: (t) => has(t, "извини", "прости", "я был непра", "моя ошибка", "виноват перед") },
  {
    action: "mirror_aggression",
    test: (t) => /!!!|хватит|заткнись|бесишь|достал/.test(t),
  },
  { action: "blame", test: (t) => has(t, "из-за тебя", "ты виноват", "ты сам виноват", "твоя вина") },
  { action: "pressure", test: (t) => has(t, "ты обязан", "ты должен", "я приказываю", "иначе будет", "жду сегодня же") },
  { action: "direct_criticism", test: (t) => has(t, "ты не справляешься", "это никуда не годится", "плохо сделал", "слабо сработал") },
  {
    action: "softness_no_substance",
    test: (t) => has(t, "не переживай", "всё будет хорошо", "успокойся", "не парься") && !has(t, "к пятниц", "к понедельник", "давай так", "предлагаю"),
  },
  {
    action: "postpone_repeat",
    test: (t) => has(t, "ещё подумаю", "опять подумаю", "снова подумаю"),
  },
  {
    action: "postpone_with_deadline",
    test: (t) =>
      isPersonalPostpone(t) &&
      has(t, "завтра", "к понедельник", "к пятниц", "через день", "до конца недели", "к среде", "к четвергу"),
  },
  { action: "postpone_no_deadline", test: (t) => isPersonalPostpone(t) },
  {
    action: "commit_fix",
    test: (t) =>
      has(t, "договорились", "зафиксируем", "давайте запишем", "берёшь на себя", "берешь на себя") &&
      has(t, "к пятниц", "к понедельник", "срок", "числ", "недел", "завтра", "до конца"),
  },
  {
    action: "objective_criteria",
    test: (t) => has(t, "объективн", "по данным", "данным", "нагрузк", "по фактам", "фактически", "статистик", "по цифрам", "загрузк"),
  },
  { action: "offer_options", test: (t) => has(t, "можем сделать так", "вариант", "предлагаю", "или мы", "либо") },
  { action: "specific_recognition", test: (t) => has(t, "спасибо тебе за", "ценю то, что", "ты хорошо справился с", "отлично сделал") },
  {
    action: "ack_emotion",
    test: (t) => has(t, "вижу, что ты", "понимаю, что ты", "чувствую, что", "ты на взводе", "тебе тяжело", "ты устал"),
  },
  {
    action: "firm_respect",
    test: (t) => has(t, "услышал тебя, и всё же", "я услышал тебя, но", "тем не менее", "при этом важно"),
  },
  { action: "ignore_emotion", test: (t) => has(t, "давай к делу", "вернёмся к срокам", "не важно, как ты себя чувствуешь") },
  { action: "clarify_fact", test: (t) => t.includes("?") && has(t, "сколько", "когда", "какие именно", "что именно") },
  { action: "open_question", test: (t) => t.trim().endsWith("?") && !t.trim().toLowerCase().startsWith("ты не") },
  { action: "off_topic", test: () => false },
];

function mockAnalyze(text: string): AnalysisResult {
  const t = text.toLowerCase();
  const matched: ActionCode[] = [];
  for (const rule of RULES) {
    if (rule.test(t)) matched.push(rule.action);
    if (matched.length >= 3) break;
  }
  const actions: ActionCode[] = matched.length > 0 ? matched : ["small_talk"];

  const harsh = actions.some((a) => ["blame", "pressure", "mirror_aggression", "direct_criticism"].includes(a));
  const soft = actions.includes("softness_no_substance") || actions.includes("apology");
  const firm = actions.includes("firm_respect") || actions.includes("objective_criteria");
  const tone: AnalysisResult["tone"] = harsh ? "harsh" : firm ? "firm" : soft ? "soft" : "calm";

  return {
    actions,
    tone,
    mentionsConcrete: actions.some((a) => ["objective_criteria", "commit_fix", "offer_options"].includes(a)),
    rationale: rationaleFor(actions),
  };
}

const RATIONALE_BY_ACTION: Partial<Record<ActionCode, string>> = {
  ack_emotion: "Вы назвали его состояние вслух.",
  firm_respect: "Вы удержали позицию, не обесценив собеседника.",
  open_question: "Вы задали открытый вопрос вместо готового решения.",
  specific_recognition: "Вы признали конкретный вклад, а не похвалили в общих словах.",
  offer_options: "Вы предложили варианты вместо одного решения.",
  objective_criteria: "Вы опёрлись на факты и данные, а не на мнение.",
  commit_fix: "Вы зафиксировали договорённость с конкретикой.",
  apology: "Вы признали свою часть ответственности.",
  postpone_with_deadline: "Вы отложили решение, но назвали срок.",
  postpone_no_deadline: "Вы отложили решение без срока.",
  postpone_repeat: "Вы второй раз откладываете решение — договорённость обесценивается.",
  blame: "Вы переложили ответственность на собеседника.",
  pressure: "Вы надавили вместо того, чтобы разобраться.",
  ignore_emotion: "Вы проигнорировали то, что он только что сказал о своём состоянии.",
  mirror_aggression: "Вы ответили резкостью на резкость.",
  direct_criticism: "Вы раскритиковали его без опоры на факты.",
  softness_no_substance: "Вы успокоили, не предложив ничего конкретного.",
  small_talk: "Реплика не по существу разговора.",
  clarify_fact: "Вы уточнили факт.",
  off_topic: "Вы ушли от темы.",
};

function rationaleFor(actions: ActionCode[]): string {
  return actions.map((a) => RATIONALE_BY_ACTION[a]).filter(Boolean).join(" ") || "Нейтральная реплика.";
}
