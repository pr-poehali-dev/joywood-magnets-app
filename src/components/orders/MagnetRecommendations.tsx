import Icon from "@/components/ui/icon";
import { STAR_LABELS, BONUS_MILESTONES } from "@/lib/store";
import { starBg, RecommendedSlot, GivenMagnet } from "./magnetPickerLogic";

interface RecommendedPick {
  breed: string;
  stars: number;
  category: string;
  stock: number;
}

interface Props {
  isFirstOrder: boolean;
  recommendedSlots: RecommendedSlot[];
  recommendedPicks: Array<RecommendedPick | null>;
  hasRecommendations: boolean;
  given: GivenMagnet[];
  givenBreeds: Set<string>;
  giving: boolean;
  alreadyOwnedSize: number;
  onGiveRecommended: (pick: RecommendedPick | null) => void;
}

const MagnetRecommendations = ({
  isFirstOrder,
  recommendedSlots,
  recommendedPicks,
  hasRecommendations,
  given,
  givenBreeds,
  giving,
  alreadyOwnedSize,
  onGiveRecommended,
}: Props) => {
  const totalBreedsAfter = alreadyOwnedSize + given.length;
  const nextMilestone = BONUS_MILESTONES
    .filter((m) => m.type === "breeds")
    .find((m) => totalBreedsAfter < m.count);
  const breedsToNext = nextMilestone ? nextMilestone.count - totalBreedsAfter : null;

  const recommendationLabel = () => {
    if (isFirstOrder) return "Первый заказ — Падук выдан автоматически";
    const count = recommendedSlots.length;
    if (count === 0) return null;
    const stars = recommendedSlots.map((s) => STAR_LABELS[s.stars]).join(" + ");
    return `По правилам: ${count} магн. (${stars})`;
  };

  return (
    <>
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
                  onClick={() => onGiveRecommended(pick)}
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
