"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { callReducer, initialCallState, TranscriptItem } from "@/lib/call/reducer";
import { postSSE } from "@/lib/call/sse";
import { turnIsPositive } from "@/lib/call/metricDirection";
import { NPC_REPLY_MODE } from "@/lib/call/config";
import { useSpeechInput } from "@/lib/call/useSpeechInput";
import { CallStage, StageStatus } from "@/components/call/CallStage";
import { CallTranscript } from "@/components/call/CallTranscript";
import { InputBar, InputMode } from "@/components/call/InputBar";
import { LiveMetrics } from "@/components/call/LiveMetrics";
import { TurnFeedbackCard } from "@/components/call/TurnFeedbackCard";
import { ScorePopupStack } from "@/components/call/ScorePopup";
import { HINTS_CUTOFF_TURN, OPENING_SUGGESTION_CHIPS, resistanceDeltaHint, TURN_HINTS } from "@/lib/content/onboardingHints";
import { TestRunBanner, TestRunPanel } from "@/components/admin/TestRunPanel";

export default function CallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [s, dispatch] = useReducer(callReducer, initialCallState);
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [trainingOverride, setTrainingOverride] = useState<boolean | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [hintOpen, setHintOpen] = useState(false);
  // Тест-прогон из админки: та же механика, сверху плашка, справа отладка.
  const [isTestRun, setIsTestRun] = useState(false);
  // Завершение идёт: кнопка не должна срабатывать второй раз, пока мы
  // закрываем сессию на сервере.
  const [finishing, setFinishing] = useState(false);
  // Узкий экран: сценарий и метрики не помещаются рядом со звонком, поэтому
  // открываются поверх по кнопке. На широком экране не используется.
  const [mobilePanel, setMobilePanel] = useState<"scenario" | "metrics" | null>(null);
  // Запрос текущего хода. Нужен, чтобы оборвать его при завершении: иначе
  // ответ модели дописывал ход в уже закрытую сессию.
  const turnAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/session/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setIsTestRun(data.isTestRun === true);
        const transcript: TranscriptItem[] = [];
        if (data.openingLine && data.turns.length === 0) {
          transcript.push({ id: "opening", speaker: "npc", text: data.openingLine });
        }
        for (const t of data.turns) {
          const deltas = t.deltas ?? {};
          transcript.push({ id: `${t.index}-p`, speaker: "player", text: t.playerText, rationale: t.rationale, deltas, positive: turnIsPositive(deltas) });
          transcript.push({ id: `${t.index}-n`, speaker: "npc", text: t.npcText });
        }
        dispatch({
          type: "INIT",
          payload: { scenario: data.scenario, persona: data.persona, state: data.state, openingLine: data.openingLine, transcript, status: data.status },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (s.scorePopups.length === 0) return;
    const latest = s.scorePopups[s.scorePopups.length - 1];
    const timer = setTimeout(() => dispatch({ type: "POP_SCORE", payload: { id: latest.id } }), 2200);
    return () => clearTimeout(timer);
  }, [s.scorePopups]);

  // Hint closes automatically once the player moves to the next turn.
  useEffect(() => setHintOpen(false), [s.turn]);

  const send = useCallback(
    async (raw: string, mode: InputMode) => {
      const text = raw.trim();
      if (!text || s.sending || s.status !== "active") return;
      if (mode === "text") setInput("");
      dispatch({ type: "SEND_START", payload: { text, id: `local-${Date.now()}` } });
      const controller = new AbortController();
      turnAbort.current = controller;
      try {
        await postSSE(`/api/session/${sessionId}/turn`, { text, inputMode: mode }, (e) => {
          const data = JSON.parse(e.data);
          switch (e.event) {
            case "analysis":
              dispatch({ type: "ANALYSIS", payload: { rationale: data.rationale, deltas: data.deltas, actions: data.actions } });
              break;
            case "state":
              dispatch({ type: "STATE", payload: data });
              break;
            case "reveal":
              dispatch({ type: "REVEAL", payload: data });
              break;
            case "npc_chunk":
              dispatch({ type: "NPC_CHUNK", payload: data });
              break;
            case "npc_done":
              dispatch({ type: "NPC_DONE", payload: data });
              break;
          }
        }, controller.signal);
      } catch (err) {
        // Ход оборван самим игроком через «Завершить разговор»: это не ошибка,
        // показывать её на экране незачем.
        if (controller.signal.aborted) return;
        dispatch({ type: "ERROR", payload: { message: err instanceof Error ? err.message : "Ошибка соединения" } });
      } finally {
        if (turnAbort.current === controller) turnAbort.current = null;
      }
    },
    [s.sending, s.status, sessionId],
  );

  const speech = useSpeechInput((text) => send(text, "voice"));

  if (!s.ready || !s.persona || !s.scenario || !s.state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-body text-secondary">
        <span className="label-case text-xs">Подключаемся…</span>
      </div>
    );
  }

  const persona = s.persona;
  const scenario = s.scenario;
  const trainingMode = trainingOverride ?? scenario.trainingModeDefault === true;
  const ended = s.status !== "active";
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const hintText = s.turn <= HINTS_CUTOFF_TURN ? (s.turn === 1 ? resistanceDeltaHint(s.deltas.R ?? 0) : TURN_HINTS[s.turn]) : undefined;
  const showHint = !!hintText && !ended && (trainingMode || hintOpen);
  const showChips = trainingMode && s.turn === 0 && !ended && (inputMode === "text" || !speech.supported);

  const lastPlayer = [...s.transcript].reverse().find((t) => t.speaker === "player");
  const npcItem = s.streamingNpcId
    ? s.transcript.find((t) => t.id === s.streamingNpcId)
    : [...s.transcript].reverse().find((t) => t.speaker === "npc");
  const stageStatus: StageStatus = s.portraitStatus === "speaking" ? "speaking" : s.portraitStatus === "thinking" ? "thinking" : "listening";
  const reply = s.portraitStatus === "thinking" ? null : npcItem?.text ?? null;

  // Экран финала нужен только там, где разговор оборвался сам: сотрудник ушёл
  // или кончились ходы. Договорённость и остановка по кнопке ведут сразу в
  // разбор, иначе игрок увидел бы «он сорвался» после собственного решения.
  const viaInterstitial = ended && s.status !== "success" && s.status !== "stopped";
  const endedHref = viaInterstitial
    ? `/session/${sessionId}/ended`
    : `/session/${sessionId}/debrief`;

  /**
   * Завершение по кнопке. Порядок важен: сначала обрываем летящий ход, потом
   * закрываем сессию на сервере и только затем уходим на разбор.
   *
   * Раньше здесь был один router.push, сессия навсегда оставалась активной,
   * разговор не засчитывался попыткой и доска кейсов не открывалась.
   */
  async function endCall() {
    if (ended) {
      router.push(endedHref);
      return;
    }
    if (finishing) return;
    if (!window.confirm("Завершить разговор и перейти к разбору?")) return;

    setFinishing(true);
    turnAbort.current?.abort();
    speech.stop();

    try {
      const res = await fetch(`/api/session/${sessionId}/finish`, { method: "POST" });
      const data = await res.json().catch(() => null);
      // Сессия могла закрыться сама последним ходом. Тогда ведём туда, куда
      // полагается по настоящему исходу, а не по остановке.
      const status: string = data?.status ?? "stopped";
      const toInterstitial = status !== "success" && status !== "stopped" && status !== "active";
      router.push(
        toInterstitial ? `/session/${sessionId}/ended` : `/session/${sessionId}/debrief`,
      );
    } catch {
      // Сервер недоступен: разбор всё равно открываем, он считается по уже
      // сохранённым ходам. Лучше показать результат, чем запереть игрока.
      router.push(`/session/${sessionId}/debrief`);
    }
  }

  const goalsList = s.goals.length
    ? s.goals
    : scenario.playerGoals.map((g) => ({ id: g.id, text: g.text, done: false, progress: 0 }));

  /** Сценарий, цели и транскрипт. Левая колонка на широком экране. */
  const scenarioPanel = (
    <>
      <div className="flex max-h-[45%] shrink-0 flex-col gap-2 overflow-y-auto border-b-[1.5px] border-dashed border-border p-[18px]">
        <div className="label-case text-[11px] text-secondary">Сценарий</div>
        <div className="text-base leading-snug">{scenario.context}</div>
        <div className="label-case mt-1.5 text-[11px] text-secondary">Ваша цель</div>
        <ul className="flex flex-col gap-1.5">
          {goalsList.map((g) => (
            <li key={g.id} className={`flex items-start gap-2 text-[15px] leading-snug ${g.done ? "text-disabled" : ""}`}>
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-border-strong text-[11px] ${g.done ? "bg-border-strong text-white" : ""}`}>
                {g.done ? "✓" : ""}
              </span>
              {g.text}
            </li>
          ))}
        </ul>
      </div>
      <div className="label-case px-[18px] pb-1.5 pt-3.5 text-[11px] text-secondary">Транскрипт</div>
      <CallTranscript items={s.transcript} npcName={persona.displayName} activeId={s.streamingNpcId} />
    </>
  );

  /** Оценка хода и живые метрики. Правая колонка на широком экране. */
  const metricsPanel = (
    <>
      <TurnFeedbackCard item={lastPlayer} pending={s.sending && !lastPlayer?.rationale} />
      <LiveMetrics state={s.state} deltas={s.deltas} deltaSeq={s.deltaSeq} turn={s.turn} />
    </>
  );

  // В тест-прогоне тот же экран, но с плашкой сверху и панелью отладки справа.
  const screen = (
    <div className="grid h-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-surface text-primary lg:grid-rows-[auto_minmax(0,1fr)]">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b-[1.5px] border-border-strong px-6 py-2.5">
        <span className={`h-2 w-2 rounded-full ${ended ? "bg-disabled" : "rec-dot bg-accent-bg"}`} />
        <h1 className="text-[19px] font-bold leading-tight">{scenario.title}</h1>
        <div className="flex-1" />
        <button
          onClick={() => setTrainingOverride(!trainingMode)}
          className={`rounded-full border-[1.5px] px-3 py-1 text-[13px] ${trainingMode ? "border-accent text-accent" : "border-border text-secondary"}`}
        >
          Обучающий режим {trainingMode ? "вкл" : "выкл"}
        </button>
        <div className="flex items-center gap-2.5 text-base">
          <span className="font-mono tabular-nums">{mm}:{ss}</span>
          <span className="text-secondary">· ход {Math.min(s.turn, scenario.turnLimit)} из {scenario.turnLimit}</span>
          <div className="h-2 w-[140px] overflow-hidden rounded border-[1.5px] border-border-strong">
            <div className="h-full bg-disabled transition-[width]" style={{ width: `${Math.min(100, (s.turn / scenario.turnLimit) * 100)}%` }} />
          </div>
        </div>
        <button
          onClick={endCall}
          disabled={finishing}
          className="rounded-md border-2 border-primary px-4 py-1.5 text-base disabled:opacity-60"
        >
          {finishing ? "Завершаем…" : "Завершить разговор"}
        </button>
      </header>

      {/* Колонки только с широкого экрана: 320 и 340 пикселей по краям не
          помещаются на телефоне, и центр со вводом уезжал за край. */}
      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_340px]">
        <aside className="hidden min-h-0 flex-col border-r-[1.5px] border-border-strong lg:flex">
          {scenarioPanel}
        </aside>

        {/* Center: call window + input */}
        <main className="flex min-h-0 flex-col gap-4 overflow-hidden p-5">
          <CallStage
            name={persona.displayName}
            avatar={persona.avatar}
            // position={persona.position}
            status={stageStatus}
            reply={reply}
            replyStreaming={!!s.streamingNpcId}
            replyMode={NPC_REPLY_MODE}
          />

          {showHint && (
            <div className="rise-in flex flex-col gap-1 rounded-lg border-2 border-dashed border-accent px-3 py-2.5">
              <div className="label-case text-[11px] text-accent">Подсказка</div>
              <div className="text-[15px] leading-snug">{hintText}</div>
            </div>
          )}

          {showChips && (
            <div className="flex flex-wrap gap-2">
              {OPENING_SUGGESTION_CHIPS.map((chip) => (
                <button key={chip} onClick={() => setInput(chip)} className="rounded-full border border-border px-3 py-1.5 text-[13px] text-secondary hover:border-border-strong hover:text-primary">
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            {ended ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border-[1.5px] border-border-strong px-4 py-3">
                <span className="text-[15px] text-secondary">
                  Разговор завершён: <span className="text-primary">{s.status === "success" ? "успех" : s.status === "failed" ? "срыв" : "лимит ходов"}</span>
                </span>
                <button onClick={() => router.push(endedHref)} className="rounded-md bg-accent-bg px-4 py-2 text-[15px] text-white">
                  К разбору →
                </button>
              </div>
            ) : (
              <InputBar
                mode={inputMode}
                onModeChange={setInputMode}
                voiceSupported={speech.supported}
                listening={speech.listening}
                interim={speech.interim}
                onMicStart={speech.start}
                onMicStop={speech.stop}
                value={input}
                onChange={setInput}
                onSubmit={() => send(input, "text")}
                disabled={s.sending}
                hintAvailable={!!hintText && !trainingMode}
                hintOpen={hintOpen}
                onToggleHint={() => setHintOpen((v) => !v)}
              />
            )}
            <ScorePopupStack events={s.scorePopups} />
          </div>
          {s.error && <p className="text-[13px] text-accent">Ошибка: {s.error}</p>}
        </main>

        <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto border-l-[1.5px] border-border-strong px-5 py-[18px] lg:flex">
          {metricsPanel}
        </aside>
      </div>

      {/* Узкий экран: две кнопки вместо боковых колонок. */}
      <div className="flex shrink-0 gap-2 border-t-[1.5px] border-border-strong px-4 py-2 lg:hidden">
        <MobileTab label="Сценарий" onClick={() => setMobilePanel("scenario")} />
        <MobileTab label="Метрики" onClick={() => setMobilePanel("metrics")} />
      </div>

      {mobilePanel && (
        <MobileSheet
          title={mobilePanel === "scenario" ? "Сценарий и транскрипт" : "Метрики разговора"}
          onClose={() => setMobilePanel(null)}
        >
          {mobilePanel === "scenario" ? scenarioPanel : metricsPanel}
        </MobileSheet>
      )}
    </div>
  );

  // Высота задаётся здесь, а не классом h-full внутри: у обёртки темы своей
  // высоты нет, и h-full там разворачивался в auto, отчего экран рос вслед за
  // транскриптом и поле ввода уходило под нижний край.
  if (!isTestRun) {
    return <div className="flex h-screen flex-col overflow-hidden">{screen}</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TestRunBanner />
      <div className="flex min-h-0 flex-1">
        {screen}
        <TestRunPanel scenarioId={persona.id} state={s} />
      </div>
    </div>
  );
}

/** Кнопка нижней полосы на узком экране. */
function MobileTab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-md border-[1.5px] border-border px-3 py-2 text-[15px] text-primary motion-safe:transition-colors hover:border-border-strong"
    >
      {label}
    </button>
  );
}

/**
 * Выдвижная панель на узком экране.
 *
 * Боковые колонки звонка заданы в пикселях и на телефоне не помещаются рядом с
 * центром, поэтому их содержимое показывается поверх. Панель занимает не весь
 * экран: сверху остаётся полоса, по которой видно, что звонок продолжается, и
 * по которой её можно закрыть.
 */
function MobileSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40 lg:hidden"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] min-h-0 flex-col rounded-t-2xl border-t-[1.5px] border-border-strong bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <span className="label-case text-[11px] text-secondary">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-md px-2 py-1 text-[15px] text-secondary hover:text-primary"
          >
            Закрыть
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
