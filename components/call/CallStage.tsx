"use client";

import { NpcReplyCard } from "./NpcReplyCard";
import { AvatarVideo } from "./AvatarVideo";
import { isAvatarId } from "@/lib/scenarios/avatars";

export type StageStatus = "speaking" | "listening" | "thinking";

export function CallStage({
  name,
  // position,
  avatar,
  status,
  reply,
  replyStreaming,
  replyMode,
}: {
  name: string;
  // position: string;
  avatar?: string;
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
      {isAvatarId(avatar) ? (
        <AvatarVideo id={avatar} name={name} />
      ) : (
        <div
          className={`flex h-[120px] w-[120px] items-center justify-center rounded-full border-[1.5px] border-disabled bg-muted text-4xl text-secondary sm:h-[170px] sm:w-[170px] sm:text-5xl ${replyMode === "card" ? "mb-[110px] sm:mb-[150px]" : ""}`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="absolute left-2.5 top-2.5 flex gap-1 text-[12px] sm:left-3.5 sm:top-3.5 sm:gap-1.5 sm:text-sm">
        {chips.map((c) => (
          <span
            key={c.key}
            className={`rounded-full px-2 py-0.5 sm:px-2.5 ${c.key === status ? "bg-accent-bg text-white" : "border border-disabled bg-surface text-secondary"}`}
          >
            {c.label}
          </span>
        ))}
      </div>

      <div className="absolute right-2.5 top-2.5 rounded-md border-[1.5px] border-border-strong bg-surface px-2.5 py-1 text-right sm:right-3.5 sm:top-3.5 sm:px-3 sm:py-1.5">
        <h2 className="text-[14px] font-bold leading-tight text-primary sm:text-[17px]">{name}</h2>
        {/* <div className="text-[13px] text-secondary">{position}</div> */}
      </div>

      <NpcReplyCard name={name} text={reply} thinking={status === "thinking"} streaming={replyStreaming} mode={replyMode} />
    </div>
  );
}
