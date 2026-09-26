import { HiddenInterestLayer } from "@/lib/engine/types";

export function StrataPanel({
  layers,
  revealedLayers,
  currentTrust,
}: {
  layers: HiddenInterestLayer[];
  revealedLayers: number[];
  currentTrust: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="label-case text-[11px] text-ink-muted">Скрытые интересы · керн</span>
        <span className="font-mono text-xs text-ink-muted">
          {revealedLayers.length}/{layers.length}
        </span>
      </div>
      <div className="flex flex-col gap-[3px] rounded-md border border-line bg-panel-sunken p-[3px]">
        {layers.map((layer) => {
          const isRevealed = revealedLayers.includes(layer.layer);
          const isNext = !isRevealed && currentTrust < layer.trustThreshold && layers.filter((l) => revealedLayers.includes(l.layer)).length === layer.layer - 1;
          return (
            <div
              key={layer.layer}
              className={`relative overflow-hidden rounded-[3px] border px-3 py-2.5 transition-colors duration-500 ${
                isRevealed ? "border-insight/40" : "border-transparent bg-noise"
              }`}
              style={{
                background: isRevealed ? "var(--color-insight-soft)" : "var(--color-panel)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="label-case text-[10px]" style={{ color: isRevealed ? "var(--color-insight)" : "var(--color-ink-faint)" }}>
                  Слой {layer.layer}
                </span>
                {isRevealed ? (
                  <span className="label-case text-[10px] text-insight">раскрыт</span>
                ) : (
                  <span className="font-mono text-[10px] text-ink-faint">T ≥ {layer.trustThreshold}</span>
                )}
              </div>
              <p
                className={`mt-1 text-[13px] leading-snug ${isRevealed ? "text-ink" : "select-none text-ink-faint blur-[3px]"}`}
              >
                {isRevealed ? layer.text : "██████████████████ ████ ██████"}
              </p>
              {isNext && <div className="absolute inset-x-0 bottom-0 h-[2px] animate-pulse bg-insight/60" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
