import { describe, it, expect } from "vitest";
import { WOOD_BREEDS } from "@/lib/store";
import {
  calcRecommendedOptions,
  pickBreedsForOption,
  validateGiven,
  GivenMagnet,
} from "../magnetPickerLogic";

// ─── вспомогательные данные ───────────────────────────────────────────────────

const ALL_1 = WOOD_BREEDS.filter((b) => b.stars === 1).map((b) => b.breed);
const ALL_2 = WOOD_BREEDS.filter((b) => b.stars === 2).map((b) => b.breed);
const ALL_3 = WOOD_BREEDS.filter((b) => b.stars === 3).map((b) => b.breed);

/** Склад: все породы в наличии, по 10 шт */
const FULL_INVENTORY = Object.fromEntries(
  WOOD_BREEDS.map((b) => [b.breed, 10])
);

/** Склад: все 1⭐ закончились */
const NO_STAR1_INVENTORY = Object.fromEntries(
  WOOD_BREEDS.map((b) => [b.breed, b.stars === 1 ? 0 : 10])
);

/** Склад: только одна порода 2⭐ в наличии — Венге */
const ONLY_VENGE_STAR2 = Object.fromEntries(
  WOOD_BREEDS.map((b) => [b.breed, b.stars === 2 ? (b.breed === "Венге" ? 5 : 0) : 10])
);

/** Склад: все породы на нуле */
const EMPTY_INVENTORY = Object.fromEntries(
  WOOD_BREEDS.map((b) => [b.breed, 0])
);

const noOwned = new Set<string>();
const noGiven = new Set<string>();

const gm = (breed: string, stars: 1 | 2 | 3): GivenMagnet => ({ id: 1, breed, stars });

// ─── calcRecommendedOptions ───────────────────────────────────────────────────

describe("calcRecommendedOptions", () => {
  it("первый заказ → пустой список вариантов", () => {
    const opts = calcRecommendedOptions(5000, true, 5000, noOwned);
    expect(opts).toHaveLength(0);
  });

  it("< 1500 ₽ → 1 обычный", () => {
    const opts = calcRecommendedOptions(999, false, 999, noOwned);
    expect(opts).toHaveLength(1);
    expect(opts[0].slots).toEqual([{ stars: 1 }]);
  });

  it("1500–2999 ₽ → 2 обычных", () => {
    const opts = calcRecommendedOptions(2000, false, 2000, noOwned);
    expect(opts).toHaveLength(1);
    expect(opts[0].slots).toEqual([{ stars: 1 }, { stars: 1 }]);
  });

  it("3000–6999 ₽ → два варианта: 1×2⭐ или 2×1⭐", () => {
    const opts = calcRecommendedOptions(4000, false, 4000, noOwned);
    expect(opts).toHaveLength(2);
    const stars = opts.map((o) => o.slots.map((s) => s.stars).sort());
    expect(stars).toContainEqual([2]);
    expect(stars).toContainEqual([1, 1]);
  });

  it("7000–9999 ₽, сумма < 10000 → 2×2⭐ или 3×1⭐, без 3⭐", () => {
    const opts = calcRecommendedOptions(7000, false, 5000, noOwned);
    expect(opts).toHaveLength(2);
    opts.forEach((o) => {
      expect(o.slots.every((s) => s.stars !== 3)).toBe(true);
    });
    const stars = opts.map((o) => o.slots.map((s) => s.stars).sort());
    expect(stars).toContainEqual([2, 2]);
    expect(stars).toContainEqual([1, 1, 1]);
  });

  it("7000 ₽, сумма ≥ 10000 → три варианта включая 1×3⭐", () => {
    const opts = calcRecommendedOptions(7000, false, 15000, noOwned);
    expect(opts).toHaveLength(3);
    expect(opts.some((o) => o.slots.some((s) => s.stars === 3))).toBe(true);
  });

  it("≥ 10000 ₽, сумма < 10000 → без 3⭐ (замена)", () => {
    const opts = calcRecommendedOptions(12000, false, 5000, noOwned);
    opts.forEach((o) => {
      expect(o.slots.every((s) => s.stars !== 3)).toBe(true);
    });
  });

  it("≥ 10000 ₽, сумма ≥ 10000 → есть варианты с 3⭐", () => {
    const opts = calcRecommendedOptions(12000, false, 15000, noOwned);
    expect(opts.some((o) => o.slots.some((s) => s.stars === 3))).toBe(true);
  });

  it("все 1⭐ собраны → варианты только из 2⭐+", () => {
    const owned = new Set(ALL_1);
    const opts = calcRecommendedOptions(4000, false, 4000, owned);
    opts.forEach((o) => {
      o.slots.forEach((s) => expect(s.stars).toBeGreaterThanOrEqual(2));
    });
  });

  it("все 1⭐ и 2⭐ собраны → только 3⭐", () => {
    const owned = new Set([...ALL_1, ...ALL_2]);
    const opts = calcRecommendedOptions(4000, false, 4000, owned);
    opts.forEach((o) => {
      o.slots.forEach((s) => expect(s.stars).toBe(3));
    });
  });

  it("все породы собраны → пустой список", () => {
    const owned = new Set([...ALL_1, ...ALL_2, ...ALL_3]);
    const opts = calcRecommendedOptions(4000, false, 99999, owned);
    expect(opts).toHaveLength(0);
  });
});

