import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { duplicateScenario } from "@/lib/scenarios/repository";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const copy = await duplicateScenario(id);
  if (!copy) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ scenario: copy }, { status: 201 });
}
