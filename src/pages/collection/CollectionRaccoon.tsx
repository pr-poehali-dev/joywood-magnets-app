import { getRaccoonLevel } from "@/lib/raccoon";
import { RaccoonData } from "./types";

interface Props {
  raccoon: RaccoonData;
}

const CollectionRaccoon = ({ raccoon }: Props) => {
  const raccoonLevel = getRaccoonLevel(raccoon.level);
  const pct = raccoon.is_max_level
    ? 100
    : Math.min(100, Math.round((raccoon.xp_for_level / raccoon.xp_needed) * 100));

  return (
    <div className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden flex flex-col">
      {/* Фото 3:4 */}
      <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
        {raccoonLevel.photoUrl ? (
          <img
            src={raccoonLevel.photoUrl}
            alt={raccoonLevel.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-amber-100 flex items-center justify-center">
            <span className="text-7xl">🦝</span>
          </div>
        )}
        {/* Бейдж уровня поверх фото */}
        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
          Ур.{raccoon.level}
        </div>
      </div>

      {/* Информация */}
      <div className="px-3 py-3 space-y-2">
        <div className="font-bold text-amber-900 text-sm leading-tight">{raccoon.level_name}</div>

        <div>
          <div className="flex justify-between text-[11px] text-amber-700 mb-1">
            <span>{raccoon.xp} XP</span>
            {raccoon.is_max_level ? (
              <span className="text-amber-500 font-semibold">Макс. уровень!</span>
            ) : (
              <span>{raccoon.xp_for_level}/{raccoon.xp_needed}</span>
            )}
          </div>
          <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionRaccoon;
