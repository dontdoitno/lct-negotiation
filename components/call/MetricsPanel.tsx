import { VitalBar } from "@/components/ui/VitalBar";
import { PipMeter } from "@/components/ui/PipMeter";
import { StrataPanel } from "./StrataPanel";
import { GoalsPanel, GoalStatus } from "./GoalsPanel";
import { bucketLabel, pipCount } from "@/lib/engine/labels";
import { HiddenInterestLayer, SessionState } from "@/lib/engine/types";

export function MetricsPanel({
  state,
  deltas,
  layers,
  goals,
}: {
  state: SessionState;
  deltas: Partial<Record<"R" | "T" | "A", number>>;
  layers: HiddenInterestLayer[];
  goals: GoalStatus[];
}) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3">
        <span className="label-case text-[11px] text-ink-muted">Состояние собеседника</span>
        <VitalBar label="Сопротивление" value={state.R} bucketLabel={bucketLabel("R", state.R)} delta={deltas.R} color="resistance" />
        <VitalBar label="Открытость" value={state.T} bucketLabel={bucketLabel("T", state.T)} delta={deltas.T} color="trust" />
        <VitalBar label="Адаптивность" value={state.A} bucketLabel={bucketLabel("A", state.A)} delta={deltas.A} color="adapt" />
      </div>

      <StrataPanel layers={layers} revealedLayers={state.revealedLayers} currentTrust={state.T} />

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3">
        <PipMeter label="Пространство решений" filled={pipCount("S", state.S)} total={3} valueLabel={bucketLabel("S", state.S)} color="insight" />
        <PipMeter label="Договорённости" filled={pipCount("C", state.C)} total={2} valueLabel={bucketLabel("C", state.C)} color="trust" />
      </div>

      <div className="rounded-lg border border-line bg-panel p-3">
        <GoalsPanel goals={goals} />
      </div>
    </div>
  );
}
