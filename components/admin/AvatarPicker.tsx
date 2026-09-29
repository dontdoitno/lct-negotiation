"use client";

import { useState } from "react";
import Image from "next/image";
import { Text } from "@astryxdesign/core/Text";
import { AVATARS, AvatarId, avatarPosterSrc, avatarVideoSrc, avatarWebmSrc } from "@/lib/scenarios/avatars";

/**
 * Выбор видео-аватара для собеседника.
 *
 * Плитки по умолчанию статичные, это первый кадр в webp. Видео подгружается
 * только под курсором: иначе открытие конструктора тянуло бы все три ролика
 * разом ради картинки, на которую администратор может и не посмотреть.
 *
 * Аватары намеренно не привязаны к тону. Если бы у тревожного всегда было одно
 * и то же лицо, участник узнавал бы характер по внешности, не сказав ни слова.
 */
export function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarId | null;
  onChange: (next: AvatarId | null) => void;
}) {
  const [preview, setPreview] = useState<AvatarId | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <Text type="label" color="secondary" display="block">
        Видео-аватар
      </Text>

      <div className="flex flex-wrap gap-3">
        {AVATARS.map((a) => {
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : a.id)}
              onMouseEnter={() => setPreview(a.id)}
              onMouseLeave={() => setPreview((p) => (p === a.id ? null : p))}
              onFocus={() => setPreview(a.id)}
              onBlur={() => setPreview((p) => (p === a.id ? null : p))}
              className={`relative h-24 w-24 overflow-hidden rounded-xl border-2 motion-safe:transition-colors ${
                selected ? "border-accent" : "border-border hover:border-border-strong"
              }`}
              title={a.label}
            >
              {preview === a.id ? (
                <video
                  className="h-full w-full object-cover"
                  poster={avatarPosterSrc(a.id)}
                  autoPlay
                  loop
                  muted
                  playsInline
                >
                  <source src={avatarWebmSrc(a.id)} type="video/webm" />
                  <source src={avatarVideoSrc(a.id)} type="video/mp4" />
                </video>
              ) : (
                <Image
                  src={avatarPosterSrc(a.id)}
                  alt={a.label}
                  width={96}
                  height={96}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              )}
              {selected && (
                <span className="absolute bottom-1 right-1 rounded-full bg-inverted px-1.5 text-[11px] text-surface">
                  выбран
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Text type="supporting" color="secondary" display="block">
        {value
          ? "Аватар крутится немым циклом весь разговор. Нажмите ещё раз, чтобы снять выбор."
          : "Без аватара в окне звонка показывается круг с первой буквой имени."}
      </Text>
    </div>
  );
}
