"use client";

type Expression = "tense" | "neutral" | "calm";
type Status = "idle" | "speaking" | "thinking";

const RING_BY_EXPRESSION: Record<Expression, string> = {
  tense: "var(--color-resistance)",
  neutral: "var(--color-ink-faint)",
  calm: "var(--color-trust)",
};

const GRADIENT_BY_EXPRESSION: Record<Expression, string> = {
  tense: "radial-gradient(circle at 30% 20%, rgba(232,101,79,0.16), transparent 60%)",
  neutral: "radial-gradient(circle at 30% 20%, rgba(139,144,156,0.10), transparent 60%)",
  calm: "radial-gradient(circle at 30% 20%, rgba(73,193,154,0.16), transparent 60%)",
};

export function PortraitTile({
  name,
  position,
  expression,
  status,
}: {
  name: string;
  position: string;
  expression: Expression;
  status: Status;
}) {
  const ring = RING_BY_EXPRESSION[expression];
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border transition-colors duration-700"
        style={{
          borderColor: status === "speaking" ? ring : "var(--color-line)",
          background: `var(--color-panel), ${GRADIENT_BY_EXPRESSION[expression]}`,
          boxShadow: status === "speaking" ? `0 0 0 1px ${ring}, 0 0 32px -8px ${ring}` : "none",
        }}
      >
        <div style={{ background: GRADIENT_BY_EXPRESSION[expression] }} className="absolute inset-0" />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full font-display text-4xl font-semibold"
          style={{ border: `2px solid ${ring}`, color: ring }}
        >
          {initial}
        </div>

        {status === "speaking" && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-[3px]">
            {[6, 14, 20, 12, 8].map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full"
                style={{
                  height: h,
                  background: ring,
                  animation: `wave 0.9s ease-in-out ${i * 0.08}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {status === "thinking" && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-ink-muted"
                style={{ animation: `pulse-rec 1.2s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </div>
        )}

        <span className="absolute left-3 top-3 label-case text-[10px] text-ink-muted">
          {status === "speaking" ? "говорит…" : status === "thinking" ? "печатает…" : ""}
        </span>
      </div>
      <div className="flex items-baseline justify-between px-0.5">
        <span className="font-display text-sm font-semibold text-ink">{name}</span>
        <span className="font-mono text-xs text-ink-muted">{position}</span>
      </div>

      <style jsx>{`
        @keyframes wave {
          0%,
          100% {
            transform: scaleY(0.4);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
