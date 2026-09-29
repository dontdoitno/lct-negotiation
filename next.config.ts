import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сценарии, персонажи и промпты читаются с диска в рантайме по пути,
  // собранному через process.cwd(). Статический анализ такой путь не видит,
  // поэтому при сборке под Vercel эти папки в бандл функции не попадают,
  // и каждый уровень отвечает 500. Указываем их трассировке явно.
  outputFileTracingIncludes: {
    "/*": ["./content/**/*", "./prompts/**/*"],
    "/**": ["./content/**/*", "./prompts/**/*"],
  },
};

export default nextConfig;
