import Link from "next/link";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { CaseTileData } from "@/lib/flow/types";
import { CASES } from "@/lib/flow/copy";
import { MetricRadar } from "@/components/ui/MetricRadar";

/**
 * One cell of the cases board. Four states; `locked` renders without a link so
 * it is skipped by keyboard navigation and clicking it does nothing (the spec
 * forbids a rejection modal).
 */
export function CaseTile({ data }: { data: CaseTileData }) {
  const locked = data.state === "locked";
  const recommended = data.state === "recommended";

  const body = (
    <Card>
      <div className={`flex h-full flex-col gap-3 ${locked ? "opacity-55" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Deliberately NOT the persona type — identifying who you are
                dealing with is part of the exercise. */}
            <Text type="label" color="secondary" display="block">
              {CASES.callLabel(data.callNumber)}
            </Text>
            <div className="mt-1">
              <Heading level={3} maxLines={1}>
                {data.scenarioTitle}
              </Heading>
            </div>
          </div>
          {data.bestMetrics && (
            <div className="shrink-0">
              <MetricRadar end={data.bestMetrics} size={64} />
            </div>
          )}
        </div>

        {recommended && <Badge label={CASES.recommendedBadge} />}

        <Text color="secondary" display="block">
          {locked ? "?????" : data.displayName}
        </Text>

        <div className="mt-auto">
          <Text type="supporting" display="block">
            {locked
              ? CASES.lockedNote
              : recommended
                ? CASES.recommendedNote
                : data.attempts > 0
                  ? CASES.attempts(data.attempts)
                  : CASES.noAttempts}
          </Text>
        </div>
      </div>
    </Card>
  );

  if (locked) {
    // No link and no aria-disabled: the state is already carried by the
    // visible "Откроется после первого разговора" line, and a non-interactive
    // item simply stays out of the tab order.
    return <li className="cursor-default">{body}</li>;
  }

  return (
    <li>
      <Link href={`/brief/${data.levelId}`} className="block h-full">
        {body}
      </Link>
    </li>
  );
}
