import { redirect } from "next/navigation";
import Link from "next/link";
import { Text } from "@astryxdesign/core/Text";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN } from "@/lib/flow/copy";

/**
 * Единственная проверка доступа в админку. Все страницы контура лежат под этим
 * макетом, поэтому добавить новую и забыть про защиту нельзя: неадминистратор
 * не получает 403 со страницей, а просто уходит в каталог — так он не узнаёт,
 * что админка вообще существует.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/cases");

  return (
    <div className="min-h-screen bg-body text-primary">
      <header className="border-b-[1.5px] border-border bg-surface">
        <div className="mx-auto flex max-w-wide items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-5">
            <Link href="/admin">
              <Text type="label" weight="bold">
                {ADMIN.sectionTitle}
              </Text>
            </Link>
            <Link href="/admin/analytics">
              <Text type="supporting" color="secondary">
                Аналитика
              </Text>
            </Link>
            <Link href="/cases">
              <Text type="supporting" color="secondary">
                {ADMIN.backToCatalog}
              </Text>
            </Link>
          </div>
          <Text type="supporting" color="secondary">
            {user.displayName ?? user.email}
          </Text>
        </div>
      </header>
      {children}
    </div>
  );
}
