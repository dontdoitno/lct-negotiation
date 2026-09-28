"use client";

import { useEffect, useRef } from "react";
import { TranscriptItem } from "@/lib/call/reducer";

export function CallTranscript({ items, npcName, activeId }: { items: TranscriptItem[]; npcName: string; activeId: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] pb-[18px]">
      {items.map((item) => {
        if (item.speaker === "system") {
          return (
            <div key={item.id} className="rounded border border-dashed border-border px-2 py-1 text-[13px] text-secondary">
              ✦ {item.text}
            </div>
          );
        }
        const isNpc = item.speaker === "npc";
        return (
          <div key={item.id} className="flex flex-col gap-0.5">
            <div className="text-[13px] text-secondary">
              {isNpc ? npcName : "Вы"}
              {!isNpc && item.rationale && <span className="text-accent"> · есть оценка</span>}
            </div>
            <div className={`text-[15px] leading-snug ${item.id === activeId ? "text-disabled" : "text-primary"}`}>{item.text}</div>
          </div>
        );
      })}
    </div>
  );
}
