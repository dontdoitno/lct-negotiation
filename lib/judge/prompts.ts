import fs from "node:fs";
import path from "node:path";

const PROMPTS_ROOT = path.join(process.cwd(), "prompts");
const cache = new Map<string, string>();

export function loadPromptFile(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const content = fs.readFileSync(path.join(PROMPTS_ROOT, name), "utf-8");
  cache.set(name, content);
  return content;
}

/** Simple {{key}} substitution — no loops/conditionals needed at this scale. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}
