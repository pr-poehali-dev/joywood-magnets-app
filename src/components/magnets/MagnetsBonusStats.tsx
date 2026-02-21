import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

export interface BonusMilestoneStat {
  count: number;
  type: string;
  icon: string;
  reward: string;
  given: number;
  pending: number;
}

interface Props {
  bonusSummary: BonusMilestoneStat[];
  bonusStatsLoading: boolean;
}

const MagnetsBonusStats = ({ bonusSummary, bonusStatsLoading }: Props) => (
  <Card>
    <CardContent className="pt-4 pb-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Icon name="Award" size={15} className="text-orange-500" />
          Бонусы
        </p>
        {bonusStatsLoading && <Icon name="Loader2" size={14} className="animate-spin text-muted-foreground" />}
      </div>
      {bonusSummary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {bonusSummary.map((m, i) => (
            <div key={i} className={`rounded-lg border p-2.5 text-center ${m.pending > 0 ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="text-xl mb-1">{m.icon}</div>
              <div className="text-xs text-muted-foreground mb-1">{m.count} {m.type === "magnets" ? "магн." : "пород"}</div>
              <div className="flex justify-center gap-1 text-[11px]">
                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">выд: {m.given}</span>
                {m.pending > 0 && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium animate-pulse">ждут: {m.pending}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export default MagnetsBonusStats;
