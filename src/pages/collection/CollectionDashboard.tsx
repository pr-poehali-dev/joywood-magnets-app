import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { WOOD_BREEDS, BONUS_MILESTONES } from "@/lib/store";
import { CollectionData } from "./types";

const TOTAL_BREEDS = WOOD_BREEDS.length;

interface Props {
  data: CollectionData;
  onReset: () => void;
}

const CollectionDashboard = ({ data, onReset }: Props) => {
  const n = data.total_magnets;
  const nextMilestone = BONUS_MILESTONES.find((m) =>
    (m.type === "magnets" ? data.total_magnets : data.unique_breeds) < m.count
  );
  const motivation =
    n === 1
      ? { emoji: "🌱", title: "Коллекция началась!", text: "У вас первый магнит — Падук. Каждая новая покупка в Joywood приносит новый образец редкой породы дерева." }
      : n < 5
      ? { emoji: "🌿", title: "Коллекция растёт", text: `Уже ${n} породы в коллекции. Ещё ${5 - n} магнита — и получите первый подарок от Joywood.` }
      : nextMilestone
      ? { emoji: "🏅", title: "Вы на пути к награде", text: `До следующего приза — «${nextMilestone.reward}» — осталось совсем немного. Продолжайте покупать!` }
      : { emoji: "👑", title: "Невероятная коллекция!", text: "Вы собрали редчайшие породы дерева. Вы — настоящий знаток Joywood." };

  const anyBonusReached =
    data.total_magnets > 0 &&
    (data.bonuses || []).length === 0 &&
    BONUS_MILESTONES.some((m) => {
      const cur = m.type === "magnets" ? data.total_magnets : data.unique_breeds;
      return cur >= m.count;
    });

  return (
    <>
      <Card className="border-gold-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gold-100 rounded-full p-2">
              <Icon name="User" size={20} className="text-gold-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg">{data.client_name.replace(/^\d+\s+/, "")}</div>
              <div className="text-xs text-muted-foreground/50 tracking-widest">
                {data.phone.replace(/\d(?=\d{4})/g, "•")}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1.5"
              onClick={onReset}
            >
              <Icon name="LogOut" size={15} />
              Выйти
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gold-600">{data.total_magnets}</div>
              <div className="text-xs text-muted-foreground">Всего магнитов</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gold-600">{data.unique_breeds}</div>
              <div className="text-xs text-muted-foreground">Уникальных пород</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gold-600">{TOTAL_BREEDS - data.unique_breeds}</div>
              <div className="text-xs text-muted-foreground">Осталось собрать</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl bg-gradient-to-r from-gold-50 to-amber-50 border border-gold-200 p-4 flex gap-3 items-start">
        <span className="text-2xl leading-none mt-0.5">{motivation.emoji}</span>
        <div>
          <div className="font-semibold text-gold-900 text-sm">{motivation.title}</div>
          <div className="text-sm text-gold-700 mt-0.5 leading-relaxed">{motivation.text}</div>
        </div>
      </div>

      {anyBonusReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
          <span className="text-xl shrink-0">ℹ️</span>
          <div>
            <p className="font-semibold text-amber-900 text-sm">Бонусы не выдавались</p>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
              До вашей регистрации в коллекции накопленные магниты не давали право на бонус. Теперь, когда вы
              зарегистрированы, при следующем заказе мы добавим к нему эти бонусы.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CollectionDashboard;