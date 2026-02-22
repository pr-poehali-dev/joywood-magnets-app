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
 * Возвращает активные породы по звёздности.
 * activeBreeds = undefined означает "все активны" (обратная совместимость).
 */
function activeByStars(stars: number, activeBreeds?: Set<string>) {
  const all = WOOD_BREEDS.filter((b) => b.stars === stars);
  if (!activeBreeds) return all;
  return all.filter((b) => activeBreeds.has(b.breed));
}

/**
 * Weighted random pick: чем больше остаток, тем выше шанс,
 * но с добавлением шума — так разным клиентам попадаются разные породы.
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
  activeBreeds?: Set<string>,
): Array<PickedBreed | null> {
  const used = new Set<string>(givenBreeds);
  return slots.map((slot) => {
    const candidates: PickedBreed[] = WOOD_BREEDS
      .filter((b) =>
        b.stars === slot.stars &&
        !alreadyOwned.has(b.breed) &&
        !used.has(b.breed) &&
        (!activeBreeds || activeBreeds.has(b.breed))
      )
      .map((b) => ({ breed: b.breed, stars: b.stars, category: b.category, stock: inventory[b.breed] ?? 0 }))
      .filter((b) => b.stock > 0);
    const pick = weightedPick(candidates, used);
    if (pick) used.add(pick.breed);
    return pick;
  });
}

/**
 * Веса вариантов по максимальной звёздности: чем дороже — тем реже рекомендуется.
 * ⭐ = 6, ⭐⭐ = 3, ⭐⭐⭐ = 1
 */
const OPTION_STAR_WEIGHT: Record<number, number> = { 1: 6, 2: 3, 3: 1 };

function optionWeight(option: RecommendedOption): number {
  const maxStars = Math.max(...option.slots.map((s) => s.stars));
  return OPTION_STAR_WEIGHT[maxStars] ?? 1;
}

/**
 * Взвешенный случайный выбор индекса варианта.
 */
export function pickWeightedOptionIndex(options: RecommendedOption[]): number {
  if (options.length === 0) return 0;
  if (options.length === 1) return 0;

  const weights = options.map(optionWeight);
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return options.length - 1;
}

/**
 * Возвращает все допустимые варианты выдачи магнитов по правилам акции.
 * activeBreeds — множество активных пород (только они доступны для выдачи и считаются при проверке).
 */
export function calcRecommendedOptions(
  orderAmount: number,
  isFirstOrder: boolean,
  clientTotal: number,
  alreadyOwned: Set<string>,
  activeBreeds?: Set<string>,
): RecommendedOption[] {
  if (isFirstOrder) return [];

  const active1 = activeByStars(1, activeBreeds);
  const active2 = activeByStars(2, activeBreeds);
  const active3 = activeByStars(3, activeBreeds);

  const collectedAll1 = active1.length === 0 || active1.every((b) => alreadyOwned.has(b.breed));
  const collectedAll2 = active2.length === 0 || active2.every((b) => alreadyOwned.has(b.breed));
  const collectedAll3 = active3.length === 0 || active3.every((b) => alreadyOwned.has(b.breed));

  if (collectedAll1 && collectedAll2 && collectedAll3) return [];

  const canHave3star = clientTotal >= 10000;

  if (orderAmount >= 10000) {
    if (!canHave3star) return collectedAll2 ? [] : [{ label: "1 особенный ⭐⭐", slots: [{ stars: 2 }] }];
    return collectedAll3 ? [] : [{ label: "1 элитный ⭐⭐⭐", slots: [{ stars: 3 }] }];
  }

  if (orderAmount >= 7000) {
    const opts: RecommendedOption[] = [];
    if (canHave3star && !collectedAll3) opts.push({ label: "1 элитный ⭐⭐⭐", slots: [{ stars: 3 }] });
    if (!collectedAll2) opts.push({ label: "2 особенных ⭐⭐", slots: [{ stars: 2 }, { stars: 2 }] });
    if (!collectedAll1) opts.push({ label: "3 обычных ⭐", slots: [{ stars: 1 }, { stars: 1 }, { stars: 1 }] });
    return opts;
  }

  if (orderAmount >= 3000) {
    const opts: RecommendedOption[] = [];
    if (!collectedAll2) opts.push({ label: "1 особенный ⭐⭐", slots: [{ stars: 2 }] });
    if (!collectedAll1) opts.push({ label: "2 обычных ⭐", slots: [{ stars: 1 }, { stars: 1 }] });
    return opts;
  }

  if (orderAmount >= 1500) {
    if (collectedAll1) return [];
    return [{ label: "2 обычных ⭐", slots: [{ stars: 1 }, { stars: 1 }] }];
  }

  if (collectedAll1) return [];
  return [{ label: "1 обычный ⭐", slots: [{ stars: 1 }] }];
}

/**
 * Проверяет набор выданных менеджером магнитов на соответствие правилам.
 */
export function validateGiven(
  given: GivenMagnet[],
  orderAmount: number,
  isFirstOrder: boolean,
  clientTotal: number,
  alreadyOwned: Set<string>,
  activeBreeds?: Set<string>,
): string | null {
  if (isFirstOrder || given.length === 0) return null;

  const options = calcRecommendedOptions(orderAmount, isFirstOrder, clientTotal, alreadyOwned, activeBreeds);
  if (options.length === 0) return null;

  const givenStars = given.map((g) => g.stars).sort();
  const givenCount = givenStars.length;

  const canHave3star = clientTotal >= 10000;
  const has3star = givenStars.includes(3);

  if (has3star && !canHave3star) {
    return `Магнит ⭐⭐⭐ доступен только при общей сумме заказов клиента ≥ 10 000 ₽ (сейчас ${clientTotal.toLocaleString("ru-RU")} ₽).`;
  }

  const minAllowed = Math.min(...options.map((o) => o.slots.length));
  const maxAllowed = Math.max(...options.map((o) => o.slots.length));

  if (givenCount < minAllowed) {
    return `По правилам акции при этой сумме заказа полагается минимум ${minAllowed} магн., выдано ${givenCount}.`;
  }
  if (givenCount > maxAllowed) {
    return `По правилам акции при этой сумме заказа полагается максимум ${maxAllowed} магн., выдано ${givenCount}.`;
  }

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
