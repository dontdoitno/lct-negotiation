import { describe, expect, it } from "vitest";
import { matchLevelFromQuiz, type MatchCandidate } from "@/lib/flow/matching";

/**
 * Подбор первого разговора по опросу. Главное правило: «с кем тяжело» решает
 * направление, и только внутри него выбирается тема.
 */
const CANDIDATES: MatchCandidate[] = [
  { levelId: "down-1", direction: "down", topic: "Перегрузка сотрудника", title: "Перегрузка: Ника" },
  { levelId: "down-2", direction: "down", topic: "Падение результатов", title: "Падение: Игорь" },
  { levelId: "up-1", direction: "up", topic: "Сроки и объём работ", title: "Пересмотр сроков дедлайна" },
  { levelId: "up-2", direction: "up", topic: "Оплата и рост ответственности", title: "Просьба о повышении зарплаты" },
  { levelId: "peer-1", direction: "peer", topic: "Общая ответственность за результат", title: "Срыв на стыке задач" },
  { levelId: "top-1", direction: "top", topic: "Бюджет и сокращение расходов", title: "Защита бюджета отдела" },
];

describe("matchLevelFromQuiz", () => {
  it("с подчинёнными ведёт вниз", () => {
    const id = matchLevelFromQuiz({ counterpart: "subordinates" }, CANDIDATES);
    expect(CANDIDATES.find((c) => c.levelId === id)?.direction).toBe("down");
  });

  it("с коллегами ведёт вбок", () => {
    const id = matchLevelFromQuiz({ counterpart: "peers" }, CANDIDATES);
    expect(id).toBe("peer-1");
  });

  it("с начальством ведёт вверх", () => {
    const id = matchLevelFromQuiz({ counterpart: "boss", role: "group_head" }, CANDIDATES);
    expect(CANDIDATES.find((c) => c.levelId === id)?.direction).toBe("up");
  });

  it("начальнику отдела начальство это директор, а не свой руководитель", () => {
    const id = matchLevelFromQuiz({ counterpart: "boss", role: "dept_head" }, CANDIDATES);
    expect(id).toBe("top-1");
  });

  it("тема выбирает разговор внутри направления, не меняя направление", () => {
    const id = matchLevelFromQuiz(
      { counterpart: "boss", role: "group_head", topic: "boss_communication" },
      CANDIDATES,
    );
    // «срок» встречается в теме up-1 и уводит именно туда, оставаясь наверху.
    expect(id).toBe("up-1");
    expect(CANDIDATES.find((c) => c.levelId === id)?.direction).toBe("up");
  });

  it("не возвращает разговор, которого нет среди доступных", () => {
    // Сотруднику направление «вниз» недоступно: в каталог оно не попало.
    const forEmployee = CANDIDATES.filter((c) => c.direction !== "down" && c.direction !== "top");
    const id = matchLevelFromQuiz({ counterpart: "subordinates", role: "employee" }, forEmployee);
    expect(forEmployee.map((c) => c.levelId)).toContain(id);
  });

  it("без ответов всё равно отдаёт что-то из списка", () => {
    const id = matchLevelFromQuiz({}, CANDIDATES);
    expect(CANDIDATES.map((c) => c.levelId)).toContain(id);
  });

  it("на пустом списке возвращает пустую строку, а не падает", () => {
    expect(matchLevelFromQuiz({ counterpart: "peers" }, [])).toBe("");
  });
});
