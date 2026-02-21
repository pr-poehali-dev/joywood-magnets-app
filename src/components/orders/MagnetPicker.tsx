import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { WOOD_BREEDS, STAR_LABELS } from "@/lib/store";
import { GIVE_MAGNET_URL, ADD_CLIENT_URL } from "../clients/types";
import { GET_REGISTRATIONS_URL } from "./types";
import { useInventory } from "@/hooks/useInventory";
import { GivenMagnet, PickedBreed, calcRecommendedOptions, validateGiven, pickWeightedOptionIndex } from "./magnetPickerLogic";
import MagnetRecommendations from "./MagnetRecommendations";
import MagnetBreedDropdown from "./MagnetBreedDropdown";
import MagnetNoGiftForm from "./MagnetNoGiftForm";

interface PendingBonus {
  count: number;
  type: string;
  reward: string;
}

interface Props {
  registrationId: number;
  orderId: number;
  clientName: string;
  orderAmount: number;
  isFirstOrder: boolean;
  isRegistered: boolean;
  pendingBonuses: PendingBonus[];
  onDone: () => void;
}

const MagnetPicker = ({ registrationId, orderId, clientName, orderAmount, isFirstOrder, isRegistered, pendingBonuses, onDone }: Props) => {
  const { stockMap: inventory, decrementStock, incrementStock } = useInventory();
  const [alreadyOwned, setAlreadyOwned] = useState<Set<string>>(new Set());
  const [alreadyOwnedLoaded, setAlreadyOwnedLoaded] = useState(false);
  const [clientTotal, setClientTotal] = useState(0);
  const [given, setGiven] = useState<GivenMagnet[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [giving, setGiving] = useState(false);
  const [mode, setMode] = useState<"pick" | "no_magnet">("pick");
  const [comment, setComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [reshuffleKey, setReshuffleKey] = useState(0);
  const [recommendedIndex, setRecommendedIndex] = useState(0);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [step, setStep] = useState<"magnets" | "bonuses">("magnets");
  const [givingBonus, setGivingBonus] = useState<string | null>(null);
  const [bonusesLeft, setBonusesLeft] = useState<PendingBonus[]>(pendingBonuses);

  useEffect(() => {
    fetch(`${GIVE_MAGNET_URL}?registration_id=${registrationId}`)
      .then((r) => r.json())
      .then((data) => {
        const breeds = new Set<string>((data.magnets || []).map((m: { breed: string }) => m.breed));
        setAlreadyOwned(breeds);
        setAlreadyOwnedLoaded(true);
      })
      .catch(() => { setAlreadyOwnedLoaded(true); });

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

  const recommendedOptions = useMemo(
    () => calcRecommendedOptions(orderAmount, isFirstOrder, clientTotal, alreadyOwned),
    [orderAmount, isFirstOrder, clientTotal, alreadyOwned]
  );

  // Пересчитываем рекомендованный вариант при перетасовке или смене числа доступных вариантов
  useEffect(() => {
    setRecommendedIndex(pickWeightedOptionIndex(recommendedOptions));
  // reshuffleKey намеренно в зависимостях — перетасовка меняет индекс
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reshuffleKey, recommendedOptions.length]);

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
      decrementStock(breed);
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

  const handleRemove = async (magnetId: number, breed: string) => {
    try {
      const res = await fetch(`${GIVE_MAGNET_URL}?magnet_id=${magnetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setGiven((prev) => prev.filter((g) => g.id !== magnetId));
      incrementStock(breed);
      toast.success(`${breed} убран`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка удаления");
    }
  };

  const handleGiveBonus = async (bonus: PendingBonus) => {
    const key = `${bonus.count}-${bonus.type}`;
    setGivingBonus(key);
    try {
      const res = await fetch(GIVE_MAGNET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "give_bonus",
          registration_id: registrationId,
          milestone_count: bonus.count,
          milestone_type: bonus.type,
          reward: bonus.reward,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setBonusesLeft((prev) => prev.filter((b) => !(b.count === bonus.count && b.type === bonus.type)));
      toast.success(`Бонус «${bonus.reward}» выдан`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка выдачи бонуса");
    } finally {
      setGivingBonus(null);
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

          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {step === "bonuses" ? (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                  <Icon name="Gift" size={16} className="text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-800">Клиент заработал бонус!</p>
                    <p className="text-xs text-orange-700 mt-0.5">Необходимо выдать все бонусы перед завершением</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {bonusesLeft.map((bonus) => {
                    const key = `${bonus.count}-${bonus.type}`;
                    return (
                      <div key={key} className="flex items-center justify-between gap-3 bg-white border border-orange-200 rounded-lg px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{bonus.reward}</p>
                          <p className="text-xs text-muted-foreground">
                            За {bonus.count} {bonus.type === "magnets" ? "магнитов" : "пород"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 shrink-0 gap-1"
                          disabled={givingBonus === key}
                          onClick={() => handleGiveBonus(bonus)}
                        >
                          {givingBonus === key
                            ? <Icon name="Loader2" size={13} className="animate-spin" />
                            : <Icon name="Gift" size={13} />}
                          Выдать
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 gap-1.5"
                  disabled={bonusesLeft.length > 0}
                  onClick={onDone}
                >
                  <Icon name="Check" size={15} />
                  {bonusesLeft.length > 0
                    ? `Выдайте все бонусы (${bonusesLeft.length} осталось)`
                    : "Готово — все бонусы выданы"}
                </Button>
              </>
            ) : mode === "pick" ? (
              <>
                {!isRegistered && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <Icon name="Info" size={15} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-800">Клиент не зарегистрирован в акции</p>
                      <p className="text-xs text-blue-700 mt-0.5">Магниты выдаются, но бонусы начисляются только после регистрации</p>
                    </div>
                  </div>
                )}

                {!alreadyOwnedLoaded ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    Загружаем коллекцию клиента...
                  </div>
                ) : (
                  <MagnetRecommendations
                    isFirstOrder={isFirstOrder}
                    options={recommendedOptions}
                    recommendedIndex={recommendedIndex}
                    alreadyOwned={alreadyOwned}
                    givenBreeds={givenBreeds}
                    inventory={inventory}
                    given={given}
                    giving={giving}
                    alreadyOwnedSize={alreadyOwned.size}
                    reshuffleKey={reshuffleKey}
                    onGive={(pick) => handleGive(pick.breed, pick.stars, pick.category)}
                    onGiveAll={handleGiveAll}
                    onReshuffle={() => setReshuffleKey((k) => k + 1)}
                    onRemove={handleRemove}
                  />
                )}

                {!isFirstOrder && (
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
                )}

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
                        onClick={() => {
                          setValidationWarning(null);
                          if (bonusesLeft.length > 0) { setStep("bonuses"); } else { onDone(); }
                        }}
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
                    disabled={given.length === 0 && !isFirstOrder && recommendedOptions.length > 0}
                    onClick={() => {
                      const warning = validateGiven(given, orderAmount, isFirstOrder, clientTotal, alreadyOwned);
                      if (warning) {
                        setValidationWarning(warning);
                      } else if (bonusesLeft.length > 0) {
                        setStep("bonuses");
                      } else {
                        onDone();
                      }
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