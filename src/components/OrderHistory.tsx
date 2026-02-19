import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import {
  DEMO_ORDERS,
  CHANNELS,
  STAR_LABELS,
  formatMoney,
  formatDate,
} from "@/lib/store";

const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: "Выполнен", color: "bg-green-100 text-green-800" },
  pending: { label: "В обработке", color: "bg-yellow-100 text-yellow-800" },
  returned: { label: "Возврат", color: "bg-red-100 text-red-800" },
};

const OrderHistory = () => {
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const sorted = [...DEMO_ORDERS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filtered = sorted.filter((o) => {
    if (channelFilter !== "all" && o.channel !== channelFilter) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon name="History" size={20} className="text-orange-500" />
          История заказов
        </h3>
        <div className="flex-1" />
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Канал" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все каналы</SelectItem>
            {CHANNELS.map((ch) => (
              <SelectItem key={ch} value={ch}>
                {ch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="completed">Выполнен</SelectItem>
            <SelectItem value="pending">В обработке</SelectItem>
            <SelectItem value="returned">Возврат</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} заказов</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead>Канал</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Магниты выданы</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => {
              const status = statusConfig[order.status];
              return (
                <TableRow key={order.id} className="hover:bg-orange-50/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {order.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {order.clientName}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(order.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {order.channel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {order.magnetsGiven.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1 bg-orange-50 text-orange-800 border border-orange-200 rounded-full px-2 py-0.5 text-xs"
                        >
                          {m.breed} {STAR_LABELS[m.stars]}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                >
                  Заказы не найдены
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default OrderHistory;
