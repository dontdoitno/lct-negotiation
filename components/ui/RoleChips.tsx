"use client";

import { Text } from "@astryxdesign/core/Text";
import { ROLE_LABEL } from "@/lib/access";

export type PlayableRole = "employee" | "manager";

/**
 * Выбор положения человека в компании. Роль решает, какие разговоры ему
 * доступны, поэтому она выбирается явно, а не угадывается по должности.
 */
export function RoleChips({
  value,
  onChange,
  isDisabled,
  label,
}: {
  value: PlayableRole;
  onChange: (role: PlayableRole) => void;
  isDisabled?: boolean;
  label?: string;
}) {
  const options: PlayableRole[] = ["employee", "manager"];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && (
        <Text type="label" color="secondary">
          {label}
        </Text>
      )}
      {options.map((r) => (
        <button
          key={r}
          type="button"
          disabled={isDisabled}
          onClick={() => onChange(r)}
          className={`rounded-full border-[1.5px] px-2.5 py-0.5 text-[12px] motion-safe:transition-colors disabled:opacity-60 ${
            value === r
              ? "border-accent bg-accent text-on-accent"
              : "border-border text-secondary hover:border-border-strong"
          }`}
        >
          {ROLE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}
