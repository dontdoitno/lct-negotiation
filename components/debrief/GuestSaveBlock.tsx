"use client";

import { useState } from "react";
import { Text, Heading } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { DEBRIEF, SIGNUP } from "@/lib/flow/copy";
import { validateEmail, validatePassword } from "@/lib/flow/validation";

/** Inline signup shown on the debrief only while the player is a guest. */
export function GuestSaveBlock() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });
    if (emailError || passwordError) return;

    setSubmitting(true);
    // No auth backend yet — the flow spec only requires the block to exist and
    // behave. Wire this to a real endpoint when accounts land.
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <section className="border-t-[1.5px] border-border-strong py-6">
        <span className="block text-metric-trust">
          <Text color="inherit" display="block">
            Результат сохранён.
          </Text>
        </span>
      </section>
    );
  }

  return (
    <section className="border-t-[1.5px] border-border-strong py-6">
      <Heading level={2}>{DEBRIEF.guestTitle}</Heading>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextInput
            type="email"
            label={SIGNUP.email}
            value={email}
            onChange={setEmail}
            onBlur={() => setErrors((s) => ({ ...s, email: validateEmail(email) }))}
            status={errors.email ? { type: "error", message: errors.email } : undefined}
            isDisabled={submitting}
          />
        </div>
        <div className="flex-1">
          <TextInput
            type="password"
            label={SIGNUP.password}
            value={password}
            onChange={setPassword}
            onBlur={() => setErrors((s) => ({ ...s, password: validatePassword(password) }))}
            status={errors.password ? { type: "error", message: errors.password } : undefined}
            isDisabled={submitting}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          isLoading={submitting}
          label={submitting ? SIGNUP.submitting : SIGNUP.submit}
        />
      </form>
    </section>
  );
}
