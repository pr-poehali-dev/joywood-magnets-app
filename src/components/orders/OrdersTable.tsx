import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { OrderRecord } from "./types";

interface Props {
  orders: OrderRecord[];
  loading: boolean;
  ozonOnly?: boolean;
}

const OrdersTable = ({ orders, loading, ozonOnly = false }: Props) => {
  const filteredOrders = ozonOnly
    ? orders.filter((o) => o.channel === "Ozon")
    : orders.filter((o) => o.channel !== "Ozon");

  const totalSum = filteredOrders.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon name="History" size={20} className="text-orange-500" />
          {ozonOnly ? "История заказов Ozon" : "История заказов"}
        </h3>
        <div className="flex-1" />
        <Badge variant="secondary">{filteredOrders.length} заказов</Badge>
        {totalSum > 0 && (
          <Badge variant="outline" className="text-green-700 border-green-300">
            {totalSum.toLocaleString("ru-RU")} ₽
          </Badge>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead>Номер заказа</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              {!ozonOnly && <TableHead>Канал</TableHead>}
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={ozonOnly ? 4 : 5} className="text-center py-12 text-muted-foreground">
                  <Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />
                  Загрузка...
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-orange-50/30">
                  <TableCell className="font-medium">
                    {order.client_name || "—"}
                    {order.client_phone && (
                      <span className="text-muted-foreground text-xs ml-1.5">
                        {order.client_phone}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {order.order_code || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {order.amount > 0 ? `${order.amount.toLocaleString("ru-RU")} ₽` : "—"}
                  </TableCell>
                  {!ozonOnly && (
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {order.channel}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            {!loading && filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={ozonOnly ? 4 : 5} className="text-center py-12 text-muted-foreground">
                  <Icon name="ShoppingCart" size={40} className="mx-auto mb-3 opacity-30" />
                  Заказов пока нет
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default OrdersTable;
