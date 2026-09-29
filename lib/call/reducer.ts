import { MetricCode, Persona, Scenario, SessionState } from "@/lib/engine/types";
import { GoalStatus } from "@/components/call/GoalsPanel";
import { turnIsPositive } from "@/lib/call/metricDirection";

export type Deltas = Partial<Record<MetricCode, number>>;

export interface TranscriptItem {
  id: string;
  speaker: "npc" | "player" | "system";
  text: string;
  rationale?: string;
  positive?: boolean;
  deltas?: Deltas;
}

export interface CallState {
  ready: boolean;
  scenario: Scenario | null;
  persona: Persona | null;
  state: SessionState | null;
  deltas: Deltas;
  /** Increments on every ANALYSIS event — drives the 3s metric highlight. */
  deltaSeq: number;
  goals: GoalStatus[];
  turn: number;
  turnsLeft: number;
  transcript: TranscriptItem[];
  portraitStatus: "idle" | "speaking" | "thinking";
  status: "active" | "success" | "failed" | "timeout";
  scorePopups: { id: string; points: number }[];
  streamingNpcId: string | null;
  sending: boolean;
  error: string | null;
  /**
   * Отладка тест-прогона: заполняется всегда, показывается только в админском
   * режиме. Дешевле, чем отдельный контур состояния ради одной панели.
   */
  debug: {
    actions: string[];
    rationale: string;
    deltas: Deltas;
    revealedLayer: number | null;
    rawReply: string;
  } | null;
}

export const initialCallState: CallState = {
  ready: false,
  scenario: null,
  persona: null,
  state: null,
  deltas: {},
  deltaSeq: 0,
  goals: [],
  turn: 0,
  turnsLeft: 0,
  transcript: [],
  portraitStatus: "idle",
  status: "active",
  scorePopups: [],
  streamingNpcId: null,
  sending: false,
  error: null,
  debug: null,
};

export type CallAction =
  | { type: "INIT"; payload: { scenario: Scenario; persona: Persona; state: SessionState; openingLine: string | null; transcript: TranscriptItem[]; status: CallState["status"] } }
  | { type: "SEND_START"; payload: { text: string; id: string } }
  | { type: "ANALYSIS"; payload: { rationale: string; deltas: Deltas; actions?: string[] } }
  | { type: "STATE"; payload: { raw: SessionState; goals: GoalStatus[]; turn: number; turnsLeft: number } }
  | { type: "REVEAL"; payload: { text: string; layer?: number } }
  | { type: "NPC_CHUNK"; payload: { text: string } }
  | { type: "NPC_DONE"; payload: { text: string; status: CallState["status"]; points: number } }
  | { type: "POP_SCORE"; payload: { id: string } }
  | { type: "ERROR"; payload: { message: string } };

function uid() {
  return Math.random().toString(36).slice(2);
}

export function callReducer(s: CallState, action: CallAction): CallState {
  switch (action.type) {
    case "INIT": {
      const lastScored = [...action.payload.transcript].reverse().find((t) => t.speaker === "player" && t.deltas);
      return {
        ...s,
        ready: true,
        scenario: action.payload.scenario,
        persona: action.payload.persona,
        state: action.payload.state,
        status: action.payload.status,
        deltas: lastScored?.deltas ?? {},
        turn: action.payload.state.turn,
        turnsLeft: action.payload.scenario.turnLimit - action.payload.state.turn,
        goals: action.payload.scenario.playerGoals.map((g) => ({ id: g.id, text: g.text, progress: 0, done: false })),
        transcript: action.payload.transcript,
      };
    }

    case "SEND_START": {
      const item: TranscriptItem = { id: action.payload.id, speaker: "player", text: action.payload.text };
      return { ...s, sending: true, error: null, portraitStatus: "thinking", transcript: [...s.transcript, item] };
    }

    case "ANALYSIS": {
      const { rationale, deltas } = action.payload;
      const positive = turnIsPositive(deltas);
      let idx = -1;
      for (let i = s.transcript.length - 1; i >= 0; i--) {
        if (s.transcript[i].speaker === "player") {
          idx = i;
          break;
        }
      }
      const transcript = s.transcript.map((t, i) => (i === idx ? { ...t, rationale, positive, deltas } : t));
      return {
        ...s,
        deltas,
        deltaSeq: s.deltaSeq + 1,
        transcript,
        debug: {
          actions: action.payload.actions ?? [],
          rationale,
          deltas,
          revealedLayer: null,
          rawReply: "",
        },
      };
    }

    case "STATE":
      return { ...s, state: action.payload.raw, goals: action.payload.goals, turn: action.payload.turn, turnsLeft: action.payload.turnsLeft };

    case "REVEAL":
      return {
        ...s,
        transcript: [...s.transcript, { id: uid(), speaker: "system", text: `Раскрыт скрытый интерес: «${action.payload.text}»` }],
        debug: s.debug ? { ...s.debug, revealedLayer: action.payload.layer ?? null } : s.debug,
      };

    case "NPC_CHUNK": {
      const streamId = s.streamingNpcId ?? uid();
      const exists = s.transcript.some((t) => t.id === streamId);
      const transcript = exists
        ? s.transcript.map((t) => (t.id === streamId ? { ...t, text: t.text + action.payload.text } : t))
        : [...s.transcript, { id: streamId, speaker: "npc" as const, text: action.payload.text }];
      return { ...s, portraitStatus: "speaking", streamingNpcId: streamId, transcript };
    }

    case "NPC_DONE": {
      const streamId = s.streamingNpcId ?? uid();
      const exists = s.transcript.some((t) => t.id === streamId);
      const transcript = exists
        ? s.transcript.map((t) => (t.id === streamId ? { ...t, text: action.payload.text } : t))
        : [...s.transcript, { id: streamId, speaker: "npc" as const, text: action.payload.text }];
      return {
        ...s,
        transcript,
        portraitStatus: "idle",
        streamingNpcId: null,
        sending: false,
        status: action.payload.status,
        scorePopups: [...s.scorePopups, { id: uid(), points: action.payload.points }],
        debug: s.debug ? { ...s.debug, rawReply: action.payload.text } : s.debug,
      };
    }

    case "POP_SCORE":
      return { ...s, scorePopups: s.scorePopups.filter((p) => p.id !== action.payload.id) };

    case "ERROR":
      return { ...s, sending: false, portraitStatus: "idle", error: action.payload.message };

    default:
      return s;
  }
}
