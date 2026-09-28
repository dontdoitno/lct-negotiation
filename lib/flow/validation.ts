import { SIGNUP } from "./copy";

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return SIGNUP.errors.emailRequired;
  // Deliberately loose: catches obvious typos without rejecting valid-but-odd
  // addresses. Real verification happens by sending mail, not by regex.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return SIGNUP.errors.emailInvalid;
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return SIGNUP.errors.passwordRequired;
  if (value.length < 8) return SIGNUP.errors.passwordShort;
  return null;
}
