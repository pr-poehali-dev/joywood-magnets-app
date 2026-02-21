import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { WOOD_BREEDS, BONUS_MILESTONES } from "@/lib/store";
import { CollectionData, RatingEntry } from "./types";

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

  const medals = ["🥇", "🥈", "🥉"];

  const renderTop = (
    list: RatingEntry[],
    myRank: number,
    valueKey: "total_magnets" | "collection_value",
    label: string,
    myValue: number
  ) => {
    const isTop = myRank <= 3;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="space-y-1.5">
          {list.map((entry, i) => {
            const isMe = isTop && i + 1 === myRank;
            return (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isMe ? "bg-gold-100 border border-gold-300 font-semibold" : "bg-slate-50 border border-slate-200"
                }`}
              >
                <span className="text-base w-6 text-center">{medals[i]}</span>
                <span className="flex-1 truncate">{isMe ? "Вы" : entry.name.replace(/^\d+\s+/, "")}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {valueKey === "total_magnets"
                    ? `${entry.total_magnets} магн.`
                    : `${entry.collection_value.toLocaleString("ru-RU")} ₽`}
                </span>
              </div>
            );
          })}
          {!isTop && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-gold-100 border border-gold-300 font-semibold">
              <span className="text-base w-6 text-center">#{myRank}</span>
              <span className="flex-1">Вы</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {valueKey === "total_magnets"
                  ? `${myValue} магн.`
                  : `${myValue.toLocaleString("ru-RU")} ₽`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

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

      {data.rating && (() => {
        const { rank_magnets, rank_value, total_participants, my_collection_value, top_magnets = [], top_value = [] } = data.rating;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="Trophy" size={18} className="text-gold-500" />
                Рейтинг среди {total_participants} участников
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {renderTop(top_magnets, rank_magnets, "total_magnets", "По количеству магнитов", data.total_magnets)}
              {renderTop(top_value, rank_value, "collection_value", "По стоимости коллекции", my_collection_value)}
            </CardContent>
          </Card>
        );
      })()}

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