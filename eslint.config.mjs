import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Документация: собранный сайт, окружение сборки и вендорная библиотека
    // mermaid. Это не наш код, линтеру там делать нечего.
    "site/**",
    ".venv-docs/**",
    "docs-site/js/**",
  ]),
]);

export default eslintConfig;
