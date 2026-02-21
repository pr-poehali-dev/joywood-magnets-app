import { useMemo } from "react";
import Icon from "@/components/ui/icon";
import { STAR_LABELS, BONUS_MILESTONES } from "@/lib/store";
import { starBg, GivenMagnet, RecommendedOption, PickedBreed, pickBreedsForOption } from "./magnetPickerLogic";

interface Props {
  isFirstOrder: boolean;
  options: RecommendedOption[];
  alreadyOwned: Set<string>;
  givenBreeds: Set<string>;
  inventory: Record<string, number>;
  given: GivenMagnet[];
  giving: boolean;
  alreadyOwnedSize: number;
  reshuffleKey: number;
  onGive: (pick: PickedBreed) => void;
  onGiveAll: (picks: Array<PickedBreed | null>) => void;
  onReshuffle: () => void;
  onRemove: (magnetId: number, breed: string) => void;
}

const MagnetRecommendations = ({
  isFirstOrder,
  options,
  alreadyOwned,
  givenBreeds,
  inventory,
  given,
  giving,
  alreadyOwnedSize,
  reshuffleKey,
  onGive,
  onGiveAll,
  onReshuffle,
  onRemove,
}: Props) => {
  const totalBreedsAfter = alreadyOwnedSize + given.length;
  const nextMilestone = BONUS_MILESTONES
    .filter((m) => m.type === "breeds")
    .find((m) => totalBreedsAfter < m.count);
  const breedsToNext = nextMilestone ? nextMilestone.count - totalBreedsAfter : null;

  const hasOptions = !isFirstOrder && options.length > 0;

   
  const allPicks = useMemo(() => {
    return options.map((opt) =>
      pickBreedsForOption(opt.slots, alreadyOwned, givenBreeds, inventory)
    );
  }, [reshuffleKey, options, givenBreeds, inventory]);

  const allCollected = !isFirstOrder && options.length === 0;

  return (
    <>
      {allCollected && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <Icon name="Trophy" size={16} className="text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Клиент собрал все доступные магниты!</p>
            <p className="text-xs text-green-700 mt-0.5">По правилам акции на этот заказ магниты не выдаются</p>
          </div>
        </div>
      )}

      {hasOptions && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon name="Sparkles" size={13} className="text-amber-600 shrink-0" />
              <p className="text-xs font-semibold text-amber-800">Рекомендации по правилам акции</p>
            </div>
            {!giving && (
              <button
                onClick={onReshuffle}
                className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-800 transition-colors"
              >
                <Icon name="Shuffle" size={12} />
                Перетасовать
              </button>
            )}
          </div>

          {options.map((opt, oi) => {
            const picks = allPicks[oi] ?? [];
            const notYetGiven = picks.filter(
              (p) => p !== null && !givenBreeds.has(p.breed)
            ) as PickedBreed[];
            const allGiven = notYetGiven.length === 0 && picks.some((p) => p !== null);

            return (
              <div key={oi} className={`border rounded-lg p-3 space-y-2 ${
                allGiven ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-amber-900">{opt.label}</p>
                  {notYetGiven.length > 1 && !giving && (
                    <button
                      onClick={() => onGiveAll(notYetGiven)}
                      className="text-[10px] text-amber-700 hover:text-amber-900 border border-amber-300 rounded px-1.5 py-0.5 transition-colors shrink-0"
                    >
                      выдать все
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {picks.map((pick, pi) => {
                    if (!pick) {
                      return (
                        <span key={pi} className="text-xs text-muted-foreground italic">нет в наличии</span>
                      );
                    }
                    const isGiven = givenBreeds.has(pick.breed);
                    return (
                      <button
                        key={pi}
                        disabled={isGiven || giving}
                        onClick={() => !isGiven && !giving && onGive(pick)}
                        className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                          isGiven
                            ? "opacity-60 cursor-default " + (starBg[pick.stars] ?? "")
                            : (starBg[pick.stars] ?? "") + " hover:ring-2 hover:ring-amber-400 cursor-pointer"
                        }`}
                      >
                        {isGiven ? <Icon name="Check" size={10} /> : <Icon name="Plus" size={10} />}
                        {pick.breed} {STAR_LABELS[pick.stars]}
                        {!isGiven && <span className="text-[10px] opacity-50">· {pick.stock} шт</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isFirstOrder && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <Icon name="CheckCircle" size={16} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-800">Первый заказ — магнит <strong>Падук ⭐⭐</strong> выдан автоматически</p>
        </div>
      )}

      {nextMilestone && breedsToNext !== null && breedsToNext <= 3 && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-lg shrink-0">{nextMilestone.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-violet-800 truncate">{nextMilestone.reward}</p>
            <p className="text-[11px] text-violet-600">
              {breedsToNext === 0
                ? "Бонус достигнут на этом заказе! 🎉"
                : `До бонуса ещё ${breedsToNext} ${breedsToNext === 1 ? "порода" : "породы"}`}
            </p>
          </div>
        </div>
      )}

      {given.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Выданные магниты:</p>
          <div className="flex flex-wrap gap-1.5">
            {given.map((m) => (
              <span
                key={m.id}
                className={`inline-flex items-center gap-1 border rounded-full pl-2.5 pr-1 py-1 text-xs font-medium ${starBg[m.stars] ?? ""}`}
              >
                {m.breed} {STAR_LABELS[m.stars]}
                <button
                  onClick={() => onRemove(m.id, m.breed)}
                  className="ml-0.5 rounded-full hover:bg-black/10 p-0.5 transition-colors"
                  title="Убрать"
                >
                  <Icon name="X" size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MagnetRecommendations;