"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
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

export default function CallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [s, dispatch] = useReducer(callReducer, initialCallState);
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [trainingOverride, setTrainingOverride] = useState<boolean | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [hintOpen, setHintOpen] = useState(false);

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
      try {
        await postSSE(`/api/session/${sessionId}/turn`, { text, inputMode: mode }, (e) => {
          const data = JSON.parse(e.data);
          switch (e.event) {
            case "analysis":
              dispatch({ type: "ANALYSIS", payload: { rationale: data.rationale, deltas: data.deltas } });
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
        });
      } catch (err) {
        dispatch({ type: "ERROR", payload: { message: err instanceof Error ? err.message : "Ошибка соединения" } });
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
  const trainingMode = trainingOverride ?? persona.type === "rational";
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

  // A conversation that broke off (AI left, turns ran out) goes through the
  // interstitial first. Reaching agreement, or the player ending the call
  // deliberately, goes straight to the debrief.
  const endedHref =
    ended && s.status !== "success" ? `/session/${sessionId}/ended` : `/session/${sessionId}/debrief`;

  function endCall() {
    if (ended || window.confirm("Завершить разговор и перейти к разбору?")) router.push(endedHref);
  }

  return (
    <div className="grid h-screen grid-rows-[60px_minmax(0,1fr)] bg-surface text-primary">
      <header className="flex items-center gap-5 border-b-[1.5px] border-border-strong px-6">
        <span className={`h-2 w-2 rounded-full ${ended ? "bg-disabled" : "rec-dot bg-accent-bg"}`} />
        <div className="text-[19px]">{scenario.title}</div>
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
        <button onClick={endCall} className="rounded-md border-2 border-primary px-4 py-1.5 text-base">
          Завершить разговор
        </button>
      </header>

      <div className="grid min-h-0 grid-cols-[320px_minmax(0,1fr)_340px]">
        {/* Left: case + transcript */}
        <aside className="flex min-h-0 flex-col border-r-[1.5px] border-border-strong">
          <div className="flex flex-col gap-2 border-b-[1.5px] border-dashed border-border p-[18px]">
            <div className="label-case text-[11px] text-secondary">Сценарий</div>
            <div className="text-base leading-snug">{scenario.context}</div>
            <div className="label-case mt-1.5 text-[11px] text-secondary">Ваша цель</div>
            <ul className="flex flex-col gap-1.5">
              {(s.goals.length ? s.goals : scenario.playerGoals.map((g) => ({ id: g.id, text: g.text, done: false, progress: 0 }))).map((g) => (
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
        </aside>

        {/* Center: call window + input */}
        <main className="flex min-h-0 flex-col gap-4 p-5">
          <CallStage
            name={persona.displayName}
            position={persona.position}
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

        {/* Right: per-turn feedback + live metrics */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-l-[1.5px] border-border-strong px-5 py-[18px]">
          <TurnFeedbackCard item={lastPlayer} pending={s.sending && !lastPlayer?.rationale} />
          <LiveMetrics state={s.state} deltas={s.deltas} deltaSeq={s.deltaSeq} turn={s.turn} />
        </aside>
      </div>
    </div>
  );
}
