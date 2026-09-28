import Link from "next/link";
import { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

/**
 * Sizes match the finished call and briefing screens, which set type in px
 * directly. Colours come from theme tokens only.
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent-bg text-on-accent hover:opacity-90",
  secondary: "border-[1.5px] border-border-strong text-primary hover:border-accent hover:text-accent",
  ghost: "text-primary underline underline-offset-4 hover:text-accent",
};

const SIZE: Record<ButtonSize, string> = {
  md: "px-6 py-2.5 text-[15px]",
  lg: "px-8 py-3 text-[17px]",
};

function classes(variant: ButtonVariant, size: ButtonSize, full?: boolean) {
  const base =
    "inline-flex items-center justify-center rounded-md font-bold motion-safe:transition-colors disabled:opacity-60 disabled:pointer-events-none";
  const sizing = variant === "ghost" ? "text-[14px] font-normal" : SIZE[size];
  return `${base} ${VARIANT[variant]} ${sizing} ${full ? "w-full" : ""}`;
}

export function Button({
  variant = "primary",
  size = "md",
  full,
  className = "",
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  children: ReactNode;
} & ComponentProps<"button">) {
  return (
    <button className={`${classes(variant, size, full)} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  full,
  className = "",
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  children: ReactNode;
} & ComponentProps<typeof Link>) {
  return (
    <Link className={`${classes(variant, size, full)} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
