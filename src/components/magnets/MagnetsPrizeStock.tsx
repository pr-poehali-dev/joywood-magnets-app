import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { BONUS_MILESTONES } from "@/lib/store";

interface Props {
  bonusStock: Record<string, number>;
  editingBonus: string | null;
  editBonusStock: string;
  savingBonus: boolean;
  onEditStart: (reward: string, current: number) => void;
  onEditChange: (v: string) => void;
  onEditSave: (reward: string) => void;
  onEditCancel: () => void;
}

const MagnetsPrizeStock = ({
  bonusStock,
  editingBonus,
  editBonusStock,
  savingBonus,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: Props) => (
  <Card>
    <CardContent className="pt-4 pb-3">
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Icon name="Gift" size={15} className="text-orange-500" />
        Остатки призов
      </p>
      <div className="divide-y">
        {BONUS_MILESTONES.map((m) => {
          const stock = bonusStock[m.reward] ?? 0;
          const isEditing = editingBonus === m.reward;
          return (
            <div key={m.reward} className="flex items-center gap-2 py-1.5">
              <span className="text-base shrink-0">{m.icon}</span>
              <span className="text-sm flex-1 min-w-0 truncate">{m.reward}</span>
              <div className="shrink-0 flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Input
                      type="number"
                      min="0"
                      className="h-6 w-16 text-xs text-right px-1.5"
                      value={editBonusStock}
                      onChange={(e) => onEditChange(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onEditSave(m.reward);
                        if (e.key === "Escape") onEditCancel();
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={savingBonus} onClick={() => onEditSave(m.reward)}>
                      {savingBonus ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Check" size={11} className="text-green-600" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEditCancel}>
                      <Icon name="X" size={11} className="text-muted-foreground" />
                    </Button>
                  </>
                ) : (
                  <button
                    className={`text-xs font-semibold px-2 py-0.5 rounded hover:bg-slate-100 transition-colors flex items-center gap-1 ${stock === 0 ? "text-red-600" : stock <= 2 ? "text-yellow-600" : "text-green-700"}`}
                    onClick={() => onEditStart(m.reward, stock)}
                  >
                    {stock === 0 && <Icon name="AlertTriangle" size={10} />}
                    {stock} шт
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </CardContent>
  </Card>
);

export default MagnetsPrizeStock;
