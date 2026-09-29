"use client";

import { NpcReplyCard } from "./NpcReplyCard";

export type StageStatus = "speaking" | "listening" | "thinking";

export function CallStage({
  name,
  position,
  status,
  reply,
  replyStreaming,
  replyMode,
}: {
  name: string;
  position: string;
  status: StageStatus;
  reply: string | null;
  replyStreaming: boolean;
  replyMode: "card" | "subtitles";
}) {
  const chips: { key: StageStatus; label: string }[] = [
    { key: "speaking", label: replyMode === "card" ? "отвечает" : "говорит" },
    { key: "listening", label: "слушает" },
    { key: "thinking", label: "думает" },
  ];

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border-[1.5px] bg-skeleton transition-colors"
      style={{ borderColor: status === "speaking" ? "var(--color-accent)" : "var(--color-border-emphasized)" }}
    >
      <div
        className={`flex h-[170px] w-[170px] items-center justify-center rounded-full border-[1.5px] border-disabled bg-muted text-5xl text-secondary ${replyMode === "card" ? "mb-[150px]" : ""}`}
      >
        {name.charAt(0).toUpperCase()}
      </div>

      <div className="absolute left-3.5 top-3.5 flex gap-1.5 text-sm">
        {chips.map((c) => (
          <span
            key={c.key}
            className={`rounded-full px-2.5 py-0.5 ${c.key === status ? "bg-accent-bg text-white" : "border border-disabled bg-surface text-secondary"}`}
          >
            {c.label}
          </span>
        ))}
      </div>

      <div className="absolute right-3.5 top-3.5 rounded-md border-[1.5px] border-border-strong bg-surface px-3 py-1.5 text-right">
        <h2 className="text-[17px] font-bold leading-tight text-primary">{name}</h2>
        <div className="text-[13px] text-secondary">{position}</div>
      </div>

      <NpcReplyCard name={name} text={reply} thinking={status === "thinking"} streaming={replyStreaming} mode={replyMode} />
    </div>
  );
}