// ─── pickBreedsForOption ──────────────────────────────────────────────────────

describe("pickBreedsForOption", () => {
  it("подбирает породу с ненулевым остатком", () => {
    const picks = pickBreedsForOption([{ stars: 1 }], noOwned, noGiven, FULL_INVENTORY);
    expect(picks).toHaveLength(1);
    expect(picks[0]).not.toBeNull();
    expect(picks[0]!.stock).toBeGreaterThan(0);
  });

  it("не предлагает уже выданные в этой сессии", () => {
    const alreadyGiven = new Set(["Граб", "Платан", "Кипарис"]);
    const picks = pickBreedsForOption(
      [{ stars: 1 }, { stars: 1 }],
      noOwned,
      alreadyGiven,
      FULL_INVENTORY,
    );
    picks.forEach((p) => {
      if (p) expect(alreadyGiven.has(p.breed)).toBe(false);
    });
  });

  it("не предлагает уже имеющиеся у клиента породы", () => {
    const owned = new Set(["Граб", "Платан"]);
    const picks = pickBreedsForOption([{ stars: 1 }], owned, noGiven, FULL_INVENTORY);
    expect(picks[0]).not.toBeNull();
    expect(owned.has(picks[0]!.breed)).toBe(false);
  });

  it("возвращает null если нет остатков нужной звёздности", () => {
    const picks = pickBreedsForOption([{ stars: 1 }], noOwned, noGiven, NO_STAR1_INVENTORY);
    expect(picks[0]).toBeNull();
  });

  it("возвращает null если весь склад пустой", () => {
    const picks = pickBreedsForOption([{ stars: 2 }], noOwned, noGiven, EMPTY_INVENTORY);
    expect(picks[0]).toBeNull();
  });

  it("предлагает ТОЛЬКО Венге если остальные 2⭐ закончились", () => {
    const picks = pickBreedsForOption([{ stars: 2 }], noOwned, noGiven, ONLY_VENGE_STAR2);
    expect(picks[0]).not.toBeNull();
    expect(picks[0]!.breed).toBe("Венге");
  });

  it("два слота — две разные породы", () => {
    const picks = pickBreedsForOption(
      [{ stars: 1 }, { stars: 1 }],
      noOwned,
      noGiven,
      FULL_INVENTORY,
    );
    expect(picks[0]).not.toBeNull();
    expect(picks[1]).not.toBeNull();
    expect(picks[0]!.breed).not.toBe(picks[1]!.breed);
  });

  it("предпочитает породы с большим остатком (статистически)", () => {
    // Склад: Граб=100, все остальные 1⭐=1
    const biasedInventory = Object.fromEntries(
      WOOD_BREEDS.map((b) => [b.breed, b.stars === 1 ? (b.breed === "Граб" ? 100 : 1) : 10])
    );
    const counts: Record<string, number> = {};
    for (let i = 0; i < 50; i++) {
      const pick = pickBreedsForOption([{ stars: 1 }], noOwned, noGiven, biasedInventory)[0];
      if (pick) counts[pick.breed] = (counts[pick.breed] ?? 0) + 1;
    }
    // Граб должен встречаться чаще других — хотя бы в 30% случаев
    expect((counts["Граб"] ?? 0)).toBeGreaterThanOrEqual(10);
  });

  it("НЕ зависает при всех слотах без остатков (graceful null)", () => {
    const picks = pickBreedsForOption(
      [{ stars: 1 }, { stars: 2 }, { stars: 3 }],
      noOwned,
      noGiven,
      EMPTY_INVENTORY,
    );
    expect(picks).toHaveLength(3);
    picks.forEach((p) => expect(p).toBeNull());
  });
});

