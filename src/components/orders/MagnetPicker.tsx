import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { WOOD_BREEDS, STAR_LABELS, STAR_NAMES } from "@/lib/store";
import { GIVE_MAGNET_URL, ADD_CLIENT_URL } from "../clients/types";
import { GET_REGISTRATIONS_URL } from "./types";

interface GivenMagnet {
  id: number;
  breed: string;
  stars: number;
}

interface Props {
  registrationId: number;
  orderId: number;
  clientName: string;
  orderAmount: number;
  isFirstOrder: boolean;
  onDone: () => void;
}

const starBg: Record<number, string> = {
  1: "bg-amber-50 border-amber-200 text-amber-800",
  2: "bg-orange-50 border-orange-300 text-orange-800",
  3: "bg-red-50 border-red-300 text-red-800",
};

interface RecommendedSlot {
  stars: number;
  label: string;
}

/** Рассчитывает рекомендуемый набор магнитов по правилам акции */
function calcRecommendedSlots(
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
function pickBreeds(
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

const MagnetPicker = ({ registrationId, orderId, clientName, orderAmount, isFirstOrder, onDone }: Props) => {
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [alreadyOwned, setAlreadyOwned] = useState<Set<string>>(new Set());
  const [clientTotal, setClientTotal] = useState(0);
  const [given, setGiven] = useState<GivenMagnet[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [giving, setGiving] = useState(false);
  const [mode, setMode] = useState<"pick" | "no_magnet">("pick");
  const [comment, setComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${GIVE_MAGNET_URL}?action=inventory`)
      .then((r) => r.json())
      .then((data) => {
        const inv: Record<string, number> = {};
        for (const [breed, info] of Object.entries(data.inventory || {})) {
          inv[breed] = (info as { stock: number }).stock;
        }
        setInventory(inv);
      })
      .catch(() => {});

    fetch(`${GIVE_MAGNET_URL}?registration_id=${registrationId}`)
      .then((r) => r.json())
      .then((data) => {
        const breeds = new Set<string>((data.magnets || []).map((m: { breed: string }) => m.breed));
        setAlreadyOwned(breeds);
      })
      .catch(() => {});

    fetch(`${GET_REGISTRATIONS_URL}?action=client_orders&registration_id=${registrationId}`)
      .then((r) => r.json())
      .then((data) => {
        const orders: Array<{ amount: number; id: number }> = data.orders || [];
        const total = orders
          .filter((o) => o.id !== orderId)
          .reduce((sum, o) => sum + (o.amount || 0), 0);
        setClientTotal(total + orderAmount);
      })
      .catch(() => setClientTotal(orderAmount));
  }, [registrationId, orderId, orderAmount]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const givenBreeds = new Set(given.map((g) => g.breed));

  const availableBreeds = WOOD_BREEDS
    .filter((b) => !givenBreeds.has(b.breed) && !alreadyOwned.has(b.breed))
    .map((b) => ({ ...b, stock: inventory[b.breed] ?? 0 }))
    .sort((a, b) => b.stock - a.stock);

  const filtered = search.trim()
    ? availableBreeds.filter((b) => b.breed.toLowerCase().includes(search.toLowerCase()))
    : availableBreeds;

  const recommendedSlots = calcRecommendedSlots(orderAmount, isFirstOrder, clientTotal, alreadyOwned);
  const recommendedPicks = pickBreeds(recommendedSlots, alreadyOwned, givenBreeds, inventory);
  const hasRecommendations = !isFirstOrder && recommendedPicks.some((p) => p !== null);

  const handleGive = async (breed: string, stars: number, category: string) => {
    setGiving(true);
    try {
      const res = await fetch(GIVE_MAGNET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, breed, stars, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setGiven((prev) => [...prev, { id: data.id, breed, stars }]);
      setInventory((prev) => ({ ...prev, [breed]: Math.max((prev[breed] ?? 1) - 1, 0) }));
      setSearch("");
      setDropdownOpen(false);
      toast.success(`${breed} ${STAR_LABELS[stars]} выдан`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка выдачи магнита");
    } finally {
      setGiving(false);
    }
  };

  const handleGiveRecommended = async (pick: { breed: string; stars: number; category: string } | null) => {
    if (!pick) return;
    await handleGive(pick.breed, pick.stars, pick.category);
  };

  const handleSaveComment = async () => {
    if (!comment.trim()) {
      toast.error("Напишите причину невыдачи");
      return;
    }
    setSavingComment(true);
    try {
      const res = await fetch(ADD_CLIENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_magnet_comment", order_id: orderId, comment: comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Комментарий сохранён");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSavingComment(false);
    }
  };

  const recommendationLabel = () => {
    if (isFirstOrder) return "Первый заказ — Падук выдан автоматически";
    const count = recommendedSlots.length;
    if (count === 0) return null;
    const stars = recommendedSlots.map((s) => STAR_LABELS[s.stars]).join(" + ");
    return `По правилам: ${count} магн. (${stars})`;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-orange-200">
          <div className="bg-orange-500 rounded-t-xl px-5 py-4 flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <Icon name="Gift" size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-base">Выдача магнитов</p>
              <p className="text-orange-100 text-xs truncate">{clientName} — необходимо принять решение</p>
            </div>
            {orderAmount > 0 && (
              <div className="text-right shrink-0">
                <p className="text-orange-100 text-xs">Заказ</p>
                <p className="text-white font-bold text-sm">{orderAmount.toLocaleString("ru-RU")} ₽</p>
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            {mode === "pick" ? (
              <>
                {/* Рекомендации */}
                {hasRecommendations && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Icon name="Sparkles" size={14} className="text-amber-600 shrink-0" />
                      <p className="text-xs font-semibold text-amber-800">{recommendationLabel()}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recommendedPicks.map((pick, i) => {
                        if (!pick) {
                          return (
                            <span key={i} className="text-xs text-muted-foreground italic">
                              нет подходящей породы в наличии
                            </span>
                          );
                        }
                        const alreadyGiven = givenBreeds.has(pick.breed);
                        return (
                          <button
                            key={i}
                            disabled={alreadyGiven || giving}
                            onClick={() => handleGiveRecommended(pick)}
                            className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                              alreadyGiven
                                ? "opacity-50 cursor-default " + (starBg[pick.stars] ?? "")
                                : (starBg[pick.stars] ?? "") + " hover:ring-2 hover:ring-amber-400 cursor-pointer"
                            }`}
                          >
                            {alreadyGiven && <Icon name="Check" size={11} />}
                            {pick.breed} {STAR_LABELS[pick.stars]}
                            {!alreadyGiven && (
                              <span className="text-[10px] opacity-60">· {pick.stock} шт</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {recommendedPicks.every((p) => p === null) && (
                      <p className="text-xs text-amber-700">Рекомендованные породы закончились на складе — выберите вручную</p>
                    )}
                  </div>
                )}

                {isFirstOrder && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <Icon name="CheckCircle" size={16} className="text-green-600 shrink-0" />
                    <p className="text-sm text-green-800">Первый заказ — магнит <strong>Падук ⭐⭐</strong> выдан автоматически</p>
                  </div>
                )}

                {given.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Выданные магниты:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {given.map((m) => (
                        <span
                          key={m.id}
                          className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium ${starBg[m.stars] ?? ""}`}
                        >
                          {m.breed} {STAR_LABELS[m.stars]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative" ref={ref}>
                  <div
                    className="flex h-10 w-full items-center justify-between rounded-md border bg-slate-50 px-3 text-sm cursor-pointer hover:bg-slate-100"
                    onClick={() => setDropdownOpen((v) => !v)}
                  >
                    <span className="text-muted-foreground">Выбрать породу вручную...</span>
                    <Icon name="ChevronDown" size={14} className="text-muted-foreground shrink-0" />
                  </div>

                  {dropdownOpen && (
                    <div className="absolute z-[60] mt-1 w-full bg-white border rounded-md shadow-lg">
                      <div className="p-2 border-b">
                        <Input
                          autoFocus
                          placeholder="Поиск породы..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        {filtered.length === 0 && (
                          <div className="text-sm text-muted-foreground text-center py-3">Не найдено</div>
                        )}
                        {filtered.map((b) => {
                          const hasStock = b.stock > 0;
                          return (
                            <button
                              key={b.breed}
                              disabled={!hasStock || giving}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-2"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (hasStock) handleGive(b.breed, b.stars, b.category);
                              }}
                            >
                              <span>{STAR_LABELS[b.stars]} {b.breed} — {STAR_NAMES[b.stars]}</span>
                              <span className={`text-xs shrink-0 ${hasStock ? "text-green-600" : "text-red-500"}`}>
                                {b.stock} шт
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 gap-1.5"
                    disabled={given.length === 0 && !isFirstOrder}
                    onClick={onDone}
                  >
                    <Icon name="Check" size={15} />
                    {isFirstOrder
                      ? "Готово (Падук выдан)"
                      : given.length > 0
                        ? `Готово (${given.length} магн.)`
                        : "Готово"}
                  </Button>
                  <button
                    className="w-full text-xs text-muted-foreground hover:text-red-500 transition-colors py-1"
                    onClick={() => setMode("no_magnet")}
                  >
                    Не выдавать магнит (указать причину)
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <Icon name="AlertTriangle" size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">Укажите причину — она сохранится в истории заказа</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Причина невыдачи магнита</label>
                  <Textarea
                    autoFocus
                    placeholder="Например: клиент отказался, нет подходящей породы, уточнить позже..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setMode("pick")}
                  >
                    <Icon name="ArrowLeft" size={14} />
                    Назад
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 gap-1.5"
                    disabled={!comment.trim() || savingComment}
                    onClick={handleSaveComment}
                  >
                    {savingComment
                      ? <Icon name="Loader2" size={14} className="animate-spin" />
                      : <Icon name="Save" size={14} />
                    }
                    Сохранить и закрыть
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MagnetPicker;
