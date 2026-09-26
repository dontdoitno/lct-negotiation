export function MicroFeedback({ rationale, positive }: { rationale: string; positive: boolean }) {
  return (
    <div
      className="rise-in flex items-start gap-2 rounded-md border px-3 py-2 text-[13px] leading-snug"
      style={{
        borderColor: positive ? "var(--color-trust-soft)" : "var(--color-resistance-soft)",
        background: positive ? "var(--color-trust-soft)" : "var(--color-resistance-soft)",
        color: "var(--color-ink)",
      }}
    >
      <span style={{ color: positive ? "var(--color-trust)" : "var(--color-resistance)" }}>{positive ? "✓" : "⚠"}</span>
      <span>{rationale}</span>
    </div>
  );
}
