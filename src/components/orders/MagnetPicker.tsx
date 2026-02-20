import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { WOOD_BREEDS, STAR_LABELS } from "@/lib/store";
import { GIVE_MAGNET_URL, ADD_CLIENT_URL } from "../clients/types";
import { GET_REGISTRATIONS_URL } from "./types";
import { GivenMagnet, PickedBreed, calcRecommendedOptions, validateGiven } from "./magnetPickerLogic";
import MagnetRecommendations from "./MagnetRecommendations";
import MagnetBreedDropdown from "./MagnetBreedDropdown";
import MagnetNoGiftForm from "./MagnetNoGiftForm";

interface Props {
  registrationId: number;
  orderId: number;
  clientName: string;
  orderAmount: number;
  isFirstOrder: boolean;
  onDone: () => void;
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
  const [reshuffleKey, setReshuffleKey] = useState(0);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

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

  const givenBreeds = new Set(given.map((g) => g.breed));

  const availableBreeds = WOOD_BREEDS
    .filter((b) => !givenBreeds.has(b.breed) && !alreadyOwned.has(b.breed))
    .map((b) => ({ ...b, stock: inventory[b.breed] ?? 0 }))
    .sort((a, b) => b.stock - a.stock);

  const filtered = search.trim()
    ? availableBreeds.filter((b) => b.breed.toLowerCase().includes(search.toLowerCase()))
    : availableBreeds;

  const recommendedOptions = calcRecommendedOptions(orderAmount, isFirstOrder, clientTotal, alreadyOwned);

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

  const handleGiveAll = async (picks: Array<PickedBreed | null>) => {
    for (const pick of picks) {
      if (pick) await handleGive(pick.breed, pick.stars, pick.category);
    }
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
                <MagnetRecommendations
                  isFirstOrder={isFirstOrder}
                  options={recommendedOptions}
                  alreadyOwned={alreadyOwned}
                  givenBreeds={givenBreeds}
                  inventory={inventory}
                  given={given}
                  giving={giving}
                  alreadyOwnedSize={alreadyOwned.size}
                  reshuffleKey={reshuffleKey}
                  onGiveAll={handleGiveAll}
                  onReshuffle={() => setReshuffleKey((k) => k + 1)}
                />

                <MagnetBreedDropdown
                  filtered={filtered}
                  search={search}
                  dropdownOpen={dropdownOpen}
                  giving={giving}
                  onSearchChange={setSearch}
                  onToggle={() => setDropdownOpen((v) => !v)}
                  onClose={() => setDropdownOpen(false)}
                  onSelect={handleGive}
                />

                {validationWarning && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <Icon name="AlertTriangle" size={15} className="text-red-500 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-red-800">Нарушение правил акции</p>
                        <p className="text-xs text-red-700">{validationWarning}</p>
                        <p className="text-xs text-muted-foreground">Выданные: {given.map((g) => `${g.breed} ${STAR_LABELS[g.stars]}`).join(", ")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => setValidationWarning(null)}
                      >
                        <Icon name="ArrowLeft" size={13} />
                        Вернуться
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-red-500 hover:bg-red-600"
                        onClick={() => { setValidationWarning(null); onDone(); }}
                      >
                        <Icon name="Check" size={13} />
                        Всё равно подтвердить
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 gap-1.5"
                    disabled={given.length === 0 && !isFirstOrder}
                    onClick={() => {
                      const warning = validateGiven(given, orderAmount, isFirstOrder, clientTotal, alreadyOwned);
                      if (warning) { setValidationWarning(warning); } else { onDone(); }
                    }}
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
              <MagnetNoGiftForm
                comment={comment}
                savingComment={savingComment}
                onCommentChange={setComment}
                onBack={() => setMode("pick")}
                onSave={handleSaveComment}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MagnetPicker;