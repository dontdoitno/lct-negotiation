import { redirect } from "next/navigation";
import { Heading, Text } from "@astryxdesign/core/Text";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listMembers } from "@/lib/org/people";
import { listScenarios } from "@/lib/scenarios/repository";
import { PeopleTable } from "@/components/admin/PeopleTable";
import { AddMemberForm } from "@/components/admin/AddMemberForm";

export const dynamic = "force-dynamic";

/**
 * Люди компании: прогресс каждого и назначение разговоров.
 *
 * Организация берётся из аккаунта HR. Параметра с идентификатором компании
 * здесь нет намеренно: иначе его можно было бы подменить в адресе.
 */
export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    return (
      <main className="mx-auto max-w-reading px-6 py-10">
        <Heading level={1} type="display-3">
          Аккаунт не привязан к компании
        </Heading>
        <div className="mt-3">
          <Text as="p" display="block" color="secondary">
            Список сотрудников доступен HR внутри организации. Этот аккаунт
            создавался до появления компаний.
          </Text>
        </div>
      </main>
    );
  }

  const [org, members, scenarios] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId } }),
    listMembers(user.organizationId),
    listScenarios({ status: "published" }),
  ]);
  if (!org) redirect("/admin");

  // Чужие сценарии в список назначения не попадают: только общие и свои.
  const assignable = scenarios
    .filter((s) => !s.organizationId || s.organizationId === user.organizationId)
    .map((s) => ({ id: s.id, title: s.title, direction: s.direction, npcName: s.npcName }));

  return (
    <main className="mx-auto max-w-wide px-4 py-6 sm:px-6 sm:py-8">
      <Heading level={1} type="display-3">
        {org.name}
      </Heading>
      <div className="mt-2">
        <Text as="p" display="block" color="secondary">
          Сотрудников: {members.length}. Код для самостоятельной регистрации:{" "}
          <span className="font-mono text-primary">{org.joinCode}</span>
        </Text>
      </div>

      <div className="mt-5">
        <AddMemberForm />
      </div>

      <div className="mt-6">
        <PeopleTable members={members} scenarios={assignable} />
      </div>
    </main>
  );
}
