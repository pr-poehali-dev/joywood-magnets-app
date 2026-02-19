import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ClientExpandedRowProps {
  client: Registration;
  magnets: ClientMagnet[];
  magnetsLoading: boolean;
  inventory: Record<string, number>;
  onMagnetGiven: (regId: number, magnet: ClientMagnet, breed: string, stockAfter: number | null) => void;
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
  onInventoryChanged,
  onClientDeleted,
  onClientUpdated,
}: ClientExpandedRowProps) => {
  const [selectedBreed, setSelectedBreed] = useState("");
  const [givingMagnet, setGivingMagnet] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [clientOrders, setClientOrders] = useState<ClientOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    setOrdersLoading(true);
    fetch(`${GET_REGISTRATIONS_URL}?action=client_orders&registration_id=${client.id}`)
      .then((r) => r.json())
      .then((data) => setClientOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [client.id]);

  const collectedBreeds = new Set(magnets.map((m) => m.breed));

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

  return (
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
                  {clientOrders.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 text-sm bg-white rounded-lg border px-3 py-2">
                      <span className="font-mono text-muted-foreground text-xs">{o.order_code || "—"}</span>
                      <Badge variant="outline" className="text-xs">{o.channel}</Badge>
                      <span className="font-medium ml-auto">
                        {o.amount > 0 ? `${o.amount.toLocaleString("ru-RU")} ₽` : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
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
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs mb-1 block">Выдать магнит</Label>
                <Select value={selectedBreed} onValueChange={setSelectedBreed}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Выберите породу..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {WOOD_BREEDS.filter((b) => !collectedBreeds.has(b.breed)).map((b) => {
                      const stock = inventory[b.breed] ?? 0;
                      const hasStock = stock > 0;
                      return (
                        <SelectItem key={b.breed} value={b.breed} disabled={!hasStock}>
                          {STAR_LABELS[b.stars]} {b.breed} — {STAR_NAMES[b.stars]}
                          <span className={`ml-1 ${hasStock ? "text-green-600" : "text-red-500"}`}>
                            ({stock} шт)
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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
  );
};

export default ClientExpandedRow;