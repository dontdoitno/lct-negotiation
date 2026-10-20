import { redirect } from "next/navigation";
import { getUserId } from "@/lib/user";
import { getCurrentUser } from "@/lib/auth";
import { isHr } from "@/lib/access";
import { loadCases } from "@/lib/flow/cases";
import { CasesBoard } from "@/components/cases/CasesBoard";
import { QuizGuard } from "@/components/flow/QuizGuard";

export default async function CasesPage() {
  const userId = await getUserId();
  // Роль решает, какие направления видно. У гостя роли нет: он видит всё.
  const user = await getCurrentUser();
  // HR-контур (админ) сюда не попадает: его место — /admin.
  if (isHr(user?.role)) redirect("/admin");
  const cases = await loadCases(userId, {
    role: user?.role ?? null,
    organizationId: user?.organizationId ?? null,
  });
  const hasProgress = cases.some((c) => c.attempts > 0);

  return (
    <div className="min-h-screen bg-body text-primary">
      <QuizGuard hasProgress={hasProgress} />
      <CasesBoard cases={cases} isAdmin={isHr(user?.role)} />
    </div>
  );
}
