"use client";

import { useId, useState } from "react";

/**
 * The AI employee's reply inside the call window.
 * mode="card": large text card (text-only replies, current).
 * mode="subtitles": one-line captions for when voice replies ship.
 *
 * Карточку можно свернуть: она занимает нижнюю половину окна и закрывает лицо
 * собеседника, а мимика это часть того, что игрок должен читать. В свёрнутом
 * виде остаётся одна строка с началом реплики, поэтому новый ответ не проходит
 * незамеченным. Выбор держится и на следующих ходах: если человек свернул
 * карточку, чтобы смотреть на собеседника, разворачивать её обратно за него
 * означало бы спорить с его решением. Целиком реплики всегда лежат в
 * транскрипте слева.
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
  const [collapsed, setCollapsed] = useState(false);
  const bodyId = useId();

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

  if (collapsed) {
    return (
      <div className="absolute inset-x-8 bottom-6 flex items-center gap-3 rounded-[10px] border-2 border-primary bg-surface px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="label-case text-[11px] text-secondary">{firstName} · ответ текстом</div>
          {/* Одна строка с началом реплики: свёрнутая карточка не должна
              превращаться в глухую заглушку, иначе новый ответ теряется. */}
          <p className="truncate text-[15px] text-primary">
            {text}
            {streaming && <span className="text-accent">▍</span>}
          </p>
        </div>
        <ToggleButton expanded={false} controls={bodyId} onClick={() => setCollapsed(false)} />
      </div>
    );
  }

  return (
    <div className="absolute inset-x-8 bottom-6 flex max-h-[55%] flex-col gap-2 overflow-y-auto rounded-[10px] border-2 border-primary bg-surface px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="label-case text-[12px] text-secondary">{firstName} · ответ текстом</div>
        <ToggleButton expanded controls={bodyId} onClick={() => setCollapsed(true)} />
      </div>
      <div id={bodyId} className="text-[22px] leading-[1.4] text-primary">
        {text}
        {streaming && <span className="text-accent">▍</span>}
      </div>
      <div className="text-[13px] text-disabled">Предыдущие реплики — в транскрипте слева</div>
    </div>
  );
}

function ToggleButton({
  expanded,
  controls,
  onClick,
}: {
  expanded: boolean;
  controls: string;
  onClick: () => void;
}) {
  const label = expanded ? "Свернуть ответ" : "Развернуть ответ";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={label}
      title={label}
      className="-mr-1 shrink-0 rounded-md p-1 text-secondary motion-safe:transition-colors hover:bg-muted hover:text-primary"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={expanded ? "" : "rotate-180"}
      >
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
