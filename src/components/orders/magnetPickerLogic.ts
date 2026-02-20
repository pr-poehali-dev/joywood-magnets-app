import { WOOD_BREEDS } from "@/lib/store";

export interface GivenMagnet {
  id: number;
  breed: string;
  stars: number;
}

export interface RecommendedSlot {
  stars: number;
}

export interface RecommendedOption {
  label: string;
  slots: RecommendedSlot[];
}

export interface PickedBreed {
  breed: string;
  stars: number;
  category: string;
  stock: number;
}

export const starBg: Record<number, string> = {
  1: "bg-amber-50 border-amber-200 text-amber-800",
  2: "bg-orange-50 border-orange-300 text-orange-800",
  3: "bg-red-50 border-red-300 text-red-800",
};

/**
 * Weighted random pick: чем больше остаток, тем выше шанс,
 * но с добавлением шума — так разным клиентам попадаются разные породы.
 * Из топ-N кандидатов выбирается случайный с вероятностью пропорциональной остатку + шум.
 */
function weightedPick(
  candidates: PickedBreed[],
  used: Set<string>,
): PickedBreed | null {
  const available = candidates.filter((c) => !used.has(c.breed) && c.stock > 0);
  if (available.length === 0) return null;

  const withNoise = available.map((c) => ({
    ...c,
    weight: c.stock + Math.random() * (c.stock * 0.6 + 2),
  }));
  withNoise.sort((a, b) => b.weight - a.weight);

  const top = withNoise.slice(0, Math.min(5, withNoise.length));
  const totalW = top.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * totalW;
  for (const c of top) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return top[0];
}

/** Подбирает конкретные породы для каждого слота с элементом случайности */
export function pickBreedsForOption(
  slots: RecommendedSlot[],
  alreadyOwned: Set<string>,
  givenBreeds: Set<string>,
  inventory: Record<string, number>,
): Array<PickedBreed | null> {
  const used = new Set<string>(givenBreeds);
  return slots.map((slot) => {
    const candidates: PickedBreed[] = WOOD_BREEDS
      .filter((b) => b.stars === slot.stars && !alreadyOwned.has(b.breed) && !used.has(b.breed))
      .map((b) => ({ breed: b.breed, stars: b.stars, category: b.category, stock: inventory[b.breed] ?? 0 }))
      .filter((b) => b.stock > 0);
    const pick = weightedPick(candidates, used);
    if (pick) used.add(pick.breed);
    return pick;
  });
}

/**
 * Возвращает все допустимые варианты выдачи магнитов по правилам акции.
 * Каждый вариант — { label, slots[] }
 */
