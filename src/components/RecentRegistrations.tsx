import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Icon from "@/components/ui/icon";

const GET_REGISTRATIONS_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";

interface DayStat {
  date: string;
  ozon: number;
}

interface Summary {
  total: number;
  ozon: number;
  today: number;
  this_week: number;
}

interface Props {
  onNavigateToClient: (clientId: number) => void;
  onCountChange?: (count: number) => void;
}

const RecentRegistrations = ({ onCountChange }: Props) => {
  const [stats, setStats] = useState<DayStat[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${GET_REGISTRATIONS_URL}?action=registration_stats`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data.daily || []);
        setSummary(data.summary || null);
        setLastRefresh(new Date());
        onCountChange?.(data.summary?.today || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const chartData = stats.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Динамика регистраций с Ozon</h2>
          <p className="text-sm text-muted-foreground">
            Клиенты Ozon, которые зарегистрировались в акции · обновлено{" "}
            {lastRefresh.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={load} disabled={loading}>
          <Icon name={loading ? "Loader2" : "RefreshCw"} size={14} className={loading ? "animate-spin" : ""} />
          Обновить
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Всего с Ozon</p>
              <p className="text-2xl font-bold text-blue-600">{summary.ozon}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Сегодня</p>
              <p className="text-2xl font-bold text-green-600">{summary.today}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">За 7 дней</p>
              <p className="text-2xl font-bold text-orange-600">{summary.this_week}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Регистрации с Ozon по дням (последние 30 дней)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <Icon name="Loader2" size={32} className="animate-spin opacity-40" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Icon name="BarChart3" size={40} className="opacity-20 mb-2" />
              <p className="text-sm">Нет данных за период</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip
                  formatter={(value: number) => [value, "Регистраций с Ozon"]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="ozon" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecentRegistrations;
