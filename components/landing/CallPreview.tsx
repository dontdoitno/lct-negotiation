import { CallStage } from "@/components/call/CallStage";
import { LiveMetrics } from "@/components/call/LiveMetrics";
import { SessionState } from "@/lib/engine/types";

/**
 * Decorative, non-interactive preview of the call screen for the landing hero.
 *
 * Uses the real CallStage and LiveMetrics rather than a lookalike, so the
 * landing can never drift away from what the product actually looks like.
 *
 * The catch: those components are built for a full call screen (a 170px
 * portrait plus room for the reply card underneath) and clip badly if you
 * simply squeeze them into a hero-sized box — which is exactly what happened
 * before. So they are rendered at their natural size on a fixed canvas, and
 * the whole canvas is scaled down to whatever width the hero column offers,
 * using container-query units. Nothing reflows, nothing clips, and the text
 * shrinks proportionally instead of overflowing.
 */

/** Natural canvas the call components are laid out on before scaling. */
const CANVAS_W = 820;
const CANVAS_H = 470;

const FROZEN_STATE: SessionState = {
  A: 60,
  T: 64,
  R: 38,
  I: 55,
  S: 40,
  C: 25,
  turn: 6,
  revealedLayers: [1, 2],
  constructiveStreak: 2,
  highResistanceStreak: 0,
  postponeCount: 0,
};

export function CallPreview() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none w-full min-w-xs select-none"
      style={{ containerType: "inline-size" }}
    >
      <div
        className="relative w-full overflow-hidden rounded-lg border-[1.5px] border-border-strong bg-surface"
        style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            // 100cqw is the container's own width, so the canvas always lands
            // exactly inside it whatever the viewport does.
            transform: `scale(calc(100cqw / ${CANVAS_W}px))`,
          }}
        >
          <div className="flex h-full gap-5 p-5">
            <div className="flex min-w-0 flex-1 flex-col">
              <CallStage
                name="Артём"
                // position="Senior-разработчик"
                // Тот же аватар, что достаётся Артёму в реальном сценарии.
                avatar="avatar-2"
                status="speaking"
                reply="Я хочу перенос дедлайна и повышение зарплаты!"
                replyStreaming={false}
                replyMode="card"
              />
            </div>
            <div className="w-[250px] shrink-0">
              <LiveMetrics state={FROZEN_STATE} deltas={{ R: -5, T: 8 }} deltaSeq={0} turn={6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
