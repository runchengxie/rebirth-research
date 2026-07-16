import type { CharacterId, CompetingHypotheses } from "../types";

export interface DebateItem {
  characterId: CharacterId;
  label: string;
  text: string;
}

export function debateItems(hypotheses: CompetingHypotheses | undefined): DebateItem[] {
  if (!hypotheses) return [];
  const items: DebateItem[] = [];
  if (hypotheses.lin) {
    items.push({ characterId: "lin_ruoning", label: "基本面", text: hypotheses.lin });
  }
  if (hypotheses.chen) {
    items.push({ characterId: "chen_xinghe", label: "量价", text: hypotheses.chen });
  }
  if (hypotheses.zhou) {
    items.push({ characterId: "zhou_mingzhao", label: "风控", text: hypotheses.zhou });
  }
  return items;
}
