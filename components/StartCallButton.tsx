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
      className="rounded-md bg-accent-bg px-6 py-2.5 text-[15px] font-bold text-on-accent motion-safe:transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? "Соединяем…" : "Начать звонок"}
    </button>
  );
}
