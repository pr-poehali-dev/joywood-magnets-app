import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { OrderRecord } from "./types";
import { GIVE_MAGNET_URL } from "../clients/types";
import { STAR_LABELS } from "@/lib/store";

interface ClientMagnet {
  id: number;
  breed: string;
  stars: number;
  given_at: string;
  order_id: number | null;
}

const starBg: Record<number, string> = {
  1: "bg-amber-50 border-amber-200 text-amber-800",
  2: "bg-orange-50 border-orange-300 text-orange-800",
  3: "bg-red-50 border-red-300 text-red-800",
};

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
  const [magnets, setMagnets] = useState<ClientMagnet[]>([]);
  const [magnetsLoading, setMagnetsLoading] = useState(false);

  useEffect(() => {
    if (!open || !order) { setMagnets([]); return; }
    setMagnetsLoading(true);
    fetch(`${GIVE_MAGNET_URL}?registration_id=${order.registration_id}`)
      .then((r) => r.json())
      .then((data) => {
        const all: ClientMagnet[] = data.magnets || [];
        setMagnets(all.filter((m) => m.order_id === order.id));
      })
      .catch(() => setMagnets([]))
      .finally(() => setMagnetsLoading(false));
  }, [open, order?.id, order?.registration_id]);

  const channelClass = order
    ? (channelColors[order.channel] ?? "bg-orange-50 text-orange-700 border-orange-200")
    : "";

  const handleGoToClient = () => {
    if (!order) return;
    onNavigateToClient(order.registration_id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        {order && (
          <>
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

              <div className="border rounded-lg p-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1.5">
                  <Icon name="Gift" size={13} className="text-orange-400" />
                  Магниты по заказу
                </p>
                {magnetsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <Icon name="Loader2" size={14} className="animate-spin" />
                    Загружаю...
                  </div>
                ) : magnets.length === 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground py-1">Магниты не выдавались</p>
                    {order.magnet_comment && (
                      <p className="text-xs text-muted-foreground/70 mt-1 italic">
                        Причина: {order.magnet_comment}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {magnets.map((m) => (
                      <span
                        key={m.id}
                        className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium ${starBg[m.stars] ?? "bg-slate-50 border-slate-200 text-slate-700"}`}
                      >
                        {m.breed} {STAR_LABELS[m.stars]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailModal;