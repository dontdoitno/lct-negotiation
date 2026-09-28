"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { ENDED } from "@/lib/flow/copy";
import { EndReason } from "@/lib/flow/types";

const AUTO_REDIRECT_MS = 4000;

export function EndedView({
  sessionId,
  endReason,
  personaType,
}: {
  sessionId: string;
  endReason: EndReason;
  personaType: "rational" | "anxious" | "aggressive";
}) {
  const router = useRouter();
  const href = `/session/${sessionId}/debrief`;

  useEffect(() => {
    const t = setTimeout(() => router.push(href), AUTO_REDIRECT_MS);
    return () => clearTimeout(t);
  }, [router, href]);

  // Turn-limit wording is about the clock, so it wins over the persona line.
  const title = endReason === "turn_limit" ? ENDED.turnLimit : ENDED.byPersona[personaType];

  return (
    <main className="mx-auto flex min-h-screen max-w-reading flex-col items-start justify-center gap-5 px-6">
      <Heading level={1} type="display-3">
        {title}
      </Heading>
      <Text as="p" display="block" type="large" color="secondary">
        {ENDED.subtitle}
      </Text>
      <Button variant="primary" size="lg" label={ENDED.cta} onClick={() => router.push(href)} />
      <div aria-live="polite">
        <Text type="supporting">Откроем разбор автоматически через несколько секунд.</Text>
      </div>
    </main>
  );
}
