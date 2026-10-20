"use client";

import { useState } from "react";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { PlayableRole, RoleChips } from "@/components/ui/RoleChips";

/**
 * Заведение сотрудника руками. Второй путь — самостоятельная регистрация по
 * коду компании, он на экране входа; здесь HR добавляет человека сам и
 * передаёт ему первый пароль.
 */
export function AddMemberForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<PlayableRole>("employee");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, displayName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не получилось добавить сотрудника.");
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <Button variant="secondary" size="sm" label="Добавить сотрудника" onClick={() => setOpen(true)} />;
  }

  return (
    <form onSubmit={submit} className="flex max-w-narrow flex-col gap-3 rounded-lg border border-border p-4">
      <Text type="label" display="block">
        Новый сотрудник
      </Text>
      <TextInput type="email" label="Email" value={email} onChange={setEmail} isDisabled={busy} />
      <TextInput label="Имя" value={displayName} onChange={setDisplayName} isDisabled={busy} />
      <TextInput
        type="password"
        label="Первый пароль"
        value={password}
        onChange={setPassword}
        isDisabled={busy}
        autoComplete="new-password"
      />
      <RoleChips label="Положение" value={role} onChange={setRole} isDisabled={busy} />
      {error && (
        <Text type="supporting" display="block" role="alert">
          {error}
        </Text>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isLoading={busy} label="Добавить" />
        <Button variant="ghost" size="sm" label="Отмена" onClick={() => setOpen(false)} />
      </div>
    </form>
  );
}
