import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Icon from "@/components/ui/icon";

const GET_REGISTRATIONS_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";

interface DayStat { date: string; ozon: number; }
interface Summary { ozon: number; today: number; this_week: number; }
interface RegItem {
  id: number; name: string; phone: string; channel: string;
  registered: boolean; created_at: string; total_amount: number; orders_count: number;
}
interface AttentionClient {
  id: number; name: string; phone: string; ozon_order_code: string;
  created_at: string; magnet_count: number; order_count: number;
}
interface LogItem {
  id: number; phone: string; event: string; details: string; created_at: string;
}

interface Props {
  onNavigateToClient: (clientId: number) => void;
  onCountChange?: (count: number) => void;
}

const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  not_found:            { label: "Номер не найден",         color: "text-amber-600 bg-amber-50 border-amber-200",  icon: "SearchX" },
  ozon_code_not_matched:{ label: "Код Ozon не совпал",      color: "text-red-600 bg-red-50 border-red-200",        icon: "AlertCircle" },
  registered_merged:    { label: "Регистрация (Ozon ✓)",    color: "text-green-600 bg-green-50 border-green-200",  icon: "UserCheck" },
  registered_new:       { label: "Регистрация (новый)",     color: "text-blue-600 bg-blue-50 border-blue-200",     icon: "UserPlus" },
};

