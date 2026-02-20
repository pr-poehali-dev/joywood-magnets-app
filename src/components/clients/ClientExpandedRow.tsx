import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { WOOD_BREEDS, STAR_LABELS, STAR_NAMES } from "@/lib/store";
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

interface ClientExpandedRowProps {
  client: Registration;
  magnets: ClientMagnet[];
  magnetsLoading: boolean;
  inventory: Record<string, number>;
  onMagnetGiven: (regId: number, magnet: ClientMagnet, breed: string, stockAfter: number | null) => void;
  onMagnetsReload: (regId: number) => void;
  onInventoryChanged: () => void;
  onClientDeleted: () => void;
  onClientUpdated: (updated: { id: number; name: string; phone: string; registered: boolean }) => void;
}

const ClientExpandedRow = ({
  client,
  magnets,
  magnetsLoading: mLoading,
  inventory,
  onMagnetGiven,
  onMagnetsReload,
  onInventoryChanged,
  onClientDeleted,
  onClientUpdated,
}: ClientExpandedRowProps) => {
  const [selectedBreed, setSelectedBreed] = useState("");
  const [breedSearch, setBreedSearch] = useState("");
  const [breedOpen, setBreedOpen] = useState(false);
  const breedRef = useRef<HTMLDivElement>(null);
  const [givingMagnet, setGivingMagnet] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [clientOrders, setClientOrders] = useState<ClientOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    setOrdersLoading(true);
    fetch(`${GET_REGISTRATIONS_URL}?action=client_orders&registration_id=${client.id}`)
      .then((r) => r.json())
      .then((data) => setClientOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [client.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (breedRef.current && !breedRef.current.contains(e.target as Node)) {
        setBreedOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const collectedBreeds = new Set(magnets.map((m) => m.breed));

  const availableBreeds = WOOD_BREEDS
    .filter((b) => !collectedBreeds.has(b.breed))
    .map((b) => ({ ...b, stock: inventory[b.breed] ?? 0 }))
    .sort((a, b) => b.stock - a.stock);

  const filteredBreeds = breedSearch.trim()
    ? availableBreeds.filter((b) => b.breed.toLowerCase().includes(breedSearch.toLowerCase()))
    : availableBreeds;

  const startEdit = () => {
    setEditing(true);
    setEditName(client.name || "");
    setEditPhone(client.phone || "");
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() && !editPhone.trim()) {
      toast.error("Укажите хотя бы имя или телефон");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(ADD_CLIENT_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id, name: editName.trim(), phone: editPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Данные клиента обновлены");
      setEditing(false);
      onClientUpdated({
        id: client.id,
        name: data.client.name,
        phone: data.client.phone,
        registered: data.client.registered,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSavingEdit(false);
    }
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
      onMagnetGiven(
        client.id,
        { id: data.id, breed: breed.breed, stars: breed.stars, category: breed.category, given_at: data.given_at },
        breed.breed,
        data.stock_after ?? null,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось выдать магнит");
    } finally { setGivingMagnet(false); }
  };

  const handleDelete = async () => {
    setDeletingId(client.id);
    try {
      const res = await fetch(`${ADD_CLIENT_URL}?id=${client.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Клиент удалён");
      setConfirmDeleteId(null);
      onClientDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось удалить");
    } finally { setDeletingId(null); }
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

  return (
    <>
    <TableRow>
      <TableCell colSpan={6} className="bg-slate-50/80 p-0">
        <div className="p-6 space-y-5">
          {editing ? (
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1 flex-1 min-w-[150px]">
                <Label className="text-xs">Имя</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Имя клиента"
                  className="h-8 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[150px]">
                <Label className="text-xs">Телефон</Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                  placeholder="+7 (___) ___-__-__"
                  className="h-8 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" className="h-8 gap-1" disabled={savingEdit} onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}>
                  {savingEdit ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                  Сохранить
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); setEditing(false); }}>
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-sm flex-wrap">
              {client.name && <div className="flex items-center gap-1.5"><Icon name="User" size={14} className="text-orange-500" /><span className="font-medium">{client.name}</span></div>}
              {client.phone && <div className="flex items-center gap-1.5"><Icon name="Phone" size={14} className="text-muted-foreground" />{client.phone}</div>}
              {client.ozon_order_code && <div className="flex items-center gap-1.5"><Icon name="Package" size={14} className="text-blue-500" />Ozon: <strong>{client.ozon_order_code}</strong></div>}
              {client.total_amount > 0 && <div className="flex items-center gap-1.5"><Icon name="Banknote" size={14} className="text-green-600" />Сумма заказов: <strong>{client.total_amount.toLocaleString("ru-RU")} ₽</strong></div>}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-orange-600 gap-1" onClick={(e) => { e.stopPropagation(); startEdit(); }}>
                <Icon name="Pencil" size={12} />Редактировать
              </Button>
              {client.phone && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 gap-1" onClick={(e) => { e.stopPropagation(); window.open(`/my-collection?phone=${encodeURIComponent(client.phone)}`, "_blank"); }}>
                  <Icon name="ExternalLink" size={12} />Карточка клиента
                </Button>
              )}
            </div>
          )}

          {!ordersLoading && clientOrders.length > 0 && (() => {
            const uniqueChannels = [...new Set(clientOrders.map((o) => o.channel).filter(Boolean))];
            return uniqueChannels.length > 1 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Icon name="GitBranch" size={12} />Каналы:
                </span>
                {uniqueChannels.map((ch) => (
                  <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>
                ))}
              </div>
            ) : null;
          })()}

          {(ordersLoading || clientOrders.length > 0) && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Icon name="ShoppingCart" size={16} className="text-orange-500" />
                Заказы ({clientOrders.length})
              </h4>
              {ordersLoading ? (
                <div className="text-center py-3 text-muted-foreground text-sm">
                  <Icon name="Loader2" size={16} className="mx-auto mb-1 animate-spin opacity-40" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {clientOrders.map((o) => {
                    const linkedMagnets = magnets.filter((m) => m.order_id === o.id);
                    return (
                    <div key={o.id} className="flex items-center gap-2 text-sm bg-white rounded-lg border px-3 py-2 cursor-pointer hover:bg-orange-50/50 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedOrder({ id: o.id, order_code: o.order_code, amount: o.amount, channel: o.channel, status: o.status, created_at: o.created_at, registration_id: client.id, client_name: client.name, client_phone: client.phone }); }}>
                      <span className="font-mono text-muted-foreground text-xs">{o.order_code || "—"}</span>
                      <Badge variant="outline" className="text-xs">{o.channel}</Badge>
                      {linkedMagnets.length > 0 ? (
                        <span className="flex items-center gap-1 flex-wrap">
                          {linkedMagnets.map((m) => (
                            <span key={m.id} className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                              <Icon name="Magnet" size={10} />{STAR_LABELS[m.stars]} {m.breed}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">магнит не выдан</span>
                      )}
                      <span className="font-medium ml-auto">
                        {o.amount > 0 ? `${o.amount.toLocaleString("ru-RU")} ₽` : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                      {confirmDeleteOrderId === o.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" disabled={deletingOrderId === o.id} onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o.id); }}>
                            {deletingOrderId === o.id ? <Icon name="Loader2" size={10} className="animate-spin" /> : "Да"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); setConfirmDeleteOrderId(null); }}>Нет</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 ml-1" onClick={(e) => { e.stopPropagation(); setConfirmDeleteOrderId(o.id); }}>
                          <Icon name="Trash2" size={12} />
                        </Button>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Icon name="Magnet" size={16} className="text-orange-500" />
                Магниты ({magnets.length})
              </h4>
            </div>

            {mLoading && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <Icon name="Loader2" size={20} className="mx-auto mb-2 animate-spin opacity-40" />Загрузка магнитов...
              </div>
            )}

            {!mLoading && magnets.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                {magnets.map((m) => (
                  <div key={m.id} className={`rounded-lg border p-2 text-center text-xs ${starBg[m.stars] || "bg-white"}`}>
                    <div className="text-lg">{STAR_LABELS[m.stars]}</div>
                    <div className="font-medium">{m.breed}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(m.given_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!mLoading && magnets.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">Магниты ещё не выдавались</p>
            )}

            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px] relative" ref={breedRef}>
                <Label className="text-xs mb-1 block">Выдать магнит</Label>
                <div className="relative">
                  <Input
                    className="h-9 pr-8 text-sm"
                    placeholder="Введите или выберите породу..."
                    value={breedOpen ? breedSearch : selectedBreed}
                    onFocus={() => { setBreedOpen(true); setBreedSearch(""); }}
                    onChange={(e) => { setBreedSearch(e.target.value); setSelectedBreed(""); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {selectedBreed && !breedOpen && (
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setSelectedBreed(""); setBreedSearch(""); }}>
                      <Icon name="X" size={14} />
                    </button>
                  )}
                </div>
                {breedOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-[260px] overflow-y-auto">
                    {filteredBreeds.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Порода не найдена</div>
                    )}
                    {filteredBreeds.map((b) => {
                      const hasStock = b.stock > 0;
                      return (
                        <button
                          key={b.breed}
                          disabled={!hasStock}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed`}
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedBreed(b.breed); setBreedSearch(""); setBreedOpen(false); }}
                        >
                          <span>{STAR_LABELS[b.stars]} {b.breed} — {STAR_NAMES[b.stars]}</span>
                          <span className={`text-xs shrink-0 ${hasStock ? "text-green-600" : "text-red-500"}`}>
                            {b.stock} шт
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                disabled={!selectedBreed || givingMagnet}
                onClick={(e) => { e.stopPropagation(); handleGiveMagnet(); }}
                className="gap-1.5"
              >
                {givingMagnet ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
                Выдать
              </Button>
            </div>

            <div className="border-t pt-4 mt-4 flex items-center justify-between">
              {confirmDeleteId === client.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Удалить клиента и все его магниты?</span>
                  <Button size="sm" variant="destructive" disabled={deletingId === client.id} onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
                    {deletingId === client.id ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Да, удалить"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>Отмена</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(client.id); }}>
                  <Icon name="Trash2" size={14} />Удалить клиента
                </Button>
              )}
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>

    <OrderDetailModal
      order={selectedOrder}
      open={!!selectedOrder}
      onClose={() => setSelectedOrder(null)}
      onNavigateToClient={() => setSelectedOrder(null)}
    />
    </>
  );
};

export default ClientExpandedRow;