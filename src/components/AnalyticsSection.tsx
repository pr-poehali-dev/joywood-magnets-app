import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { API_URLS } from "@/lib/api";
import { STAR_LABELS } from "@/lib/store";

interface ClientStat {
  id: number;
  name: string;
  phone: string;
  magnet_count: number;
  collection_value: number;
  star1: number;
  star2: number;
  star3: number;
}

interface AnalyticsData {
  top_by_count: ClientStat[];
  top_by_value: ClientStat[];
  distribution: Record<string, number>;
  total_given: number;
}

function formatDisplayName(name: string, phone: string): string {
  const cleanName = name.replace(/^\d+\s*/, "").trim() || "Без имени";
  const lastTwo = phone.replace(/\D/g, "").slice(-2);
  return `${cleanName} ···${lastTwo}`;
}

const STAR_BG: Record<number, string> = {
  1: "bg-amber-100 text-amber-800",
  2: "bg-orange-100 text-orange-800",
  3: "bg-red-100 text-red-800",
};

function ClientRow({
  client,
  rank,
  onSelect,
}: {
  client: ClientStat;
  rank: number;
  onSelect: (id: number) => void;
}) {
  const displayName = formatDisplayName(client.name, client.phone);

  return (
    <button
      onClick={() => onSelect(client.id)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-left group"
    >
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          rank === 1
            ? "bg-amber-400 text-white"
            : rank === 2
              ? "bg-slate-300 text-slate-700"
              : rank === 3
                ? "bg-orange-300 text-white"
                : "bg-slate-100 text-slate-500"
        }`}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-amber-700">
          {displayName}
        </p>
        <div className="flex gap-1.5 mt-0.5 flex-wrap">
          {client.star1 > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAR_BG[1]}`}>
              {STAR_LABELS[1]} ×{client.star1}
            </span>
          )}
          {client.star2 > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAR_BG[2]}`}>
              {STAR_LABELS[2]} ×{client.star2}
            </span>
          )}
          {client.star3 > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAR_BG[3]}`}>
              {STAR_LABELS[3]} ×{client.star3}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-foreground">{client.magnet_count} шт</p>
        <p className="text-[11px] text-muted-foreground">{client.collection_value.toLocaleString("ru-RU")} ₽</p>
      </div>
      <Icon name="ChevronRight" size={14} className="text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

interface Props {
  onNavigateToClient: (id: number) => void;
}

const AnalyticsSection = ({ onNavigateToClient }: Props) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTop, setActiveTop] = useState<"count" | "value">("count");

  const load = useCallback(() => {
    setLoading(true);
    fetch(API_URLS.ANALYTICS)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalGiven = data?.total_given ?? 0;
  const dist = data?.distribution ?? {};
  const star1 = dist["1"] ?? 0;
  const star2 = dist["2"] ?? 0;
  const star3 = dist["3"] ?? 0;

  const pct = (n: number) => totalGiven > 0 ? Math.round((n / totalGiven) * 100) : 0;

  const topList = activeTop === "count"
    ? (data?.top_by_count ?? [])
    : (data?.top_by_value ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Аналитика</h2>
          <p className="text-sm text-muted-foreground">Распределение магнитов и рейтинг коллекционеров</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="RefreshCw" size={14} className={loading ? "animate-spin" : ""} />
          Обновить
        </button>
      </div>

      {/* Распределение по категориям */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="PieChart" size={16} className="text-amber-600" />
          <h3 className="font-semibold text-sm">Выдано магнитов по категориям</h3>
          <span className="ml-auto text-xs text-muted-foreground">всего {totalGiven}</span>
        </div>

        {loading ? (
          <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div>
        ) : (
          <div className="space-y-3">
            {[
              { stars: 1, count: star1, label: "Обычные", color: "bg-amber-400" },
              { stars: 2, count: star2, label: "Особенные", color: "bg-orange-500" },
              { stars: 3, count: star3, label: "Элитные", color: "bg-red-500" },
            ].map(({ stars, count, label, color }) => (
              <div key={stars} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span>{STAR_LABELS[stars]}</span>
                    <span className="text-muted-foreground">{label}</span>
                  </span>
                  <span className="font-medium">{count} шт · {pct(count)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${pct(count)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && totalGiven > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            {[
              { label: "Обычные ⭐", value: star1, cost: star1 * 150, color: "text-amber-600" },
              { label: "Особенные ⭐⭐", value: star2, cost: star2 * 350, color: "text-orange-600" },
              { label: "Элитные ⭐⭐⭐", value: star3, cost: star3 * 700, color: "text-red-600" },
            ].map(({ label, value, cost, color }) => (
              <div key={label} className="text-center">
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                <p className="text-[10px] text-muted-foreground">{cost.toLocaleString("ru-RU")} ₽</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Топ клиентов */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <Icon name="Trophy" size={16} className="text-amber-600" />
          <h3 className="font-semibold text-sm">Топ коллекционеров</h3>
          <div className="ml-auto flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setActiveTop("count")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${activeTop === "count" ? "bg-white shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              По количеству
            </button>
            <button
              onClick={() => setActiveTop("value")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${activeTop === "value" ? "bg-white shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              По стоимости
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div>
        ) : topList.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Нет данных</div>
        ) : (
          <div className="divide-y">
            {topList.map((client, i) => (
              <ClientRow
                key={client.id}
                client={client}
                rank={i + 1}
                onSelect={onNavigateToClient}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsSection;
