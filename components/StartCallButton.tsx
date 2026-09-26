"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartCallButton({ levelId }: { levelId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelId }),
      });
      const data = await res.json();
      router.push(`/call/${data.sessionId}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={start}
      disabled={loading}
      className="label-case rounded-md bg-accent px-6 py-3 text-xs font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? "Соединяем…" : "Подключиться к звонку"}
    </button>
  );
}
