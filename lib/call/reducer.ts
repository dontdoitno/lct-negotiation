import { Persona, Scenario, SessionState } from "@/lib/engine/types";
import { GoalStatus } from "@/components/call/GoalsPanel";

export interface TranscriptItem {
  id: string;
  speaker: "npc" | "player" | "system";
  text: string;
  rationale?: string;
  positive?: boolean;
}

export interface CallState {
  ready: boolean;
  scenario: Scenario | null;
  persona: Persona | null;
  state: SessionState | null;
  deltas: Partial<Record<"R" | "T" | "A", number>>;
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
}

export const initialCallState: CallState = {
  ready: false,
  scenario: null,
  persona: null,
  state: null,
  deltas: {},
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
};

export type CallAction =
  | { type: "INIT"; payload: { scenario: Scenario; persona: Persona; state: SessionState; openingLine: string | null; transcript: TranscriptItem[]; status: CallState["status"] } }
  | { type: "SEND_START"; payload: { text: string; id: string } }
  | { type: "ANALYSIS"; payload: { rationale: string; deltas: Partial<Record<"R" | "T" | "A", number>> } }
  | { type: "STATE"; payload: { raw: SessionState; goals: GoalStatus[]; turn: number; turnsLeft: number } }
  | { type: "REVEAL"; payload: { text: string } }
  | { type: "NPC_CHUNK"; payload: { text: string } }
  | { type: "NPC_DONE"; payload: { text: string; status: CallState["status"]; points: number } }
  | { type: "POP_SCORE"; payload: { id: string } }
  | { type: "ERROR"; payload: { message: string } };

function uid() {
  return Math.random().toString(36).slice(2);
}

export function callReducer(s: CallState, action: CallAction): CallState {
  switch (action.type) {
    case "INIT":
      return {
        ...s,
        ready: true,
        scenario: action.payload.scenario,
        persona: action.payload.persona,
        state: action.payload.state,
        status: action.payload.status,
        turn: action.payload.state.turn,
        turnsLeft: action.payload.scenario.turnLimit - action.payload.state.turn,
        goals: action.payload.scenario.playerGoals.map((g) => ({
          id: g.id,
          text: g.text,
          progress: 0,
          done: false,
        })),
        transcript: action.payload.transcript,
      };

    case "SEND_START": {
      const item: TranscriptItem = { id: action.payload.id, speaker: "player", text: action.payload.text };
      return { ...s, sending: true, portraitStatus: "thinking", transcript: [...s.transcript, item] };
    }

    case "ANALYSIS": {
      const rTotal = action.payload.deltas.R ?? 0;
      const positive = rTotal <= 0;
      const withRationale = s.transcript.map((t, i) =>
        i === s.transcript.length - 1 ? { ...t, rationale: action.payload.rationale, positive } : t,
      );
      return { ...s, deltas: action.payload.deltas, transcript: withRationale };
    }

    case "STATE":
      return { ...s, state: action.payload.raw, goals: action.payload.goals, turn: action.payload.turn, turnsLeft: action.payload.turnsLeft };

    case "REVEAL":
      return { ...s, transcript: [...s.transcript, { id: uid(), speaker: "system", text: `Раскрыт скрытый интерес: «${action.payload.text}»` }] };

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
