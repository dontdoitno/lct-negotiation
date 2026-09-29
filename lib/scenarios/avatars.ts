/**
 * Видео-аватары собеседника. Короткий немой цикл на 5 секунд, который крутится
 * весь разговор.
 *
 * Идентификаторы намеренно безличные. Файл лежит по адресу вида
 * `/avatars/avatar-2.mp4`, и этот адрес видно в панели разработчика браузера.
 * Назови мы файлы по характеру, тип личности читался бы оттуда напрямую, а
 * определить его по поведению — это половина задачи участника.
 */
export const AVATARS = [
  { id: "avatar-1", label: "Аватар 1" },
  { id: "avatar-2", label: "Аватар 2" },
  { id: "avatar-3", label: "Аватар 3" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

const IDS = new Set<string>(AVATARS.map((a) => a.id));

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && IDS.has(value);
}

/**
 * Пути к файлам. Постер показывается мгновенно, пока грузится само видео.
 *
 * Роликов два на каждый аватар, и это не перестраховка. H.264 в mp4 понимают
 * Safari и обычный Chrome, но сборки Chromium без проприетарных кодеков его не
 * декодируют вовсе: файл отдаётся, а видео молча остаётся на первом кадре.
 * VP9 в webm свободен от лицензий и играет в таких сборках. Браузер берёт
 * первый источник, который умеет, поэтому webm стоит первым.
 */
export function avatarWebmSrc(id: AvatarId): string {
  return `/avatars/${id}.webm`;
}

export function avatarVideoSrc(id: AvatarId): string {
  return `/avatars/${id}.mp4`;
}

export function avatarPosterSrc(id: AvatarId): string {
  return `/avatars/${id}.webp`;
}
