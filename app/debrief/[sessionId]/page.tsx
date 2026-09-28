import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/flow/routes";

/**
 * Legacy debrief address. Kept as a redirect so links produced before the
 * flow rework (and anything already in a user's history) still land somewhere
 * correct instead of 404ing.
 */
export default async function LegacyDebriefRedirect({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  redirect(ROUTES.debrief(sessionId));
}
