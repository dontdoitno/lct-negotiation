"use client";

import { useState } from "react";
import { Text, Heading } from "@astryxdesign/core/Text";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { TYPE_GUESS } from "@/lib/flow/copy";
import { PersonaType } from "@/lib/flow/matching";
import { setTypeGuess, useFlowState } from "@/lib/flow/store";

/**
 * The one part of the debrief the player fills in: naming the type they were
 * talking to. The case board deliberately hides it, so this is where it gets
 * checked and revealed — before any of the numbers, because seeing the metrics
 * first would give the answer away.
 */
export function TypeGuessBlock({
  sessionId,
  trueType,
  trueTypeLabel,
}: {
  sessionId: string;
  trueType: PersonaType;
  trueTypeLabel: string;
}) {
  const flow = useFlowState();
  const [picked, setPicked] = useState<PersonaType | undefined>();

  const answered = flow.typeGuesses[sessionId];

  if (!answered) {
    return (
      <Card>
        <Heading level={2}>{TYPE_GUESS.question}</Heading>
        <div className="mt-1.5">
          <Text as="p" display="block" color="secondary">
            {TYPE_GUESS.hint}
          </Text>
        </div>
        <div className="mt-5 flex flex-col gap-3" role="group" aria-label={TYPE_GUESS.question}>
          {TYPE_GUESS.options.map((o) => (
            <SelectableCard
              key={o.value}
              label={o.label}
              isSelected={picked === o.value}
              onChange={() => setPicked(o.value)}
              padding={4}
            >
              <Text type="large" color="inherit">
                {o.label}
              </Text>
            </SelectableCard>
          ))}
        </div>
        <div className="mt-5">
          <Button
            variant="primary"
            size="lg"
            label={TYPE_GUESS.submit}
            isDisabled={!picked}
            onClick={() => picked && setTypeGuess(sessionId, picked)}
          />
        </div>
      </Card>
    );
  }

  const right = answered === trueType;
  const answeredLabel = TYPE_GUESS.options.find((o) => o.value === answered)?.label ?? answered;

  return (
    <Card>
      {/* The verdict is carried by the words, not only by the colour. */}
      <span className={`block ${right ? "text-metric-trust" : "text-metric-resistance"}`}>
        <Heading level={2} color="inherit">
          {right ? TYPE_GUESS.correct : TYPE_GUESS.wrong}
        </Heading>
      </span>

      <dl className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:gap-8">
        <div>
          <dt>
            <Text type="label" color="secondary" display="block">
              {TYPE_GUESS.yourAnswer}
            </Text>
          </dt>
          <dd className="mt-1">
            <Text type="large" display="block">
              {answeredLabel}
            </Text>
          </dd>
        </div>
        <div>
          <dt>
            <Text type="label" color="secondary" display="block">
              {TYPE_GUESS.trueAnswer}
            </Text>
          </dt>
          {/* Bold only when it differs from the answer, so the correction reads
              as the correction. */}
          <dd className="mt-1">
            <Text type="large" weight={right ? "normal" : "bold"} display="block">
              {trueTypeLabel}
            </Text>
          </dd>
        </div>
      </dl>

      <div className="mt-5 max-w-reading">
        <Text type="label" color="secondary" display="block">
          {TYPE_GUESS.markersTitle}
        </Text>
        <div className="mt-1.5">
          <Text as="p" display="block">
            {TYPE_GUESS.markers[trueType]}
          </Text>
        </div>
        <div className="mt-3">
          <Text as="p" display="block" type="supporting">
            {TYPE_GUESS.whyItMatters}
          </Text>
        </div>
      </div>
    </Card>
  );
}
