"use client";

export type InputMode = "voice" | "text";

/**
 * Voice is the primary input (big mic button); "Aa · Текстом" swaps it for a text field.
 * Falls back to text-only when the browser has no speech recognition.
 */
export function InputBar({
  mode,
  onModeChange,
  voiceSupported,
  listening,
  interim,
  onMicStart,
  onMicStop,
  value,
  onChange,
  onSubmit,
  disabled,
  hintAvailable,
  hintOpen,
  onToggleHint,
}: {
  mode: InputMode;
  onModeChange: (m: InputMode) => void;
  voiceSupported: boolean;
  listening: boolean;
  interim: string;
  onMicStart: () => void;
  onMicStop: () => void;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  hintAvailable: boolean;
  hintOpen: boolean;
  onToggleHint: () => void;
}) {
  const pill = "rounded-full border-[1.5px] border-border-strong px-4 py-2 text-[15px] text-primary disabled:opacity-40";
  const hintBtn = (
    <button onClick={onToggleHint} disabled={!hintAvailable} className={`${pill} ${hintOpen ? "border-dashed !border-accent !text-accent" : ""}`}>
      ? Подсказка
    </button>
  );

  if (mode === "text" || !voiceSupported) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-end gap-2">
          {voiceSupported && (
            <button
              onClick={() => onModeChange("voice")}
              title="Говорить голосом"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-strong text-[12px] text-primary"
            >
              мик
            </button>
          )}
          <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Напишите реплику…"
            rows={2}
            className="max-h-28 min-h-[48px] flex-1 resize-none rounded-md border-2 border-accent bg-surface px-3 py-2.5 text-[15px] text-primary outline-none placeholder:text-disabled"
          />
          <button
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="shrink-0 rounded-md bg-accent-bg px-4 py-3 text-[15px] text-white disabled:opacity-40"
          >
            {disabled ? "…" : "Отправить"}
          </button>
          {hintBtn}
        </div>
        <div className="text-[13px] text-disabled">Enter — отправить · Shift+Enter — новая строка</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {listening && (
        <div className="max-w-[640px] rounded-md border-[1.5px] border-border-strong bg-surface px-3.5 py-1.5 text-center text-[16px] text-primary">
          Вы: «{interim || "…"}» <span className="text-accent">▍</span>
        </div>
      )}
      <div className="flex items-center justify-center gap-5">
        <button onClick={() => onModeChange("text")} disabled={listening} className={pill}>
          Aa · Текстом
        </button>
        <button
          onClick={listening ? onMicStop : onMicStart}
          disabled={disabled && !listening}
          className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-accent-bg text-[15px] text-white disabled:opacity-40"
          style={listening ? { boxShadow: "0 0 0 6px color-mix(in oklab, var(--color-accent) 25%, transparent)" } : undefined}
        >
          {listening ? "Стоп" : "Говорить"}
        </button>
        {hintBtn}
      </div>
      {listening && <div className="text-[13px] text-disabled">Нажмите «Стоп», чтобы отправить реплику</div>}
    </div>
  );
}
