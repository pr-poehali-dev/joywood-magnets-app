import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Icon from "@/components/ui/icon";

const GET_REGISTRATIONS_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";

interface RecentReg {
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
  const [items, setItems] = useState<RecentReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${GET_REGISTRATIONS_URL}?action=recent_registrations`)
      .then((r) => r.json())
      .then((data) => {
        const regs: RecentReg[] = data.registrations || [];
        setItems(regs);
        setLastRefresh(new Date());
        const todayCount = regs.filter((r) => isNew(r.created_at)).length;
        onCountChange?.(todayCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isNew = (iso: string) => {
    return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Новые регистрации</h2>
          <p className="text-sm text-muted-foreground">
            Клиенты, которые зарегистрировались в акции · обновлено {lastRefresh.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={load} disabled={loading}>
          <Icon name={loading ? "Loader2" : "RefreshCw"} size={14} className={loading ? "animate-spin" : ""} />
          Обновить
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Канал</TableHead>
              <TableHead>Заказов</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Дата регистрации</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />
                  Загрузка...
                </TableCell>
              </TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Icon name="UserCheck" size={40} className="mx-auto mb-3 opacity-30" />
                  Пока нет зарегистрированных клиентов
                </TableCell>
              </TableRow>
            )}
            {!loading && items.map((item) => (
              <TableRow key={item.id} className="hover:bg-orange-50/30">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isNew(item.created_at) && (
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Зарегистрировался сегодня" />
                    )}
                    {item.name || <span className="text-muted-foreground italic">Не указано</span>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.phone || "—"}</TableCell>
                <TableCell>
                  {item.channel
                    ? <Badge variant="outline" className="text-xs">{item.channel}</Badge>
                    : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-medium">{item.orders_count}</span>
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {item.total_amount > 0
                    ? `${item.total_amount.toLocaleString("ru-RU")} ₽`
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(item.created_at)}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-1"
                    onClick={() => onNavigateToClient(item.id)}
                  >
                    <Icon name="ArrowRight" size={12} />
                    Открыть
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default RecentRegistrations;