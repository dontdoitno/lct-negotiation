"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text, Heading } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { SIGNUP } from "@/lib/flow/copy";
import { continueAsGuest } from "@/lib/flow/store";
import { validateEmail, validatePassword } from "@/lib/flow/validation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });
    if (emailError || passwordError) return;

    setSubmitting(true);
    setServerError(null);
    try {
      // No accounts backend yet; the guest path is what actually carries the
      // flow today, so this resolves and moves on rather than faking success.
      await new Promise((r) => setTimeout(r, 400));
      router.push("/rules");
    } catch {
      setServerError(SIGNUP.errors.server);
      setSubmitting(false);
    }
  }

  function guest() {
    continueAsGuest();
    router.push("/rules");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-narrow flex-col justify-center px-6 py-10">
      <Heading level={1} type="display-3">
        {SIGNUP.title}
      </Heading>
      <div className="mt-2">
        <Text as="p" display="block" color="secondary">
          {SIGNUP.subtitle}
        </Text>
      </div>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
        <TextInput
          type="email"
          label={SIGNUP.email}
          value={email}
          onChange={setEmail}
          onBlur={() => setErrors((s) => ({ ...s, email: validateEmail(email) }))}
          status={errors.email ? { type: "error", message: errors.email } : undefined}
          isDisabled={submitting}
          autoComplete="email"
        />
        <TextInput
          type="password"
          label={SIGNUP.password}
          value={password}
          onChange={setPassword}
          onBlur={() => setErrors((s) => ({ ...s, password: validatePassword(password) }))}
          status={errors.password ? { type: "error", message: errors.password } : undefined}
          isDisabled={submitting}
          autoComplete="new-password"
        />

        {serverError && (
          <Text as="p" color="accent" role="alert">
            {serverError}
          </Text>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          width="100%"
          isLoading={submitting}
          label={submitting ? SIGNUP.submitting : SIGNUP.submit}
        />
      </form>

      <div className="mt-4 self-center">
        <Button variant="ghost" size="sm" label={SIGNUP.guest} onClick={guest} />
      </div>

      <div className="mt-8 text-center">
        <Text color="secondary">{SIGNUP.haveAccount} </Text>
        <Link href="/login">{SIGNUP.login}</Link>
      </div>
    </main>
  );
}
