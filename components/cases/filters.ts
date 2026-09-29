import { DifficultyPreset, Tone } from "@/lib/scenarios/types";

/**
 * Состояние фильтров каталога. Живёт отдельно от разметки, потому что его
 * читают и доска, и левая колонка.
 */
export interface FilterState {
  query: string;
  domain: string | null;
  tone: Tone | null;
  difficulty: DifficultyPreset | null;
  onlyUnplayed: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  query: "",
  domain: null,
  tone: null,
  difficulty: null,
  onlyUnplayed: false,
};
