"use client";

/**
 * The AI employee's reply inside the call window.
 * mode="card": large text card (text-only replies, current).
 * mode="subtitles": one-line captions for when voice replies ship.
 */
export function NpcReplyCard({
  name,
  text,
  thinking,
  streaming,
  mode,
}: {
  name: string;
  text: string | null;
  thinking: boolean;
  streaming: boolean;
  mode: "card" | "subtitles";
}) {
  const firstName = name.split(" ")[0];

  if (thinking && !text) {
    return (
      <div className="rise-in absolute inset-x-8 bottom-6 flex flex-col gap-2 rounded-[10px] border-2 border-dashed border-disabled bg-surface px-5 py-4">
        <div className="label-case text-[12px] text-secondary">{firstName} печатает · · ·</div>
        <div className="h-2.5 w-4/5 rounded bg-skeleton" />
        <div className="h-2.5 w-[55%] rounded bg-skeleton" />
      </div>
    );
  }

  if (!text) return null;

  if (mode === "subtitles") {
    return (
      <div className="absolute inset-x-10 bottom-5 rounded-md border border-disabled bg-white/90 px-3 py-1.5 text-center text-[15px] text-primary">
        «{text}»
      </div>
    );
  }

  return (
    <div className="absolute inset-x-8 bottom-6 flex max-h-[55%] flex-col gap-2 overflow-y-auto rounded-[10px] border-2 border-primary bg-surface px-5 py-4">
      <div className="label-case text-[12px] text-secondary">{firstName} · ответ текстом</div>
      <div className="text-[22px] leading-[1.4] text-primary">
        {text}
        {streaming && <span className="text-accent">▍</span>}
      </div>
      <div className="text-[13px] text-disabled">Предыдущие реплики — в транскрипте слева</div>
    </div>
  );
}
