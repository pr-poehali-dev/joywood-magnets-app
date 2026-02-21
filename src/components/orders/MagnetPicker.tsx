import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { WOOD_BREEDS, STAR_LABELS, BONUS_MILESTONES } from "@/lib/store";
import { GIVE_MAGNET_URL, ADD_CLIENT_URL } from "../clients/types";
import { GET_REGISTRATIONS_URL } from "./types";
import { useInventory } from "@/hooks/useInventory";
import { GivenMagnet, PickedBreed, calcRecommendedOptions, validateGiven, pickWeightedOptionIndex } from "./magnetPickerLogic";
import MagnetPickerHeader from "./MagnetPickerHeader";
import MagnetPickerBonusStep from "./MagnetPickerBonusStep";
import MagnetPickerMagnetsStep from "./MagnetPickerMagnetsStep";

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
  const [clientTotalLoaded, setClientTotalLoaded] = useState(false);
  const [given, setGiven] = useState<GivenMagnet[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [giving, setGiving] = useState(false);
  const [pendingPicks, setPendingPicks] = useState<Array<{ breed: string; stars: number; category: string }>>([]);
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
        setClientTotalLoaded(true);
      })
      .catch(() => { setClientTotal(orderAmount); setClientTotalLoaded(true); });
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

  const calcNewBonuses = (newGiven: GivenMagnet[], currentBonusesLeft: PendingBonus[]): PendingBonus[] => {
    if (!isRegistered) return [];
    const totalMagnets = alreadyOwned.size + newGiven.length;
    const uniqueBreeds = new Set([...alreadyOwned, ...newGiven.map((g) => g.breed)]).size;
    const alreadyInBonuses = new Set(currentBonusesLeft.map((b) => `${b.count}-${b.type}`));
    const alreadyInPending = new Set(pendingBonuses.map((b) => `${b.count}-${b.type}`));
    const newBonuses: PendingBonus[] = [];
    for (const m of BONUS_MILESTONES) {
      const key = `${m.count}-${m.type}`;
      const current = m.type === "magnets" ? totalMagnets : uniqueBreeds;
      if (current >= m.count && !alreadyInBonuses.has(key) && !alreadyInPending.has(key)) {
        newBonuses.push({ count: m.count, type: m.type, reward: m.reward });
      }
    }
    return newBonuses;
  };

  const checkNewBonuses = (newGiven: GivenMagnet[]) => {
    const newBonuses = calcNewBonuses(newGiven, bonusesLeft);
    if (newBonuses.length > 0) {
      setBonusesLeft((prev) => [...prev, ...newBonuses]);
    }
  };

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
      const newGiven = [...given, { id: data.id, breed, stars }];
      setGiven(newGiven);
      checkNewBonuses(newGiven);
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

  const handleSelectPick = (breed: string, stars: number, category: string) => {
    setPendingPicks((prev) => {
      if (prev.some((p) => p.breed === breed)) return prev;
      return [...prev, { breed, stars, category }];
    });
  };

  const handleSelectAll = (picks: Array<PickedBreed | null>) => {
    setPendingPicks((prev) => {
      const next = [...prev];
      for (const p of picks) {
        if (p && !next.some((x) => x.breed === p.breed)) {
          next.push({ breed: p.breed, stars: p.stars, category: p.category });
        }
      }
      return next;
    });
  };

  const handleRemovePending = (breed: string) => {
    setPendingPicks((prev) => prev.filter((p) => p.breed !== breed));
  };

  const givePendingToBackend = async (picks: Array<{ breed: string; stars: number; category: string }>): Promise<GivenMagnet[]> => {
    const confirmed: GivenMagnet[] = [...given];
    for (const pick of picks) {
      const res = await fetch(GIVE_MAGNET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, breed: pick.breed, stars: pick.stars, category: pick.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      confirmed.push({ id: data.id, breed: pick.breed, stars: pick.stars });
      decrementStock(pick.breed);
      toast.success(`${pick.breed} ${STAR_LABELS[pick.stars]} выдан`);
    }
    return confirmed;
  };

  const handleConfirm = async () => {
    const allToGive = [...given, ...pendingPicks.map((p, i) => ({ id: i, breed: p.breed, stars: p.stars }))];
    const warning = validateGiven(allToGive, orderAmount, isFirstOrder, clientTotal, alreadyOwned);
    if (warning) {
      setValidationWarning(warning);
      return;
    }
    let finalGiven = given;
    if (pendingPicks.length > 0) {
      setGiving(true);
      try {
        const confirmed = await givePendingToBackend(pendingPicks);
        setGiven(confirmed);
        setPendingPicks([]);
        setGiving(false);
        finalGiven = confirmed;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ошибка выдачи");
        setGiving(false);
        return;
      }
    }
    const newBonuses = calcNewBonuses(finalGiven, bonusesLeft);
    const totalBonuses = [...bonusesLeft, ...newBonuses];
    if (newBonuses.length > 0) setBonusesLeft(totalBonuses);
    if (totalBonuses.length > 0) {
      setStep("bonuses");
    } else {
      onDone();
    }
  };

  const handleForceConfirm = async () => {
    setValidationWarning(null);
    let finalGiven = given;
    if (pendingPicks.length > 0) {
      setGiving(true);
      try {
        const confirmed = await givePendingToBackend(pendingPicks);
        setGiven(confirmed);
        setPendingPicks([]);
        finalGiven = confirmed;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ошибка");
        setGiving(false);
        return;
      }
      setGiving(false);
    }
    const newBonuses = calcNewBonuses(finalGiven, bonusesLeft);
    const totalBonuses = [...bonusesLeft, ...newBonuses];
    if (newBonuses.length > 0) setBonusesLeft(totalBonuses);
    if (totalBonuses.length > 0) { setStep("bonuses"); } else { onDone(); }
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
          <MagnetPickerHeader clientName={clientName} orderAmount={orderAmount} />

          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {step === "bonuses" ? (
              <MagnetPickerBonusStep
                bonusesLeft={bonusesLeft}
                givingBonus={givingBonus}
                onGiveBonus={handleGiveBonus}
                onDone={onDone}
              />
            ) : (
              <MagnetPickerMagnetsStep
                isFirstOrder={isFirstOrder}
                isRegistered={isRegistered}
                alreadyOwnedLoaded={alreadyOwnedLoaded && clientTotalLoaded}
                mode={mode}
                giving={giving}
                given={given}
                pendingPicks={pendingPicks}
                pendingBreeds={new Set(pendingPicks.map((p) => p.breed))}
                givenBreeds={givenBreeds}
                alreadyOwned={alreadyOwned}
                inventory={inventory}
                recommendedOptions={recommendedOptions}
                recommendedIndex={recommendedIndex}
                reshuffleKey={reshuffleKey}
                validationWarning={validationWarning}
                comment={comment}
                savingComment={savingComment}
                filtered={filtered}
                search={search}
                dropdownOpen={dropdownOpen}
                onSelectPick={handleSelectPick}
                onSelectAll={handleSelectAll}
                onRemovePending={handleRemovePending}
                onGive={handleGive}
                onRemove={handleRemove}
                onReshuffle={() => setReshuffleKey((k) => k + 1)}
                onConfirm={handleConfirm}
                onForceConfirm={handleForceConfirm}
                onClearWarning={() => setValidationWarning(null)}
                onSetMode={setMode}
                onCommentChange={setComment}
                onSaveComment={handleSaveComment}
                onSearchChange={setSearch}
                onDropdownToggle={() => setDropdownOpen((v) => !v)}
                onDropdownClose={() => setDropdownOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MagnetPicker;