const RecentRegistrations = ({ onNavigateToClient, onCountChange }: Props) => {
  const [tab, setTab] = useState<"list" | "attention" | "log">("list");
  const [stats, setStats] = useState<DayStat[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [registrations, setRegistrations] = useState<RegItem[]>([]);
  const [attentionClients, setAttentionClients] = useState<AttentionClient[]>([]);
  const [logItems, setLogItems] = useState<LogItem[]>([]);
  const [logCounts, setLogCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [regsLoading, setRegsLoading] = useState(true);
  const [attentionLoading, setAttentionLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
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
    fetch(`${GET_REGISTRATIONS_URL}?action=recent_registrations`)
      .then((r) => r.json())
      .then((data) => setRegistrations(data.registrations || []))
      .catch(() => {})
      .finally(() => setRegsLoading(false));
  }, []);

  const loadAttention = useCallback(() => {
    setAttentionLoading(true);
    fetch(`${GET_REGISTRATIONS_URL}?action=attention_clients`)
      .then((r) => r.json())
      .then((data) => setAttentionClients(data.clients || []))
      .catch(() => {})
      .finally(() => setAttentionLoading(false));
  }, []);

  const loadLog = useCallback(() => {
    setLogLoading(true);
    fetch(`${GET_REGISTRATIONS_URL}?action=lookup_log&limit=200`)
      .then((r) => r.json())
      .then((data) => { setLogItems(data.log || []); setLogCounts(data.counts_7d || {}); })
      .catch(() => {})
      .finally(() => setLogLoading(false));
  }, []);

  useEffect(() => { loadStats(); loadRegistrations(); }, [loadStats, loadRegistrations]);

  useEffect(() => {
    if (tab === "attention") loadAttention();
    if (tab === "log") loadLog();
  }, [tab, loadAttention, loadLog]);

  const handleRefresh = useCallback(() => {
    loadStats();
    loadRegistrations();
    if (tab === "attention") loadAttention();
    if (tab === "log") loadLog();
  }, [loadStats, loadRegistrations, loadAttention, loadLog, tab]);

  const formatDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }, []);

  const formatDateTime = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }, []);

  const chartData = useMemo(() => stats.map((d) => ({ ...d, label: formatDate(d.date) })), [stats, formatDate]);

  const filteredRegs = useMemo(() => search.trim()
    ? registrations.filter((r) => {
        const q = search.toLowerCase();
        return r.name?.toLowerCase().includes(q) || r.phone?.toLowerCase().includes(q);
      })
    : registrations, [registrations, search]);

  const attentionCount = attentionClients.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Регистрации</h2>
          <p className="text-sm text-muted-foreground">
            Обновлено {lastRefresh.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
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
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip formatter={(value: number) => [value, "Регистраций с Ozon"]} labelStyle={{ fontWeight: 600 }} />
                <Bar dataKey="ozon" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Вкладки */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("list")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "list" ? "border-orange-500 text-orange-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Зарегистрированные
          <Badge variant="secondary" className="ml-2 text-xs">{registrations.length}</Badge>
        </button>
        <button
          onClick={() => setTab("attention")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === "attention" ? "border-red-500 text-red-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Icon name="AlertTriangle" size={14} />
          Требуют внимания
          {attentionCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {attentionCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("log")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "log" ? "border-slate-500 text-slate-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Лог активности
        </button>
      </div>

      {/* Зарегистрированные */}
      {tab === "list" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Имя или телефон..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-52 text-sm" />
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Канал</TableHead>
                  <TableHead className="text-right">Заказов</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {regsLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground"><Icon name="Loader2" size={24} className="mx-auto animate-spin opacity-40" /></TableCell></TableRow>
                )}
                {!regsLoading && filteredRegs.map((reg) => (
                  <TableRow key={reg.id} className="hover:bg-orange-50/50 cursor-pointer" onClick={() => onNavigateToClient(reg.id)}>
                    <TableCell className="font-medium">
                      <p>{reg.name}</p>
                      <p className="text-xs text-muted-foreground">{reg.phone}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{reg.channel || '—'}</Badge></TableCell>
                    <TableCell className="text-right text-sm">{reg.orders_count || 0}</TableCell>
                    <TableCell className="text-right text-sm">{reg.total_amount ? `${reg.total_amount.toLocaleString('ru-RU')} ₽` : '—'}</TableCell>
                    <TableCell className="text-sm">{formatDate(reg.created_at)}</TableCell>
                    <TableCell><Icon name="ArrowUpRight" size={14} className="text-orange-500" /></TableCell>
                  </TableRow>
                ))}
                {!regsLoading && filteredRegs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Нет результатов</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Требуют внимания */}
      {tab === "attention" && (
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5">
            <Icon name="AlertTriangle" size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Клиенты зарегистрированы в акции, но не получили ни одного магнита. Возможно, заказ не оформлен или был удалён.
            </p>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Код Ozon</TableHead>
                  <TableHead className="text-right">Заказов</TableHead>
                  <TableHead>Зарегистрирован</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {attentionLoading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Icon name="Loader2" size={24} className="mx-auto animate-spin opacity-40" /></TableCell></TableRow>
                )}
                {!attentionLoading && attentionClients.map((c) => (
                  <TableRow key={c.id} className="hover:bg-red-50/40 cursor-pointer" onClick={() => onNavigateToClient(c.id)}>
                    <TableCell className="font-medium">
                      <p>{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </TableCell>
                    <TableCell>
                      {c.ozon_order_code
                        ? <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{c.ozon_order_code}</code>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.order_count === 0 ? "destructive" : "secondary"} className="text-xs">
                        {c.order_count === 0 ? "Нет заказов" : `${c.order_count} заказ`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(c.created_at)}</TableCell>
                    <TableCell><Icon name="ArrowUpRight" size={14} className="text-orange-500" /></TableCell>
                  </TableRow>
                ))}
                {!attentionLoading && attentionClients.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <Icon name="CheckCircle" size={32} className="mx-auto mb-2 text-green-400 opacity-60" />
                    <p className="text-sm">Все клиенты получили магниты 🎉</p>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Лог активности */}
      {tab === "log" && (
        <div className="space-y-3">
          {Object.keys(logCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(logCounts).map(([event, count]) => {
                const meta = EVENT_LABELS[event] || { label: event, color: "text-slate-600 bg-slate-50 border-slate-200", icon: "Info" };
                return (
                  <div key={event} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${meta.color}`}>
                    <Icon name={meta.icon} size={12} />
                    {meta.label}: <strong>{count}</strong> за 7 дней
                  </div>
                );
              })}
            </div>
          )}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Время</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Событие</TableHead>
                  <TableHead>Детали</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logLoading && (
                  <TableRow><TableCell colSpan={4} className="text-center py-10"><Icon name="Loader2" size={24} className="mx-auto animate-spin opacity-40" /></TableCell></TableRow>
                )}
                {!logLoading && logItems.map((item) => {
                  const meta = EVENT_LABELS[item.event] || { label: item.event, color: "text-slate-600 bg-slate-50 border-slate-200", icon: "Info" };
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(item.created_at)}</TableCell>
                      <TableCell className="text-sm font-mono">{item.phone || '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${meta.color}`}>
                          <Icon name={meta.icon} size={11} />
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{item.details || '—'}</TableCell>
                    </TableRow>
                  );
                })}
                {!logLoading && logItems.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Лог пуст</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RecentRegistrations;
