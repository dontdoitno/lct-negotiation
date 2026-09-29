"use client";

import Image from "next/image";
import { AvatarId, avatarPosterSrc, avatarVideoSrc, avatarWebmSrc } from "@/lib/scenarios/avatars";

/**
 * Видео-аватар собеседника: немой цикл на пять секунд, который крутится весь
 * разговор.
 *
 * Звуковая дорожка из файлов вырезана, но `muted` всё равно обязателен: без
 * него браузер не даст запустить воспроизведение без клика пользователя.
 * `playsInline` нужен Safari на телефоне, иначе он развернёт видео на весь
 * экран поверх интерфейса звонка.
 *
 * Источников два. Сборки Chromium без проприетарных кодеков не декодируют
 * H.264: файл отдаётся, ошибки нет, а видео навсегда остаётся на первом кадре.
 * Свободный VP9 в webm играет и там, поэтому он стоит первым, а mp4 остаётся
 * для Safari.
 *
 * Постер это первый кадр в webp, он весит около десяти килобайт и появляется
 * мгновенно. Пока подтягивается само видео, собеседник уже смотрит на игрока,
 * а не зияет пустым прямоугольником.
 *
 * Тем, кто просил уменьшить количество движения в системе, цикл не
 * проигрывается: остаётся тот же постер. Правило `motion-reduce:hidden`
 * работает без JavaScript и без второго рендера.
 */
export function AvatarVideo({ id, name }: { id: AvatarId; name: string }) {
  return (
    <div className="absolute inset-0">
      {/* Статичный кадр лежит под видео и виден, пока оно грузится, а также
          вместо него при включённом «уменьшить движение». */}
      <Image
        src={avatarPosterSrc(id)}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        unoptimized
        className="object-cover"
      />
      <video
        key={id}
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        poster={avatarPosterSrc(id)}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-label={`Видео собеседника: ${name}`}
      >
        <source src={avatarWebmSrc(id)} type="video/webm" />
        <source src={avatarVideoSrc(id)} type="video/mp4" />
      </video>
    </div>
  );
}