export function calcRecommendedOptions(
  orderAmount: number,
  isFirstOrder: boolean,
  clientTotal: number,
  alreadyOwned: Set<string>,
): RecommendedOption[] {
  if (isFirstOrder) return [];

  const allStar1 = WOOD_BREEDS.filter((b) => b.stars === 1);
  const allStar2 = WOOD_BREEDS.filter((b) => b.stars === 2);
  const allStar3 = WOOD_BREEDS.filter((b) => b.stars === 3);

  const collectedAll1 = allStar1.every((b) => alreadyOwned.has(b.breed));
  const collectedAll2 = allStar2.every((b) => alreadyOwned.has(b.breed));
  const collectedAll3 = allStar3.every((b) => alreadyOwned.has(b.breed));

  if (collectedAll3) return [];

  const canHave3star = clientTotal >= 10000;

  // Все 1⭐ и 2⭐ собраны → только элитные (только если доступны по сумме)
  if (collectedAll1 && collectedAll2) {
    if (!canHave3star) return [];
    return [{ label: "Все обычные и особенные собраны", slots: [{ stars: 3 }] }];
  }

  // Все 1⭐ собраны → переходим на следующую категорию
  if (collectedAll1) {
    const next: 2 | 3 = collectedAll2 ? 3 : 2;
    if (orderAmount >= 7000) {
      const opts: RecommendedOption[] = [];
      if (canHave3star && !collectedAll2) {
        opts.push({ label: "1 элитный ⭐⭐⭐", slots: [{ stars: 3 }] });
      }
      opts.push({ label: `2 особенных ⭐⭐`, slots: [{ stars: next }, { stars: next }] });
      return opts;
    }
    if (orderAmount >= 3000) {
      return [{ label: `1 особенный ⭐⭐`, slots: [{ stars: next }] }];
    }
    if (orderAmount >= 1500) {
      return [{ label: `2 особенных ⭐⭐`, slots: [{ stars: next }, { stars: next }] }];
    }
    return [{ label: `1 особенный ⭐⭐`, slots: [{ stars: next }] }];
  }

  // Стандартные случаи (есть обычные 1⭐ для выдачи)
  if (orderAmount >= 10000) {
    const opts: RecommendedOption[] = [];
    if (canHave3star) {
      opts.push({ label: "1 элитный + 2 обычных", slots: [{ stars: 3 }, { stars: 1 }, { stars: 1 }] });
      opts.push({ label: "1 элитный + 1 особенный", slots: [{ stars: 3 }, { stars: 2 }] });
    } else {
      opts.push({ label: "2 особенных + 1 обычный (замена 3⭐)", slots: [{ stars: 2 }, { stars: 2 }, { stars: 1 }] });
      opts.push({ label: "3 обычных (замена 3⭐)", slots: [{ stars: 1 }, { stars: 1 }, { stars: 1 }] });
    }
    return opts;
  }

  if (orderAmount >= 7000) {
    if (canHave3star) {
      return [
        { label: "1 элитный ⭐⭐⭐", slots: [{ stars: 3 }] },
        { label: "2 особенных ⭐⭐", slots: [{ stars: 2 }, { stars: 2 }] },
        { label: "3 обычных ⭐", slots: [{ stars: 1 }, { stars: 1 }, { stars: 1 }] },
      ];
    }
    return [
      { label: "2 особенных ⭐⭐", slots: [{ stars: 2 }, { stars: 2 }] },
      { label: "3 обычных ⭐", slots: [{ stars: 1 }, { stars: 1 }, { stars: 1 }] },
    ];
  }

  if (orderAmount >= 3000) {
    return [
      { label: "1 особенный ⭐⭐", slots: [{ stars: 2 }] },
      { label: "2 обычных ⭐", slots: [{ stars: 1 }, { stars: 1 }] },
    ];
  }

  if (orderAmount >= 1500) {
    return [
      { label: "2 обычных ⭐", slots: [{ stars: 1 }, { stars: 1 }] },
    ];
  }

  return [
    { label: "1 обычный ⭐", slots: [{ stars: 1 }] },
  ];
}

/**
 * Проверяет набор выданных менеджером магнитов на соответствие правилам.
 * Возвращает null если всё ок, или строку с описанием нарушения.
 */
export function validateGiven(
  given: GivenMagnet[],
  orderAmount: number,
  isFirstOrder: boolean,
  clientTotal: number,
  alreadyOwned: Set<string>,
): string | null {
  if (isFirstOrder || given.length === 0) return null;

  const options = calcRecommendedOptions(orderAmount, isFirstOrder, clientTotal, alreadyOwned);
  if (options.length === 0) return null;

  const givenStars = given.map((g) => g.stars).sort();
  const givenCount = givenStars.length;

  const canHave3star = clientTotal >= 10000;
  const has3star = givenStars.includes(3);

  // Проверка: 3⭐ только при общей сумме ≥ 10 000₽
  if (has3star && !canHave3star) {
    return `Магнит ⭐⭐⭐ доступен только при общей сумме заказов клиента ≥ 10 000 ₽ (сейчас ${clientTotal.toLocaleString("ru-RU")} ₽).`;
  }

  // Минимально допустимое количество магнитов — минимум по всем вариантам
  const minAllowed = Math.min(...options.map((o) => o.slots.length));
  // Максимально допустимое — максимум по всем вариантам
  const maxAllowed = Math.max(...options.map((o) => o.slots.length));

  if (givenCount < minAllowed) {
    return `По правилам акции при этой сумме заказа полагается минимум ${minAllowed} магн., выдано ${givenCount}.`;
  }
  if (givenCount > maxAllowed) {
    return `По правилам акции при этой сумме заказа полагается максимум ${maxAllowed} магн., выдано ${givenCount}.`;
  }

  // Проверяем, подходит ли набор хотя бы под один из допустимых вариантов по звёздам
  const matchesAnyOption = options.some((opt) => {
    const slotStars = opt.slots.map((s) => s.stars).sort();
    return (
      slotStars.length === givenStars.length &&
      slotStars.every((s, i) => s === givenStars[i])
    );
  });

  if (!matchesAnyOption) {
    const allowed = options.map((o) => o.label).join(" / ");
    return `Набор магнитов не соответствует правилам. Допустимые варианты: ${allowed}.`;
  }

  return null;
}