import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface PendingBonus {
  count: number;
  type: string;
  reward: string;
}

interface Props {
  bonusesLeft: PendingBonus[];
  givingBonus: string | null;
  bonusStock: Record<string, number>;
  onGiveBonus: (bonus: PendingBonus) => void;
  onDone: () => void;
}

const MagnetPickerBonusStep = ({ bonusesLeft, givingBonus, bonusStock, onGiveBonus, onDone }: Props) => (
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
        const stock = bonusStock[bonus.reward];
        const outOfStock = stock !== undefined && stock <= 0;
        return (
          <div key={key} className="flex items-center justify-between gap-3 bg-white border border-orange-200 rounded-lg px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{bonus.reward}</p>
              <p className="text-xs text-muted-foreground">
                За {bonus.count} {bonus.type === "magnets" ? "магнитов" : "пород"}
              </p>
              {outOfStock && (
                <p className="text-xs text-red-500 font-medium mt-0.5">Нет на складе — пополните остаток</p>
              )}
            </div>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 shrink-0 gap-1"
              disabled={givingBonus === key || outOfStock}
              onClick={() => onGiveBonus(bonus)}
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
      disabled={bonusesLeft.length > 0 && bonusesLeft.some((b) => {
        const stock = bonusStock[b.reward];
        return stock === undefined || stock > 0;
      })}
      onClick={onDone}
    >
      <Icon name="Check" size={15} />
      {bonusesLeft.length > 0
        ? `Выдайте все бонусы (${bonusesLeft.length} осталось)`
        : "Готово — все бонусы выданы"}
    </Button>
  </>
);

export default MagnetPickerBonusStep;