import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { WOOD_BREEDS, STAR_LABELS } from "@/lib/store";
import { toast } from "sonner";
import {
  Registration,
  ClientMagnet,
  ClientOrder,
  ADD_CLIENT_URL,
  GIVE_MAGNET_URL,
  GET_REGISTRATIONS_URL,
  formatPhone,
  starBg,
} from "./types";
import OrderDetailModal from "@/components/orders/OrderDetailModal";
import { OrderRecord } from "@/components/orders/types";

interface Props {
  client: Registration | null;
  open: boolean;
  magnets: ClientMagnet[];
  magnetsLoading: boolean;
  inventory: Record<string, number>;
  onClose: () => void;
  onMagnetGiven: (regId: number, magnet: ClientMagnet, breed: string, stockAfter: number | null) => void;
  onMagnetsReload: (regId: number) => void;
  onInventoryChanged: () => void;
  onClientDeleted: () => void;
  onClientUpdated: (updated: { id: number; name: string; phone: string; registered: boolean }) => void;
}

const ClientModal = ({
  client,
  open,
  magnets,
  magnetsLoading: mLoading,
  inventory,
  onClose,
  onMagnetGiven,
  onMagnetsReload,
  onInventoryChanged,
  onClientDeleted,
  onClientUpdated,
}: Props) => {
  const [selectedBreed, setSelectedBreed] = useState("");
  const [breedSearch, setBreedSearch] = useState("");
  const [breedOpen, setBreedOpen] = useState(false);
  const breedRef = useRef<HTMLDivElement>(null);
  const [givingMagnet, setGivingMagnet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [clientOrders, setClientOrders] = useState<ClientOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    setOrdersLoading(true);
    setClientOrders([]);
    fetch(`${GET_REGISTRATIONS_URL}?action=client_orders&registration_id=${client.id}`)
      .then((r) => r.json())
      .then((data) => setClientOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [open, client?.id]);

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setConfirmDelete(false);
      setSelectedBreed("");
      setBreedSearch("");
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (breedRef.current && !breedRef.current.contains(e.target as Node)) {
        setBreedOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!client) return null;

  const collectedBreeds = new Set(magnets.map((m) => m.breed));
  const availableBreeds = WOOD_BREEDS
    .filter((b) => !collectedBreeds.has(b.breed))
    .map((b) => ({ ...b, stock: inventory[b.breed] ?? 0 }))
    .sort((a, b) => b.stock - a.stock);
  const filteredBreeds = breedSearch.trim()
    ? availableBreeds.filter((b) => b.breed.toLowerCase().includes(breedSearch.toLowerCase()))
    : availableBreeds;

  const handleSaveEdit = async () => {
    if (!editName.trim() && !editPhone.trim()) { toast.error("Укажите хотя бы имя или телефон"); return; }
    setSavingEdit(true);
    try {
      const res = await fetch(ADD_CLIENT_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id, name: editName.trim(), phone: editPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Данные обновлены");
      setEditing(false);
      onClientUpdated({ id: client.id, name: data.client.name, phone: data.client.phone, registered: data.client.registered });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally { setSavingEdit(false); }
  };

  const handleGiveMagnet = async () => {
    if (!selectedBreed) return;
    const breed = WOOD_BREEDS.find((b) => b.breed === selectedBreed);
    if (!breed) return;
    setGivingMagnet(true);
    try {
      const res = await fetch(GIVE_MAGNET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: client.id, breed: breed.breed, stars: breed.stars, category: breed.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success(`${breed.breed} ${STAR_LABELS[breed.stars]} выдан`);
      setSelectedBreed("");
      onMagnetGiven(client.id, { id: data.id, breed: breed.breed, stars: breed.stars, category: breed.category, given_at: data.given_at }, breed.breed, data.stock_after ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось выдать магнит");
    } finally { setGivingMagnet(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${ADD_CLIENT_URL}?id=${client.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Клиент удалён");
      onClose();
      onClientDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось удалить");
    } finally { setDeleting(false); }
  };

  const handleDeleteOrder = async (orderId: number) => {
    setDeletingOrderId(orderId);
    try {
      const res = await fetch(`${ADD_CLIENT_URL}?order_id=${orderId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setClientOrders((prev) => prev.filter((o) => o.id !== orderId));
      setConfirmDeleteOrderId(null);
      if (data.magnet_removed) {
        toast.success(`Заказ удалён, магнит «${data.magnet_breed}» возвращён на склад`);
        onMagnetsReload(client.id);
        onInventoryChanged();
      } else {
        toast.success("Заказ удалён");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось удалить заказ");
    } finally { setDeletingOrderId(null); }
  };

  const openOrder = (order: ClientOrder) => {
    setSelectedOrder({
      id: order.id,
      order_code: order.order_code,
      amount: order.amount,
      channel: order.channel,
      status: order.status,
      created_at: order.created_at,
      registration_id: client.id,
      client_name: client.name,
      client_phone: client.phone,
      magnet_comment: null,
    } as OrderRecord);
    setOrderModalOpen(true);
  };

  const magnetsByOrder = (orderId: number) => magnets.filter((m) => m.order_id === orderId);
  const unlinkedMagnets = magnets.filter((m) => !m.order_id);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-orange-100 rounded-full p-1.5">
                <Icon name="User" size={16} className="text-orange-600" />
              </div>
              <span className="truncate">{client.name || "Клиент"}</span>
              {client.registered ? (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                  <Icon name="CheckCircle" size={11} />Зарегистрирован
                </span>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 shrink-0">
                  <Icon name="Clock" size={11} />Ожидает
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {/* Контакты */}
            {editing ? (
              <div className="flex items-end gap-3 flex-wrap bg-slate-50 rounded-lg p-4">
                <div className="space-y-1 flex-1 min-w-[150px]">
                  <Label className="text-xs">Имя</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Имя клиента" className="h-8 text-sm" />
                </div>
                <div className="space-y-1 flex-1 min-w-[150px]">
                  <Label className="text-xs">Телефон</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(formatPhone(e.target.value))} placeholder="+7 (___) ___-__-__" className="h-8 text-sm" />
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-8 gap-1" disabled={savingEdit} onClick={handleSaveEdit}>
                    {savingEdit ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                    Сохранить
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditing(false)}>Отмена</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 flex-wrap text-sm bg-slate-50 rounded-lg px-4 py-3">
                {client.phone && <div className="flex items-center gap-1.5"><Icon name="Phone" size={14} className="text-muted-foreground" />{client.phone}</div>}
                {client.ozon_order_code && <div className="flex items-center gap-1.5"><Icon name="Package" size={14} className="text-blue-500" />Ozon: <strong>{client.ozon_order_code}</strong></div>}
                {client.total_amount > 0 && <div className="flex items-center gap-1.5"><Icon name="Banknote" size={14} className="text-green-600" /><strong>{client.total_amount.toLocaleString("ru-RU")} ₽</strong></div>}
                <div className="flex gap-1.5 ml-auto">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => { setEditName(client.name || ""); setEditPhone(client.phone || ""); setEditing(true); }}>
                    <Icon name="Pencil" size={12} />Редактировать
                  </Button>
                  {client.phone && (
                    <a href={`https://wa.me/${client.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 gap-1">
                        <Icon name="MessageCircle" size={12} />WhatsApp
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Заказы */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Заказы</p>
              {ordersLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Icon name="Loader2" size={14} className="animate-spin" />Загрузка...
                </div>
              ) : clientOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет заказов</p>
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden">
                  {clientOrders.map((order) => {
                    const orderMagnets = magnetsByOrder(order.id);
                    return (
                      <div key={order.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <button className="flex-1 flex items-center gap-3 text-left" onClick={() => openOrder(order)}>
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
                                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs gap-1" disabled={deletingOrderId === order.id} onClick={() => handleDeleteOrder(order.id)}>
                                  {deletingOrderId === order.id ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Check" size={12} />}
                                  Да
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDeleteOrderId(null)}>Нет</Button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteOrderId(order.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
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

            {/* Магниты */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Коллекция магнитов</p>
                <span className="text-xs text-muted-foreground">({magnets.length} шт)</span>
              </div>
              {mLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Icon name="Loader2" size={14} className="animate-spin" />Загрузка...
                </div>
              ) : magnets.length === 0 ? (
                <p className="text-sm text-muted-foreground">Магнитов нет</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {magnets.map((m) => (
                    <span key={m.id} className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium ${starBg[m.stars] ?? ""}`}>
                      {m.breed} {STAR_LABELS[m.stars]}
                    </span>
                  ))}
                  {unlinkedMagnets.length > 0 && clientOrders.length > 0 && (
                    <span className="text-xs text-muted-foreground italic self-center ml-1">({unlinkedMagnets.length} без заказа)</span>
                  )}
                </div>
              )}
            </div>

            {/* Выдать магнит вручную */}
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Выдать магнит вручную</p>
              <div className="flex gap-2">
                <div className="relative flex-1" ref={breedRef}>
                  <button
                    className="w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm bg-white hover:border-orange-300 transition-colors"
                    onClick={() => setBreedOpen((v) => !v)}
                  >
                    <span className={selectedBreed ? "text-foreground" : "text-muted-foreground"}>
                      {selectedBreed ? (() => { const b = WOOD_BREEDS.find((b) => b.breed === selectedBreed); return b ? `${b.breed} ${STAR_LABELS[b.stars]}` : selectedBreed; })() : "Выбрать породу..."}
                    </span>
                    <Icon name="ChevronDown" size={14} className="text-muted-foreground shrink-0" />
                  </button>
                  {breedOpen && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 border-b">
                        <Input
                          autoFocus
                          placeholder="Поиск породы..."
                          value={breedSearch}
                          onChange={(e) => setBreedSearch(e.target.value)}
                          className="h-7 text-sm"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredBreeds.slice(0, 40).map((b) => (
                          <button
                            key={b.breed}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${b.stock === 0 ? "opacity-40" : ""}`}
                            onClick={() => { setSelectedBreed(b.breed); setBreedOpen(false); setBreedSearch(""); }}
                            disabled={b.stock === 0}
                          >
                            <span>{b.breed} {STAR_LABELS[b.stars]}</span>
                            <span className="text-xs text-muted-foreground">{b.stock} шт</span>
                          </button>
                        ))}
                        {filteredBreeds.length === 0 && (
                          <p className="text-sm text-muted-foreground px-3 py-2">Не найдено</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <Button size="sm" disabled={!selectedBreed || givingMagnet} onClick={handleGiveMagnet} className="gap-1 shrink-0">
                  {givingMagnet ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Gift" size={14} />}
                  Выдать
                </Button>
              </div>
            </div>

            {/* Удаление клиента */}
            <div className="border-t pt-4 flex justify-end">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Удалить клиента?</span>
                  <Button size="sm" variant="destructive" disabled={deleting} onClick={handleDelete} className="gap-1">
                    {deleting ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Trash2" size={14} />}
                    Да, удалить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Отмена</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1" onClick={() => setConfirmDelete(true)}>
                  <Icon name="Trash2" size={14} />
                  Удалить клиента
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OrderDetailModal
        order={selectedOrder}
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onNavigateToClient={() => {}}
      />
    </>
  );
};

export default ClientModal;
