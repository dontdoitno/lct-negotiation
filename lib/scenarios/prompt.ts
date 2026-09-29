import fs from "node:fs";
import path from "node:path";
import { renderPrompt } from "./promptRender";
import { ScenarioDraft } from "./types";

/**
 * Серверная сборка системного промта.
 *
 * Шаблон лежит в prompts/scenario-system-prompt.md, чтобы его можно было
 * править без касания кода, и читается один раз при загрузке модуля. Сама
 * подстановка живёт в promptRender и не знает про файловую систему: тот же код
 * работает в предпросмотре конструктора на клиенте.
 */

const TEMPLATE_PATH = path.join(process.cwd(), "prompts", "scenario-system-prompt.md");

let templateCache: string | null = null;

export function readPromptTemplate(): string {
  if (templateCache === null) {
    templateCache = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  }
  return templateCache;
}

export function buildSystemPrompt(scenario: ScenarioDraft): string {
  return renderPrompt(readPromptTemplate(), scenario);
}

export { promptSlotValues, PROMPT_SLOTS } from "./promptRender";
