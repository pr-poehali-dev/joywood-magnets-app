import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ozon: number;
  today: number;
  this_week: number;
}

interface RegItem {
  id: number;
  name: string;
  phone: string;
  channel: string;
  registered: boolean;
  created_at: string;
  total_amount: number;
  orders_count: number;
}

interface Props {
  onNavigateToClient: (clientId: number) => void;
  onCountChange?: (count: number) => void;
}

const RecentRegistrations = ({ onNavigateToClient, onCountChange }: Props) => {
  const [stats, setStats] = useState<DayStat[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [registrations, setRegistrations] = useState<RegItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regsLoading, setRegsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [search, setSearch] = useState("");

  const loadStats = useCallback(() => {
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

  const loadRegistrations = useCallback(() => {
    setRegsLoading(true);
    fetch(`${GET_REGISTRATIONS_URL}?action=registrations`)
      .then((r) => r.json())
      .then((data) => setRegistrations(data.registrations || []))
      .catch(() => {})
      .finally(() => setRegsLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
    loadRegistrations();
  }, [loadStats, loadRegistrations]);

  const handleRefresh = () => {
    loadStats();
    loadRegistrations();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const chartData = stats.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  const filteredRegs = search.trim()
    ? registrations.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.name?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q) ||
          r.channel?.toLowerCase().includes(q)
        );
      })
    : registrations;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Регистрации</h2>
          <p className="text-sm text-muted-foreground">
            Клиенты, зарегистрировавшиеся в акции · обновлено{" "}
            {lastRefresh.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRefresh} disabled={loading}>
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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Icon name="UserCheck" size={20} className="text-orange-500" />
            Список зарегистрированных
          </h3>
          <div className="flex-1" />
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Имя, телефон, канал..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-52 text-sm"
            />
          </div>
          <Badge variant="secondary">{filteredRegs.length} клиентов</Badge>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиент</TableHead>
                <TableHead>Канал</TableHead>
                <TableHead className="text-right">Заказов</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {regsLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />
                    Загрузка...
                  </TableCell>
                </TableRow>
              )}
              {!regsLoading && filteredRegs.map((reg) => (
                <TableRow
                  key={reg.id}
                  className="hover:bg-orange-50/50 cursor-pointer transition-colors"
                  onClick={() => onNavigateToClient(reg.id)}
                >
                  <TableCell className="font-medium">
                    {reg.name || "—"}
                    {reg.phone && (
                      <span className="text-muted-foreground text-xs ml-1.5">{reg.phone}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{reg.channel || "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">{reg.orders_count}</TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {reg.total_amount > 0 ? `${reg.total_amount.toLocaleString("ru-RU")} ₽` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(reg.created_at).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Icon name="ChevronRight" size={16} className="text-muted-foreground/50" />
                  </TableCell>
                </TableRow>
              ))}
              {!regsLoading && filteredRegs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Icon name="UserCheck" size={40} className="mx-auto mb-3 opacity-30" />
                    {search ? "Ничего не найдено" : "Регистраций пока нет"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default RecentRegistrations;
