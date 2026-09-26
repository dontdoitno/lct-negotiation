"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { callReducer, initialCallState, TranscriptItem } from "@/lib/call/reducer";
import { postSSE } from "@/lib/call/sse";
import { bucketOf } from "@/lib/engine/state";
import { PortraitTile } from "@/components/call/PortraitTile";
import { MetricsPanel } from "@/components/call/MetricsPanel";
import { MicroFeedback } from "@/components/call/MicroFeedback";
import { TurnCounter } from "@/components/call/TurnCounter";
import { ScorePopupStack } from "@/components/call/ScorePopup";
import { HINTS_CUTOFF_TURN, OPENING_SUGGESTION_CHIPS, resistanceDeltaHint, TURN_HINTS } from "@/lib/content/onboardingHints";

const EXPRESSION_BY_BUCKET = { high: "tense", medium: "neutral", low: "calm" } as const;

export default function CallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [s, dispatch] = useReducer(callReducer, initialCallState);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [trainingOverride, setTrainingOverride] = useState<boolean | null>(null);

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
          transcript.push({ id: `${t.index}-p`, speaker: "player", text: t.playerText, rationale: t.rationale, positive: (t.deltas?.R ?? 0) <= 0 });
          transcript.push({ id: `${t.index}-n`, speaker: "npc", text: t.npcText });
        }
        dispatch({
          type: "INIT",
          payload: {
            scenario: data.scenario,
            persona: data.persona,
            state: data.state,
            openingLine: data.openingLine,
            transcript,
            status: data.status,
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [s.transcript]);

  const trainingMode = trainingOverride ?? s.persona?.type === "rational";

  useEffect(() => {
    if (s.scorePopups.length === 0) return;
    const latest = s.scorePopups[s.scorePopups.length - 1];
    const timer = setTimeout(() => dispatch({ type: "POP_SCORE", payload: { id: latest.id } }), 2200);
    return () => clearTimeout(timer);
  }, [s.scorePopups]);

  const expression = useMemo(() => {
    if (!s.state) return "neutral" as const;
    const bucket = bucketOf("R", s.state.R) as "high" | "medium" | "low";
    return EXPRESSION_BY_BUCKET[bucket];
  }, [s.state]);

  async function send() {
    const text = input.trim();
    if (!text || s.sending || s.status !== "active") return;
    setInput("");
    dispatch({ type: "SEND_START", payload: { text, id: `local-${Date.now()}` } });

    try {
      await postSSE(`/api/session/${sessionId}/turn`, { text, inputMode: "text" }, (e) => {
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
  }

  if (!s.ready || !s.persona || !s.scenario || !s.state) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-muted">
        <span className="label-case text-xs">Подключаемся…</span>
      </div>
    );
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const ended = s.status !== "active";

  const dynamicHint = trainingMode && s.turn === 1 ? resistanceDeltaHint(s.deltas.R ?? 0) : null;
  const staticHint = trainingMode && s.turn <= HINTS_CUTOFF_TURN ? TURN_HINTS[s.turn] : undefined;
  const activeHint = dynamicHint ?? staticHint;
  const showChips = trainingMode && s.turn === 0 && !ended;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rec-dot h-2 w-2 rounded-full bg-resistance" />
          <span className="label-case text-xs text-ink-muted">Сеанс активен</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTrainingOverride(!trainingMode)}
            className={`label-case rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors ${
              trainingMode ? "border-insight/40 bg-insight-soft text-insight" : "border-line text-ink-faint"
            }`}
          >
            Обучающий режим {trainingMode ? "вкл" : "выкл"}
          </button>
          <span className="font-mono text-xs text-ink-faint">
            {mm}:{ss}
          </span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <PortraitTile name={s.persona.displayName} position={s.persona.position} expression={expression} status={s.portraitStatus} />

          <div ref={scrollRef} className="flex max-h-[36vh] min-h-[16vh] flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-panel p-4">
            {s.transcript.map((item) => (
              <TranscriptBubble key={item.id} item={item} npcName={s.persona!.displayName} />
            ))}
          </div>

          {activeHint && (
            <div className="rise-in flex items-start gap-2 rounded-md border border-insight/30 bg-insight-soft px-3 py-2.5 text-[13px] leading-relaxed text-ink">
              <span className="text-insight">💡</span>
              <span>{activeHint}</span>
            </div>
          )}

          {showChips && (
            <div className="flex flex-wrap gap-2">
              {OPENING_SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setInput(chip)}
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex flex-col gap-2 rounded-lg border border-line bg-panel p-3">
            {ended ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-muted">
                  Разговор завершён:{" "}
                  <span className="text-ink">
                    {s.status === "success" ? "успех" : s.status === "failed" ? "срыв" : "лимит ходов"}
                  </span>
                </span>
                <button
                  onClick={() => router.push(`/reflect/${sessionId}`)}
                  className="label-case rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-ink"
                >
                  К рефлексии →
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Печатайте сообщение…"
                  rows={1}
                  className="max-h-24 flex-1 resize-none rounded-md border border-line bg-panel-sunken px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
                />
                <button
                  onClick={send}
                  disabled={s.sending || !input.trim()}
                  className="label-case shrink-0 rounded-md bg-accent px-4 py-2.5 text-xs font-semibold text-accent-ink disabled:opacity-40"
                >
                  {s.sending ? "…" : "Отправить"}
                </button>
              </div>
            )}
            <ScorePopupStack events={s.scorePopups} />
          </div>

          <TurnCounter turn={s.turn} limit={s.scenario.turnLimit} />
          {s.error && <p className="text-xs text-resistance">{s.error}</p>}
        </div>

        <div className="rounded-lg border border-line bg-panel-sunken">
          <MetricsPanel state={s.state} deltas={s.deltas} layers={s.persona.hiddenInterests} goals={s.goals} />
        </div>
      </div>
    </div>
  );
}

function TranscriptBubble({ item, npcName }: { item: TranscriptItem; npcName: string }) {
  if (item.speaker === "system") {
    return <div className="rise-in text-center text-xs text-insight">✦ {item.text}</div>;
  }
  const isNpc = item.speaker === "npc";
  return (
    <div className={`flex flex-col gap-1 ${isNpc ? "items-start" : "items-end"}`}>
      <span className="label-case text-[10px] text-ink-faint">{isNpc ? npcName : "Вы"}</span>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-snug ${isNpc ? "rounded-tl-sm bg-panel-raised text-ink" : "rounded-tr-sm bg-accent/90 text-accent-ink"}`}
      >
        {item.text}
      </div>
      {item.rationale && <MicroFeedback rationale={item.rationale} positive={!!item.positive} />}
    </div>
  );
}
