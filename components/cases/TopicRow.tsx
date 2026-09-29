"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Text, Heading } from "@astryxdesign/core/Text";
import { CaseTileData } from "@/lib/flow/types";
import { CASES } from "@/lib/flow/copy";
import { CaseTile } from "./CaseTile";

/** Сколько карточек помещается в строку. Остальные уезжают вбок. */
const VISIBLE = 3;

/** Промежуток между карточками в пикселях, он же gap-4 в разметке. */
const GAP = 16;

/**
 * Одна тема с лентой разговоров. Показываем не больше трёх карточек, остальные
 * листаются вбок колесом, свайпом или стрелками.
 *
 * Лента не прячет карточки за кнопкой «показать ещё»: горизонтальная прокрутка
 * сохраняет ощущение, что весь набор на месте, просто не влезает в экран.
 */
export function TopicRow({ topic, items }: { topic: string; items: CaseTileData[] }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const scrollable = items.length > VISIBLE;

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    if (!scrollable) return;
    // Первый замер через кадр: до раскладки ширины ещё нулевые.
    const frame = requestAnimationFrame(sync);
    const el = scroller.current;
    el?.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      el?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [scrollable, sync]);

  function page(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    // Шаг меряем по настоящей карточке, а не делением ширины на три: иначе он
    // не учитывает промежутки, и лента останавливается на половине карточки.
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + GAP : el.clientWidth / VISIBLE;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <Heading level={2}>{topic}</Heading>
        <div className="flex items-center gap-3">
          <Text type="supporting" color="disabled">
            {CASES.callCount(items.length)}
          </Text>
          {scrollable && (
            <div className="flex gap-1">
              <ArrowButton direction="left" disabled={atStart} onClick={() => page(-1)} />
              <ArrowButton direction="right" disabled={atEnd} onClick={() => page(1)} />
            </div>
          )}
        </div>
      </div>

      <ul
        ref={scroller}
        className={`grid auto-cols-[calc((100%-2rem)/3)] grid-flow-col gap-4 ${
          scrollable
            ? "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : ""
        }`}
      >
        {items.map((tile) => (
          <CaseTile key={tile.levelId} data={tile} />
        ))}
      </ul>
    </section>
  );
}

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? CASES.scrollLeft : CASES.scrollRight}
      className="rounded-full border border-border bg-surface p-1.5 text-secondary motion-safe:transition-colors hover:border-border-strong hover:text-primary disabled:cursor-default disabled:border-border disabled:text-disabled disabled:hover:text-disabled"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
