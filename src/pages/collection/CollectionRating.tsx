import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { Rating, RatingEntry } from "./types";

interface Props {
  rating: Rating;
  totalMagnets: number;
}

const medals = ["🥇", "🥈", "🥉"];

export const renderTop = (
  list: RatingEntry[],
  myRank: number,
  valueKey: "total_magnets" | "collection_value",
  label: string,
  myValue: number,
  myRegId?: number
) => {
  const myIndexInTop = myRegId != null ? list.findIndex((e) => e.id === myRegId) : -1;
  const isInTop = myIndexInTop !== -1;
  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>}
      <div className="space-y-1.5">
        {list.map((entry, i) => {
          const isMe = isInTop && i === myIndexInTop;
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
                  : `${(entry.collection_value ?? 0).toLocaleString("ru-RU")} ₽`}
              </span>
            </div>
          );
        })}
        {!isInTop && myRank != null && (
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

const CollectionRating = ({ rating, totalMagnets }: Props) => {
  const { rank_magnets, rank_value, total_participants, my_collection_value, my_reg_id, top_magnets = [], top_value = [] } = rating;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon name="Trophy" size={18} className="text-gold-500" />
          Рейтинг среди {total_participants} участников
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
        {renderTop(top_magnets, rank_magnets, "total_magnets", "По количеству магнитов", totalMagnets, my_reg_id)}
        {renderTop(top_value, rank_value, "collection_value", "По стоимости коллекции", my_collection_value, my_reg_id)}
      </CardContent>
    </Card>
  );
};

export default CollectionRating;