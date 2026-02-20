import { WOOD_BREEDS } from "@/lib/store";

export interface GivenMagnet {
  id: number;
  breed: string;
  stars: number;
}

export interface RecommendedSlot {
  stars: number;
  label: string;
}

export const starBg: Record<number, string> = {
  1: "bg-amber-50 border-amber-200 text-amber-800",
  2: "bg-orange-50 border-orange-300 text-orange-800",
  3: "bg-red-50 border-red-300 text-red-800",
};

/** Рассчитывает рекомендуемый набор магнитов по правилам акции */
export function calcRecommendedSlots(
  orderAmount: number,
  isFirstOrder: boolean,
  clientTotal: number,
  alreadyOwned: Set<string>,
): RecommendedSlot[] {
  if (isFirstOrder) {
    return [{ stars: 2, label: "Падук уже выдан автоматически" }];
  }

  const allStar1 = WOOD_BREEDS.filter((b) => b.stars === 1);
  const allStar2 = WOOD_BREEDS.filter((b) => b.stars === 2);
  const allStar3 = WOOD_BREEDS.filter((b) => b.stars === 3);

  const collectedAll1 = allStar1.every((b) => alreadyOwned.has(b.breed));
  const collectedAll2 = allStar2.every((b) => alreadyOwned.has(b.breed));
  const collectedAll3 = allStar3.every((b) => alreadyOwned.has(b.breed));

  if (collectedAll3) return [];

  const canHave3star = clientTotal >= 10000;

  if (collectedAll1 && collectedAll2) {
    return [{ stars: 3, label: "Все обычные и особенные собраны → выдаём элитный" }];
  }

  if (collectedAll1) {
    const nextStars = collectedAll2 ? 3 : 2;
    if (orderAmount >= 7000) {
      if (canHave3star) {
        return [{ stars: 3, label: "≥7000₽ + сумма ≥10000₽" }];
      } else {
        return [
          { stars: nextStars, label: "≥7000₽, все 1⭐ собраны" },
          { stars: nextStars, label: "≥7000₽, все 1⭐ собраны" },
        ];
      }
    }
    if (orderAmount >= 3000) {
      return [{ stars: nextStars, label: "≥3000₽, все 1⭐ собраны" }];
    }
    if (orderAmount >= 1500) {
      return [
        { stars: nextStars, label: "≥1500₽, все 1⭐ собраны" },
        { stars: nextStars, label: "≥1500₽, все 1⭐ собраны" },
      ];
    }
    return [{ stars: nextStars, label: "<1500₽, все 1⭐ собраны" }];
  }

  if (orderAmount >= 10000) {
    const slots: RecommendedSlot[] = [{ stars: 3, label: "≥10 000₽ → гарантированный 3⭐" }];
    if (canHave3star) {
      slots.push({ stars: 1, label: "≥10 000₽ дополнительно" });
      slots.push({ stars: 1, label: "≥10 000₽ дополнительно" });
    } else {
      slots.push({ stars: 2, label: "≥10 000₽ дополнительно (замена 3⭐)" });
    }
    return slots;
  }

  if (orderAmount >= 7000) {
    if (canHave3star) {
      return [{ stars: 3, label: "≥7000₽ + сумма ≥10000₽" }];
    }
    return [
      { stars: 2, label: "≥7000₽ (замена 3⭐)" },
      { stars: 2, label: "≥7000₽ (замена 3⭐)" },
    ];
  }

  if (orderAmount >= 3000) {
    if (canHave3star) {
      return [{ stars: 2, label: "≥3000₽, на выбор: 2⭐ или 2×1⭐" }];
    }
    return [
      { stars: 1, label: "≥3000₽" },
      { stars: 1, label: "≥3000₽" },
    ];
  }

  if (orderAmount >= 1500) {
    return [
      { stars: 1, label: "1500–3000₽" },
      { stars: 1, label: "1500–3000₽" },
    ];
  }

  return [{ stars: 1, label: "<1500₽" }];
}

/** Подбирает конкретные породы для каждого слота (по остаткам, не выданные) */
export function pickBreeds(
  slots: RecommendedSlot[],
  alreadyOwned: Set<string>,
  givenBreeds: Set<string>,
  inventory: Record<string, number>,
): Array<{ breed: string; stars: number; category: string; stock: number } | null> {
  const used = new Set<string>(givenBreeds);
  return slots.map((slot) => {
    const candidates = WOOD_BREEDS
      .filter((b) => b.stars === slot.stars && !alreadyOwned.has(b.breed) && !used.has(b.breed))
      .map((b) => ({ ...b, stock: inventory[b.breed] ?? 0 }))
      .filter((b) => b.stock > 0)
      .sort((a, b) => b.stock - a.stock);
    const pick = candidates[0] ?? null;
    if (pick) used.add(pick.breed);
    return pick;
  });
}
