"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMMITMENTS } from "@/lib/flow/copy";
import { CommitmentItem, CommitmentReaction } from "@/lib/flow/types";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Modal } from "@/components/ui/Modal";

const MAX_ITEMS = 5;

function emptyItem(): CommitmentItem {
  return { id: Math.random().toString(36).slice(2), what: "", who: "", deadline: "", check: "" };
}

/**
 * Commitment fixation. The player writes every line themselves — no templates
 * or autocomplete, because producing the wording IS the skill being trained.
 *
 * After sending, the modal stays open and shows the persona's reaction in the
 * same voice as the call. "Revise" keeps the form editable; each revision
 * costs a turn in the conversation.
 */
export function CommitmentsModal({
  open,
  onClose,
  sessionId,
  personaName,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  personaName: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<CommitmentItem[]>([emptyItem()]);
  const [reaction, setReaction] = useState<CommitmentReaction | null>(null);
  const [sending, setSending] = useState(false);

  const dirty = items.some((i) => i.what || i.who || i.deadline || i.check);
  const canSubmit = items.every((i) => i.what.trim() && i.who.trim() && i.deadline.trim()) && !sending;

  function update(id: string, patch: Partial<CommitmentItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function requestClose() {
    if (dirty && !window.confirm(COMMITMENTS.closeConfirm)) return;
    onClose();
  }

  async function submit() {
    setSending(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/commitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as CommitmentReaction;
      setReaction(data);
    } catch {
      setReaction({
        verdict: "revise",
        text: "Я не расслышал. Повторите, пожалуйста, что именно мы записываем.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onRequestClose={requestClose}
      title={COMMITMENTS.title}
      subtitle={COMMITMENTS.subtitle}
      footer={
        reaction && reaction.verdict !== "revise" ? (
          <Button
            variant="primary"
            width="100%"
            label={COMMITMENTS.finish}
            onClick={() => router.push(`/session/${sessionId}/debrief`)}
          />
        ) : (
          <Button
            variant="primary"
            width="100%"
            isDisabled={!canSubmit}
            isLoading={sending}
            label={sending ? COMMITMENTS.submitting : COMMITMENTS.submit}
            onClick={submit}
          />
        )
      }
    >
      <ol className="flex flex-col gap-4">
        {items.map((item, idx) => (
          <li key={item.id} className="rounded-lg border-[1.5px] border-border p-4">
            <div className="flex items-center justify-between">
              <Text type="label" color="secondary">Пункт {idx + 1}</Text>
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  label={COMMITMENTS.removeItem}
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                />
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["what", COMMITMENTS.fields.what],
                  ["who", COMMITMENTS.fields.who],
                  ["deadline", COMMITMENTS.fields.deadline],
                  ["check", COMMITMENTS.fields.check],
                ] as const
              ).map(([key, label]) => (
                <TextInput
                  key={key}
                  label={label}
                  value={item[key]}
                  onChange={(v) => update(item.id, { [key]: v })}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>

      {items.length < MAX_ITEMS ? (
        <div className="mt-4">
          <Button variant="secondary" label={COMMITMENTS.addItem} onClick={() => setItems((p) => [...p, emptyItem()])} />
        </div>
      ) : (
        <div className="mt-4"><Text type="supporting" display="block">{COMMITMENTS.maxItemsNote}</Text></div>
      )}

      {reaction && (
        <div className="mt-6 flex gap-3 rounded-lg border-[1.5px] border-border-strong bg-body p-4">
          <Avatar name={personaName} size="md" />
          <div>
            <Text type="label" color="secondary" display="block">
              {personaName}
            </Text>
            <div className="mt-1">
              <Text as="p" display="block">
                {reaction.text}
              </Text>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