// ─── validateGiven ────────────────────────────────────────────────────────────

describe("validateGiven", () => {
  it("первый заказ → всегда ok", () => {
    const result = validateGiven([gm("Падук", 2)], 999, true, 999, noOwned);
    expect(result).toBeNull();
  });

  it("пустой список выданных → ok (менеджер ещё не выбрал)", () => {
    const result = validateGiven([], 3000, false, 3000, noOwned);
    expect(result).toBeNull();
  });

  it("< 1500 ₽, выдан 1×1⭐ → ok", () => {
    const result = validateGiven([gm("Граб", 1)], 999, false, 999, noOwned);
    expect(result).toBeNull();
  });

  it("< 1500 ₽, выдано 2 магнита → нарушение (максимум 1)", () => {
    const result = validateGiven([gm("Граб", 1), gm("Бук", 1)], 999, false, 999, noOwned);
    expect(result).not.toBeNull();
    expect(result).toMatch(/максимум 1/);
  });

  it("1500–2999 ₽, выдано 2×1⭐ → ok", () => {
    const result = validateGiven([gm("Граб", 1), gm("Бук", 1)], 2000, false, 2000, noOwned);
    expect(result).toBeNull();
  });

  it("1500–2999 ₽, выдан 1 магнит → нарушение (минимум 2)", () => {
    const result = validateGiven([gm("Граб", 1)], 2000, false, 2000, noOwned);
    expect(result).not.toBeNull();
    expect(result).toMatch(/минимум 2/);
  });

  it("3000–6999 ₽, выдан 1×2⭐ → ok", () => {
    const result = validateGiven([gm("Венге", 2)], 4000, false, 4000, noOwned);
    expect(result).toBeNull();
  });

  it("3000–6999 ₽, выдано 2×1⭐ → ok", () => {
    const result = validateGiven([gm("Граб", 1), gm("Бук", 1)], 4000, false, 4000, noOwned);
    expect(result).toBeNull();
  });

  it("3000–6999 ₽, выдан 1×3⭐ → нарушение (неверная комбинация)", () => {
    const result = validateGiven([gm("Тик", 3)], 4000, false, 4000, noOwned);
    expect(result).not.toBeNull();
  });

  it("7000 ₽, сумма < 10000, выдан 1×3⭐ → нарушение (нет доступа к 3⭐)", () => {
    const result = validateGiven([gm("Тик", 3)], 7000, false, 5000, noOwned);
    expect(result).not.toBeNull();
    expect(result).toMatch(/10 000/);
  });

  it("7000 ₽, сумма ≥ 10000, выдан 1×3⭐ → ok", () => {
    const result = validateGiven([gm("Тик", 3)], 7000, false, 15000, noOwned);
    expect(result).toBeNull();
  });

  it("7000 ₽, выдано 3×2⭐ → нарушение (максимум 2×2⭐ или 3×1⭐)", () => {
    const result = validateGiven(
      [gm("Венге", 2), gm("Мербау", 2), gm("Кедр", 2)],
      7000, false, 5000, noOwned
    );
    expect(result).not.toBeNull();
  });

  it("все 1⭐ собраны, 4000 ₽, выдан 1×1⭐ → нарушение", () => {
    const owned = new Set(ALL_1);
    const result = validateGiven([gm("Граб", 1)], 4000, false, 4000, owned);
    expect(result).not.toBeNull();
  });

  it("все 1⭐ собраны, 4000 ₽, выдан 1×2⭐ → ok", () => {
    const owned = new Set(ALL_1);
    const result = validateGiven([gm("Венге", 2)], 4000, false, 4000, owned);
    expect(result).toBeNull();
  });

  it("все 1⭐ и 2⭐ собраны, сумма ≥ 10000 → только 3⭐ допустимы", () => {
    const owned = new Set([...ALL_1, ...ALL_2]);
    const result2star = validateGiven([gm("Венге", 2)], 4000, false, 15000, owned);
    expect(result2star).not.toBeNull();
    const result3star = validateGiven([gm("Тик", 3)], 4000, false, 15000, owned);
    expect(result3star).toBeNull();
  });

  it("все 1⭐ и 2⭐ собраны, сумма < 10000 → нет допустимых вариантов (нет 3⭐)", () => {
    const owned = new Set([...ALL_1, ...ALL_2]);
    const options = calcRecommendedOptions(4000, false, 4000, owned);
    expect(options).toHaveLength(0);
  });
});