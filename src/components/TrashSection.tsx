import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";

const TRASH_URL = "https://functions.poehali.dev/c8e341e4-896e-40c2-880a-8989000a6d82";

interface TrashClient {
  id: number;
  name: string;
  phone: string;
  channel: string;
  removed_at: string;
  removed_orders: number;
}

interface TrashOrder {
  id: number;
  order_code: string;
  amount: number;
  channel: string;
  removed_at: string;
  client_id: number;
  client_name: string;
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmtAmount = (a: number) =>
  a > 0 ? a.toLocaleString("ru-RU") + " ₽" : "—";

const TrashSection = () => {
  const [clients, setClients] = useState<TrashClient[]>([]);
  const [orders, setOrders] = useState<TrashOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(TRASH_URL);
      const data = await res.json();
      setClients(data.clients || []);
      setOrders(data.orders || []);
    } catch {
      toast.error("Не удалось загрузить корзину");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const restoreClient = async (id: number) => {
    const key = `client-${id}`;
    setProcessingId(key);
    try {
      const res = await fetch(TRASH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore_client", client_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Клиент восстановлен");
      setClients((p) => p.filter((c) => c.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setProcessingId(null);
    }
  };

  const restoreOrder = async (id: number) => {
    const key = `order-${id}`;
    setProcessingId(key);
    try {
      const res = await fetch(TRASH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore_order", order_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Заказ восстановлен");
      setOrders((p) => p.filter((o) => o.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setProcessingId(null);
    }
  };

  const purgeClient = async (id: number) => {
    const key = `client-${id}`;
    setProcessingId(key);
    setConfirmPurge(null);
    try {
      const res = await fetch(`${TRASH_URL}?client_id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Клиент удалён навсегда");
      setClients((p) => p.filter((c) => c.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setProcessingId(null);
    }
  };

  const purgeOrder = async (id: number) => {
    const key = `order-${id}`;
    setProcessingId(key);
    setConfirmPurge(null);
    try {
      const res = await fetch(`${TRASH_URL}?order_id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Заказ удалён навсегда");
      setOrders((p) => p.filter((o) => o.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setProcessingId(null);
    }
  };

  const total = clients.length + orders.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="Trash2" size={18} className="text-orange-500" />
              Корзина
              {total > 0 && (
                <span className="ml-1 text-xs font-normal bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                  {total}
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Удалённые клиенты и заказы. Можно восстановить или удалить навсегда.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={load} disabled={loading}>
            <Icon name={loading ? "Loader2" : "RefreshCw"} size={13} className={loading ? "animate-spin" : ""} />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Icon name="Loader2" size={18} className="animate-spin" />
            <span className="text-sm">Загрузка...</span>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Icon name="Trash2" size={32} className="opacity-20" />
            <p className="text-sm">Корзина пуста</p>
          </div>
        ) : (
          <div className="space-y-6">
            {clients.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Клиенты ({clients.length})
                </p>
                <div className="space-y-2">
                  {clients.map((c) => {
                    const key = `client-${c.id}`;
                    const busy = processingId === key;
                    return (
                      <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          <Icon name="User" size={14} className="text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.phone || "Телефон не указан"} · {c.channel}
                            {c.removed_orders > 0 && ` · ${c.removed_orders} заказ(а)`}
                          </p>
                          <p className="text-[11px] text-slate-400">Удалён {fmtDate(c.removed_at)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                            disabled={busy}
                            onClick={() => restoreClient(c.id)}
                          >
                            {busy ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="RotateCcw" size={12} />}
                            Восстановить
                          </Button>
                          {confirmPurge === key ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600 font-medium">Точно?</span>
                              <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={busy} onClick={() => purgeClient(c.id)}>
                                Да
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmPurge(null)}>
                                Нет
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={busy}
                              onClick={() => setConfirmPurge(key)}
                            >
                              <Icon name="Trash2" size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {orders.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Заказы ({orders.length})
                </p>
                <div className="space-y-2">
                  {orders.map((o) => {
                    const key = `order-${o.id}`;
                    const busy = processingId === key;
                    return (
                      <div key={o.id} className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          <Icon name="ShoppingCart" size={14} className="text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {o.order_code || `Заказ #${o.id}`}
                            <span className="ml-2 text-xs font-normal text-slate-500">{fmtAmount(o.amount)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Клиент: {o.client_name} · {o.channel}
                          </p>
                          <p className="text-[11px] text-slate-400">Удалён {fmtDate(o.removed_at)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                            disabled={busy}
                            onClick={() => restoreOrder(o.id)}
                          >
                            {busy ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="RotateCcw" size={12} />}
                            Восстановить
                          </Button>
                          {confirmPurge === key ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600 font-medium">Точно?</span>
                              <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={busy} onClick={() => purgeOrder(o.id)}>
                                Да
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmPurge(null)}>
                                Нет
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={busy}
                              onClick={() => setConfirmPurge(key)}
                            >
                              <Icon name="Trash2" size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrashSection;
