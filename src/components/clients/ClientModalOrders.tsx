import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { ClientMagnet, ClientOrder, starBg } from "./types";
import { STAR_LABELS } from "@/lib/store";

interface Props {
  orders: ClientOrder[];
  magnets: ClientMagnet[];
  ordersLoading: boolean;
  deletingOrderId: number | null;
  confirmDeleteOrderId: number | null;
  onOpenOrder: (order: ClientOrder) => void;
  onConfirmDelete: (orderId: number) => void;
  onCancelDelete: () => void;
  onDeleteOrder: (orderId: number) => void;
}

const ClientModalOrders = ({
  orders,
  magnets,
  ordersLoading,
  deletingOrderId,
  confirmDeleteOrderId,
  onOpenOrder,
  onConfirmDelete,
  onCancelDelete,
  onDeleteOrder,
}: Props) => {
  const magnetsByOrder = (orderId: number) => magnets.filter((m) => m.order_id === orderId);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Заказы</p>
      {ordersLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Icon name="Loader2" size={14} className="animate-spin" />Загрузка...
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет заказов</p>
      ) : (
        <div className="divide-y border rounded-lg overflow-hidden">
          {orders.map((order) => {
            const orderMagnets = magnetsByOrder(order.id);
            return (
              <div key={order.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <button className="flex-1 flex items-center gap-3 text-left" onClick={() => onOpenOrder(order)}>
                    <div>
                      <p className="text-sm font-medium">
                        {order.order_code ? `#${order.order_code}` : `Заказ ID ${order.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}{order.channel}
                        {order.amount > 0 && ` · ${order.amount.toLocaleString("ru-RU")} ₽`}
                      </p>
                    </div>
                    {orderMagnets.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-2">
                        {orderMagnets.map((m) => (
                          <span key={m.id} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${starBg[m.stars] ?? ""}`}>
                            {m.breed} {STAR_LABELS[m.stars]}
                          </span>
                        ))}
                      </div>
                    )}
                    <Icon name="ChevronRight" size={14} className="ml-auto text-muted-foreground shrink-0" />
                  </button>
                  <div className="shrink-0">
                    {confirmDeleteOrderId === order.id ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs gap-1" disabled={deletingOrderId === order.id} onClick={() => onDeleteOrder(order.id)}>
                          {deletingOrderId === order.id ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Check" size={12} />}
                          Да
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onCancelDelete}>Нет</Button>
                      </div>
                    ) : (
                      <button onClick={() => onConfirmDelete(order.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                        <Icon name="Trash2" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientModalOrders;
