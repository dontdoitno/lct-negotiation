import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPersonaById } from "@/lib/scenarios/runtime";
import { SessionState } from "@/lib/engine/types";
import { CommitmentItem, CommitmentReaction } from "@/lib/flow/types";

/**
 * Judges the written commitments and answers in character.
 *
 * The verdict is decided by the deterministic state, not by the wording: a
 * persona who is still resisting will not sign off however neatly the player
 * writes. What the text does decide is whether a specific item lacks the
 * concreteness the method demands (an owner and a date).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const items: CommitmentItem[] = Array.isArray(body.items) ? body.items : [];

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const persona = await getPersonaById(session.personaId);
  const state = session.state as unknown as SessionState;

  const vagueIndex = items.findIndex((i) => !i.who.trim() || !i.deadline.trim());

  let reaction: CommitmentReaction;

  if (items.length === 0) {
    reaction = { verdict: "revise", text: "Здесь пока пусто. Что именно мы фиксируем?" };
  } else if (vagueIndex >= 0) {
    reaction = {
      verdict: "revise",
      itemIndex: vagueIndex,
      text: `В пункте ${vagueIndex + 1} не хватает главного — кто отвечает и к какому сроку. Без этого это не договорённость, а пожелание.`,
    };
  } else if (state.R >= 67) {
    reaction = {
      verdict: "rejected",
      text: persona.exitLine,
    };
  } else if (state.T < 40) {
    // The hidden-failure case: he signs, but nothing behind it has changed.
    reaction = {
      verdict: "accepted",
      text: "Хорошо, записывайте. Как скажете.",
    };
  } else {
    reaction = {
      verdict: "accepted",
      text: "Да, так работает. Под этим я подпишусь.",
    };
  }

  if (reaction.verdict !== "revise") {
    await prisma.session.update({
      where: { id },
      data: {
        status: reaction.verdict === "accepted" ? "success" : "failed",
        finishedAt: new Date(),
      },
    });
  }

  return NextResponse.json(reaction);
}
