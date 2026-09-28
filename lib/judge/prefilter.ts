import { JudgeMetrics, PersonaType, ZERO_DELTAS } from "./types";

export type PrefilterReason = "empty" | "off_topic" | "abuse" | "prompt_injection";

export interface PrefilterHit {
  triggered: true;
  reason: PrefilterReason;
  deltas: JudgeMetrics;
  reply: string;
}

export interface PrefilterMiss {
  triggered: false;
}

export type PrefilterResult = PrefilterHit | PrefilterMiss;

const CLARIFY_REPLY: Record<PersonaType, string> = {
  rational: "Уточните, пожалуйста — не совсем понял, что вы имеете в виду.",
  anxious: "Простите… я не совсем поняла. Можете сказать иначе?",
  aggressive: "Что именно? Говорите яснее, у меня нет времени гадать.",
};

const ABUSE_REPLY: Record<PersonaType, string> = {
  rational: "Такой тон не поможет решить вопрос. Предлагаю вернуться к делу.",
  anxious: "Мне неприятно это слышать… давайте не будем так.",
  aggressive: "Вот только не надо на меня орать — сам такой!",
};

const INJECTION_REPLY: Record<PersonaType, string> = {
  rational: "Я не понимаю, к чему это. Вернёмся к разговору о нагрузке?",
  anxious: "Простите, я не поняла… о чём вы вообще?",
  aggressive: "Ты о чём вообще? Давай по делу.",
};

// Deliberately short and extensible — this is a rule-based safety net, not
// an attempt at exhaustive moderation. Add to these lists as real sessions
// surface gaps.
// Real phrasings put adjectives between the verb and the keyword ("игнорируй
// все ПРЕДЫДУЩИЕ инструкции", "ты теперь ПРОСТО ассистент"), so each pattern
// tolerates a few intervening words rather than demanding them adjacent.
const GAP = String.raw`(?:\s+\S+){0,3}\s+`;

const INJECTION_PATTERNS = [
  new RegExp(String.raw`игнориру\S*${GAP}(?:инструкц|промпт|систем|правил)`, "i"),
  new RegExp(String.raw`забудь${GAP}(?:инструкц|промпт|систем|правил|роль|персонаж)`, "i"),
  new RegExp(String.raw`ты${GAP}(?:ассистент|языков\S*\s+модел|нейросет|бот\b|ии\b|ai\b)`, "i"),
  /ignore\s+(?:all\s+)?(?:previous|above)\s+instructions/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+(?:an?\s+)?(?:assistant|ai|chatbot)/i,
  /разработчик\S*\s+режим/i,
  /developer\s+mode/i,
];

const ABUSE_WORDS = ["идиот", "дурак", "тупой", "тупица", "кретин", "мудак", "придурок", "дебил"];

function isAbusive(text: string): boolean {
  const lower = text.toLowerCase();
  if (ABUSE_WORDS.some((w) => lower.includes(w))) return true;
  // Shouting punctuation counts only alongside actual words — on its own
  // ("12345 !!!") it's noise, which isOffTopic already handles.
  return /[!?]{3,}/.test(text) && /[а-яёa-z]{3,}/i.test(text);
}

function isOffTopic(text: string): boolean {
  const letters = text.replace(/[^а-яa-zё]/gi, "");
  if (letters.length === 0) return true; // pure symbols/numbers/emoji
  if (letters.length / text.length < 0.3) return true; // mostly noise
  if (/(.)\1{4,}/i.test(text)) return true; // "аааааа", "!!!!!" style spam
  return false;
}

export function runPrefilter(rawText: string, persona: PersonaType): PrefilterResult {
  const text = rawText.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (!text || wordCount < 3) {
    return { triggered: true, reason: "empty", deltas: ZERO_DELTAS, reply: CLARIFY_REPLY[persona] };
  }

  if (INJECTION_PATTERNS.some((re) => re.test(text))) {
    return { triggered: true, reason: "prompt_injection", deltas: ZERO_DELTAS, reply: INJECTION_REPLY[persona] };
  }

  if (isAbusive(text)) {
    return {
      triggered: true,
      reason: "abuse",
      deltas: { ...ZERO_DELTAS, trust: -2, resistance: 2 },
      reply: ABUSE_REPLY[persona],
    };
  }

  if (isOffTopic(text)) {
    return { triggered: true, reason: "off_topic", deltas: ZERO_DELTAS, reply: CLARIFY_REPLY[persona] };
  }

  return { triggered: false };
}
