import { Card, CardContent } from "@/components/ui/card";
import { getRaccoonLevel } from "@/lib/raccoon";
import { RaccoonData } from "./types";

interface Props {
  raccoon: RaccoonData;
}

const CollectionRaccoon = ({ raccoon }: Props) => {
  const raccoonLevel = getRaccoonLevel(raccoon.level);

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 bg-amber-100 flex items-center justify-center shrink-0">
            {raccoonLevel.photoUrl ? (
              <img src={raccoonLevel.photoUrl} alt={raccoonLevel.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">🦝</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest">
                Ур.{raccoon.level}
              </span>
              <span className="text-sm font-bold text-amber-900 truncate">{raccoon.level_name}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-amber-700">
                <span>{raccoon.xp} XP</span>
                {!raccoon.is_max_level ? (
                  <span>{raccoon.xp_for_level} / {raccoon.xp_needed} до ур.{raccoon.level + 1}</span>
                ) : (
                  <span>Максимальный уровень!</span>
                )}
              </div>
              <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-700"
                  style={{
                    width: raccoon.is_max_level
                      ? "100%"
                      : `${Math.min(100, Math.round((raccoon.xp_for_level / raccoon.xp_needed) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionRaccoon;
