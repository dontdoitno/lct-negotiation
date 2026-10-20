// Реэкспорт для клиентских компонентов: lib/access и lib/scenarios/directions
// не тянут Prisma, поэтому их безопасно импортировать в браузер.
export { DIRECTION_PRESETS, type DirectionId } from "@/lib/scenarios/directions";
export { canPlay as canPlayDirection } from "@/lib/access";
