"use client";

import { ComponentProps, useId } from "react";

/**
 * Labelled input with inline error text. The error is wired through
 * aria-describedby and aria-invalid so it is announced, not just coloured —
 * the spec requires every status to be readable without relying on colour.
 */
export function Field({
  label,
  error,
  className = "",
  ...rest
}: { label: string; error?: string | null } & ComponentProps<"input">) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-case text-[10px] text-secondary">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-md border-[1.5px] bg-surface px-3.5 py-2.5 text-[15px] text-primary outline-none placeholder:text-disabled focus-visible:border-accent disabled:opacity-60 ${
          error ? "border-metric-resistance" : "border-border"
        } ${className}`}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-[13px] text-metric-resistance">
          {error}
        </p>
      )}
    </div>
  );
}
