import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";
import { BONUS_MILESTONES } from "@/lib/store";
import { CollectionData } from "./types";

interface Props {
  data: CollectionData;
}

const CollectionBonusProgress = ({ data }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon name="Award" size={18} className="text-orange-500" />
          Прогресс бонусов
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {BONUS_MILESTONES.map((milestone) => {
          const current = milestone.type === "magnets" ? data.total_magnets : data.unique_breeds;
          const pct = Math.min((current / milestone.count) * 100, 100);
          const reached = current >= milestone.count;
          const given = (data.bonuses || []).some(
            (b) => b.milestone_count === milestone.count && b.milestone_type === milestone.type
          );
          return (
            <div key={milestone.count + milestone.type} className="space-y-1">
              <div className="flex justify-between items-center text-sm gap-2">
                <span className={`flex items-center gap-1.5 ${reached ? "font-medium text-green-700" : "text-muted-foreground"}`}>
                  {milestone.icon} {milestone.reward}
                  {given && (
                    <Badge className="bg-green-100 text-green-800 border border-green-200 text-[10px] py-0 px-1.5">Получен</Badge>
                  )}
                  {reached && !given && (
                    <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] py-0 px-1.5 animate-pulse">Ожидает выдачи</Badge>
                  )}
                </span>
                {!reached && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {current}/{milestone.count}
                  </span>
                )}
              </div>
              {!reached && <Progress value={pct} className="h-2" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default CollectionBonusProgress;
