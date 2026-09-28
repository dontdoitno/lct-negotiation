"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text, Heading } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { LOGIN, SIGNUP } from "@/lib/flow/copy";
import { validateEmail, validatePassword } from "@/lib/flow/validation";

export default function LoginPage() {
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
      await new Promise((r) => setTimeout(r, 400));
      router.push("/cases");
    } catch {
      setServerError(LOGIN.errors.server);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-narrow flex-col justify-center px-6 py-10">
      <Heading level={1} type="display-3">
        {LOGIN.title}
      </Heading>

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
          autoComplete="current-password"
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
          label={submitting ? LOGIN.submitting : LOGIN.submit}
        />
      </form>

      <div className="mt-8 text-center">
        <Text color="secondary">{LOGIN.noAccount} </Text>
        <Link href="/signup">{LOGIN.signup}</Link>
      </div>
    </main>
  );
}
