import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { OrderRecord } from "./types";
import { GIVE_MAGNET_URL, ADD_CLIENT_URL } from "../clients/types";
import { STAR_LABELS } from "@/lib/store";
import { toast } from "sonner";

interface ClientMagnet {
  id: number;
  breed: string;
  stars: number;
  given_at: string;
  order_id: number | null;
  status?: string;
}

const starBg: Record<number, string> = {
  1: "bg-amber-50 border-amber-200 text-amber-800",
  2: "bg-orange-50 border-orange-300 text-orange-800",
  3: "bg-red-50 border-red-300 text-red-800",
};

const channelColors: Record<string, string> = {
  Ozon: "bg-blue-50 text-blue-700 border-blue-200",
};

interface Props {
  order: OrderRecord | null;
  open: boolean;
  onClose: () => void;
  onNavigateToClient: (clientId: number) => void;
  onOrderUpdated?: (updated: OrderRecord) => void;
}

const OrderDetailModal = ({ order, open, onClose, onNavigateToClient, onOrderUpdated }: Props) => {
  const [magnets, setMagnets] = useState<ClientMagnet[]>([]);
  const [magnetsLoading, setMagnetsLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!open) { setEditing(false); }
    if (order) {
      setEditAmount(order.amount > 0 ? String(order.amount) : "");
      setEditCode(order.order_code || "");
      setEditComment(order.comment || "");
    }
  }, [open, order?.id]);

  const handleSave = async () => {
    if (!order) return;
    setSaving(true);
    try {
      const res = await fetch(ADD_CLIENT_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_order",
          order_id: order.id,
          amount: editAmount ? Number(editAmount) : 0,
          order_code: editCode,
          comment: editComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Заказ обновлён");
      setEditing(false);
      if (onOrderUpdated) onOrderUpdated({ ...order, ...data.order });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally { setSaving(false); }
  };

  if (!order) return null;
  const channelClass = channelColors[order.channel] ?? "bg-orange-50 text-orange-700 border-orange-200";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="ShoppingBag" size={20} className="text-orange-500" />
            Заказ {order.order_code ? `#${order.order_code}` : `ID ${order.id}`}
            <Button size="sm" variant="outline" className="ml-auto gap-1.5 h-7 text-xs" onClick={() => setEditing((v) => !v)}>
              <Icon name={editing ? "X" : "Pencil"} size={13} />
              {editing ? "Отмена" : "Редактировать"}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {editing && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Номер заказа</Label>
                <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} placeholder="Номер заказа" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Сумма заказа, ₽</Label>
                <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1" disabled={saving} onClick={handleSave}>
                  {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                  Сохранить
                </Button>
              </div>
            </div>
          )}

          {!editing && (
            <>
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
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
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
            </>
          )}

          {/* Комментарий — всегда виден */}
          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1.5">
              <Icon name="MessageSquare" size={13} className="text-slate-400" />
              Комментарий
            </p>
            <Textarea
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              placeholder="Заметки по заказу..."
              className="text-sm resize-none border-dashed"
              rows={2}
            />
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" disabled={saving} onClick={handleSave}>
              {saving ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Check" size={12} />}
              Сохранить комментарий
            </Button>
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Клиент</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{order.client_name || "—"}</p>
                {order.client_phone && <p className="text-sm text-muted-foreground">{order.client_phone}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                {order.client_phone && (
                  <a href={`https://t.me/+${order.client_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 gap-1">
                      <Icon name="Send" size={12} />Telegram
                    </Button>
                  </a>
                )}
                {order.client_phone && (
                  <a href={`https://max.ru/+${order.client_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-purple-500 hover:text-purple-700 hover:bg-purple-50 gap-1">
                      <Icon name="MessageCircle" size={12} />Max
                    </Button>
                  </a>
                )}
                {order.registration_id && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { onNavigateToClient(order.registration_id); onClose(); }}>
                    <Icon name="User" size={14} />
                    Карточка
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1.5">
              <Icon name="Gift" size={13} className="text-orange-400" />
              Магниты по заказу
            </p>
            {magnetsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                <Icon name="Loader2" size={14} className="animate-spin" />Загружаю...
              </div>
            ) : magnets.length === 0 ? (
              <div>
                <p className="text-sm text-muted-foreground py-1">Магниты не выдавались</p>
                {order.magnet_comment && (
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">Причина: {order.magnet_comment}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {magnets.map((m) => {
                  const isTransit = m.status === 'in_transit';
                  return (
                    <span
                      key={m.id}
                      title={isTransit ? "Не отсканирован клиентом" : undefined}
                      className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium ${starBg[m.stars] ?? "bg-slate-50 border-slate-200 text-slate-700"} ${isTransit ? "opacity-50 border-dashed" : ""}`}
                    >
                      {isTransit && <Icon name="Package" size={10} className="shrink-0" />}
                      {m.breed} {STAR_LABELS[m.stars]}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailModal;