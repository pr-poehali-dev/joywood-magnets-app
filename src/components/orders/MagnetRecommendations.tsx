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
  onGiveAll: (picks: Array<PickedBreed | null>) => void;
  onReshuffle: () => void;
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
  onGiveAll,
  onReshuffle,
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
  }, [reshuffleKey, options, givenBreeds, inventory]); // reshuffleKey форсирует пересчёт случайных пород

  return (
    <>
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
            const hasAny = picks.some((p) => p !== null);
            return (
              <div
                key={oi}
                className={`border rounded-lg p-3 space-y-2 transition-all ${
                  hasAny && !giving
                    ? "bg-amber-50 border-amber-200 hover:border-amber-400 cursor-pointer"
                    : "bg-slate-50 border-slate-200 opacity-50"
                }`}
                onClick={() => hasAny && !giving && onGiveAll(picks)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-amber-900">{opt.label}</p>
                  {hasAny && !giving && (
                    <span className="text-[10px] text-amber-600 shrink-0 flex items-center gap-0.5">
                      <Icon name="MousePointerClick" size={11} />
                      выдать всё
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {picks.map((pick, pi) =>
                    pick ? (
                      <span
                        key={pi}
                        className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium ${starBg[pick.stars] ?? ""}`}
                      >
                        {pick.breed} {STAR_LABELS[pick.stars]}
                        <span className="text-[10px] opacity-50">· {pick.stock} шт</span>
                      </span>
                    ) : (
                      <span key={pi} className="text-xs text-muted-foreground italic">нет в наличии</span>
                    )
                  )}
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

      {nextMilestone && breedsToNext !== null && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-lg shrink-0">{nextMilestone.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-violet-800 truncate">{nextMilestone.reward}</p>
            <p className="text-[11px] text-violet-600">
              {breedsToNext === 0
                ? "Бонус достигнут на этом заказе!"
                : `До бонуса: ещё ${breedsToNext} ${breedsToNext === 1 ? "порода" : breedsToNext < 5 ? "породы" : "пород"} (сейчас ${totalBreedsAfter} из ${nextMilestone.count})`}
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
                className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium ${starBg[m.stars] ?? ""}`}
              >
                {m.breed} {STAR_LABELS[m.stars]}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MagnetRecommendations;
