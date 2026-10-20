import { Skeleton } from "@astryxdesign/core/Skeleton";

/**
 * Каркас каталога на время загрузки.
 *
 * Страница каталога серверная и ходит в базу, поэтому между нажатием и первым
 * кадром проходит секунда с небольшим. Без этого экрана всё это время не
 * менялось ничего, и кнопка «Пропустить» на правилах выглядела неработающей.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-body lg:flex-row">
      <aside className="shrink-0 border-b border-border px-4 py-4 lg:h-screen lg:w-64 lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <Skeleton width="60%" height={16} />
        <div className="mt-5 flex flex-col gap-2">
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={36} />
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto flex max-w-wide flex-col gap-8">
          <div className="flex flex-col gap-2">
            <Skeleton width={80} height={14} />
            <Skeleton width="55%" height={34} />
          </div>

          {[0, 1].map((section) => (
            <div key={section} className="flex flex-col gap-3">
              <Skeleton width="40%" height={22} />
              <Skeleton width="70%" height={14} />
              <div className="grid grid-flow-row gap-4 sm:grid-flow-col sm:auto-cols-[calc((100%-1rem)/2)] lg:auto-cols-[calc((100%-2rem)/3)]">
                {[0, 1, 2].map((card) => (
                  <Skeleton key={card} height={132} radius={4} index={card} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
