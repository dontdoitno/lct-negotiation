import { getUserId } from "@/lib/user";
import { getCurrentUser } from "@/lib/auth";
import { loadCases } from "@/lib/flow/cases";
import { CasesBoard } from "@/components/cases/CasesBoard";
import { QuizGuard } from "@/components/flow/QuizGuard";

export default async function CasesPage() {
  const userId = await getUserId();
  const [cases, user] = await Promise.all([loadCases(userId), getCurrentUser()]);
  const hasProgress = cases.some((c) => c.attempts > 0);

  return (
    <div className="min-h-screen bg-body text-primary">
      <QuizGuard hasProgress={hasProgress} />
      <CasesBoard cases={cases} isAdmin={user?.role === "admin"} />
    </div>
  );
}
