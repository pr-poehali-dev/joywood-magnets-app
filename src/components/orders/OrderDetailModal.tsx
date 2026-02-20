import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { OrderRecord } from "./types";

interface Props {
  order: OrderRecord | null;
  open: boolean;
  onClose: () => void;
  onNavigateToClient: (clientId: number) => void;
}

const channelColors: Record<string, string> = {
  Ozon: "bg-blue-50 text-blue-700 border-blue-200",
};

const OrderDetailModal = ({ order, open, onClose, onNavigateToClient }: Props) => {
  if (!order) return null;

  const channelClass = channelColors[order.channel] ?? "bg-orange-50 text-orange-700 border-orange-200";

  const handleGoToClient = () => {
    onNavigateToClient(order.registration_id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="ShoppingBag" size={20} className="text-orange-500" />
            Заказ {order.order_code ? `#${order.order_code}` : `ID ${order.id}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Сумма заказа</p>
              <p className="text-xl font-bold text-green-700">
                {order.amount > 0 ? `${order.amount.toLocaleString("ru-RU")} ₽` : "—"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Канал</p>
              <Badge variant="outline" className={`text-sm font-medium ${channelClass}`}>
                {order.channel}
              </Badge>
            </div>
          </div>

          <div className="border rounded-lg divide-y text-sm">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Номер заказа</span>
              <span className="font-mono font-medium">{order.order_code || "—"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Дата</span>
              <span>
                {new Date(order.created_at).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {order.status && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Статус</span>
                <Badge variant="secondary" className="text-xs">{order.status}</Badge>
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Клиент</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{order.client_name || "—"}</p>
                {order.client_phone && (
                  <p className="text-sm text-muted-foreground">{order.client_phone}</p>
                )}
              </div>
              {order.registration_id && (
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={handleGoToClient}>
                  <Icon name="User" size={14} />
                  Карточка клиента
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailModal;
