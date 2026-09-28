import { PortraitTile } from "@/components/call/PortraitTile";
import { VitalBar } from "@/components/ui/VitalBar";
import { PipMeter } from "@/components/ui/PipMeter";
import { TurnCounter } from "@/components/call/TurnCounter";
import { MicroFeedback } from "@/components/call/MicroFeedback";

function Callout({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-ink-muted">{children}</p>;
}

export function CallWalkthrough() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1.1fr] md:items-center">
        <PortraitTile name="Артём" position="Senior-разработчик" expression="tense" status="idle" />
        <span className="hidden text-ink-faint md:block">←</span>
        <Callout>
          Это ваш собеседник. Портрет меняет выражение по уровню сопротивления — само по себе это уже подсказка, даже
          без чисел.
        </Callout>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1.1fr] md:items-start">
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-3">
          <div className="flex flex-col items-end gap-1">
            <span className="label-case text-[10px] text-ink-faint">Артём</span>
            <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-gold/90 px-3 py-2 text-sm text-gold-ink">
              Все работают в таком режиме, не только ты.
            </div>
            <MicroFeedback rationale="Вы проигнорировали то, что он только что сказал о своём состоянии." positive={false} />
          </div>
        </div>
        <span className="hidden text-ink-faint md:block">←</span>
        <Callout>
          После каждой вашей реплики появляется короткая подсказка: что именно вы сделали и почему это сработало или
          нет. Это главный обучающий элемент — связь видна сразу, а не через десять минут в отчёте.
        </Callout>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1.1fr] md:items-center">
        <div className="flex items-center gap-2 rounded-md border border-line bg-panel-sunken px-3 py-2.5">
          <span className="flex-1 text-sm text-ink-faint">Печатайте сообщение…</span>
          <span className="label-case shrink-0 rounded-md bg-gold px-3 py-1.5 text-[10px] font-semibold text-gold-ink">
            Отправить
          </span>
        </div>
        <span className="hidden text-ink-faint md:block">←</span>
        <Callout>Сюда вы печатаете свою реплику. Enter отправляет ход — то же самое поле работает и для голоса.</Callout>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1.1fr] md:items-start">
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel-sunken p-3">
          <VitalBar label="Сопротивление" value={70} bucketLabel="высокое" delta={12} color="resistance" />
          <VitalBar label="Открытость" value={30} bucketLabel="низкая" delta={-8} color="trust" />
          <PipMeter label="Договорённости" filled={0} total={2} valueLabel="нет" color="trust" />
        </div>
        <span className="hidden text-ink-faint md:block">←</span>
        <Callout>
          Справа — состояние собеседника. Верхние шкалы (сопротивление, открытость, адаптивность) прыгают вверх-вниз
          каждый ход. Нижние точки (интересы, решения, договорённости) — это прогресс разговора: он только растёт, раз
          вскрытое нельзя «забыть».
        </Callout>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1.1fr] md:items-center">
        <TurnCounter turn={4} limit={14} />
        <span className="hidden text-ink-faint md:block">←</span>
        <Callout>
          Ходов ограниченное число. Цель — не измотать собеседника, а договориться до того, как лимит закончится.
        </Callout>
      </div>
    </div>
  );
}
