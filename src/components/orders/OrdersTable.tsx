import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { OrderRecord } from "./types";
import OrderDetailModal from "./OrderDetailModal";

interface Props {
  orders: OrderRecord[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  search: string;
  onSearchChange: (q: string) => void;
  onPageChange: (p: number) => void;
  onNavigateToClient?: (clientId: number) => void;
  onOrderUpdated?: (updated: OrderRecord) => void;
}

const OrdersTable = ({
  orders,
  loading,
  total,
  page,
  totalPages,
  search,
  onSearchChange,
  onPageChange,
  onNavigateToClient,
  onOrderUpdated,
}: Props) => {
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const totalSum = orders.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon name="History" size={20} className="text-orange-500" />
          История заказов
        </h3>
        <div className="flex-1" />
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Клиент, телефон, номер..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 w-52 text-sm"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange("")}
            >
              <Icon name="X" size={12} />
            </button>
          )}
        </div>
        <Badge variant="secondary">{total.toLocaleString("ru-RU")} заказов</Badge>
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
              <TableHead>Дата</TableHead>
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />
                  Загрузка...
                </TableCell>
              </TableRow>
            )}
            {!loading && orders.map((order) => (
              <TableRow
                key={order.id}
                className="hover:bg-orange-50/50 cursor-pointer transition-colors"
                onClick={() => setSelectedOrder(order)}
              >
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
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell className="text-center">
                  {order.comment && (
                    <span title={order.comment} className="inline-flex">
                      <Icon name="MessageSquare" size={14} className="text-blue-400" />
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Icon name="ChevronRight" size={16} className="text-muted-foreground/50" />
                </TableCell>
              </TableRow>
            ))}
            {!loading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Icon name="ShoppingCart" size={40} className="mx-auto mb-3 opacity-30" />
                  {search ? "Ничего не найдено" : "Заказов пока нет"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            <Icon name="ChevronLeft" size={16} />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      )}

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onNavigateToClient={(clientId) => {
          setSelectedOrder(null);
          onNavigateToClient?.(clientId);
        }}
        onOrderUpdated={(updated) => {
          setSelectedOrder(updated);
          onOrderUpdated?.(updated);
        }}
      />
    </div>
  );
};

export default OrdersTable;
