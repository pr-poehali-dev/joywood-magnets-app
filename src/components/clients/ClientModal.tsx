import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { WOOD_BREEDS, STAR_LABELS, BONUS_MILESTONES } from "@/lib/store";
import { toast } from "sonner";
import {
  Registration,
  ClientMagnet,
  ClientOrder,
  ADD_CLIENT_URL,
  GIVE_MAGNET_URL,
  GET_REGISTRATIONS_URL,
} from "./types";
import OrderDetailModal from "@/components/orders/OrderDetailModal";
import { OrderRecord } from "@/components/orders/types";
import ClientModalInfo from "./ClientModalInfo";
import ClientModalOrders from "./ClientModalOrders";
import ClientModalMagnets from "./ClientModalMagnets";

export interface BonusRecord {
  id: number;
  milestone_count: number;
  milestone_type: string;
  reward: string;
  given_at: string;
  order_id?: number | null;
}

interface Props {
  client: Registration | null;
  open: boolean;
  magnets: ClientMagnet[];
  magnetsLoading: boolean;
  bonuses: BonusRecord[];
  inventory: Record<string, number>;
  bonusStock: Record<string, number>;
  onClose: () => void;
  onMagnetGiven: (regId: number, magnet: ClientMagnet, breed: string, stockAfter: number | null) => void;
  onMagnetsReload: (regId: number) => void;
  onInventoryChanged: () => void;
  onClientDeleted: () => void;
  onClientUpdated: (updated: { id: number; name: string; phone: string; registered: boolean; total_amount?: number }) => void;
}

const ClientModal = ({
  client,
  open,
  magnets,
  magnetsLoading: mLoading,
  bonuses,
  inventory,
  bonusStock,
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
  const [givingMagnet, setGivingMagnet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<number | null>(null);
  const [deleteReturnMagnets, setDeleteReturnMagnets] = useState(true);
  const [deleteReturnBonuses, setDeleteReturnBonuses] = useState(true);
  const [deletingMagnetId, setDeletingMagnetId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [clientOrders, setClientOrders] = useState<ClientOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [givingBonus, setGivingBonus] = useState<string | null>(null);

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
    if (open && client) {
      setComment(client.comment || "");
    }
  }, [open, client?.id]);

  if (!client) return null;

  const totalMagnets = magnets.length;
  const uniqueBreeds = new Set(magnets.map((m) => m.breed)).size;

  const pendingBonuses = BONUS_MILESTONES.filter((m) => {
    const current = m.type === "magnets" ? totalMagnets : uniqueBreeds;
    const alreadyGiven = bonuses.some(
      (b) => b.milestone_count === m.count && b.milestone_type === m.type
    );
    return current >= m.count && !alreadyGiven;
  });

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

  const handleSaveComment = async () => {
    setSavingComment(true);
    try {
      const res = await fetch(ADD_CLIENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_client_comment", client_id: client.id, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Комментарий сохранён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally { setSavingComment(false); }
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

  const handleDeleteMagnet = async (magnetId: number, breed: string) => {
    setDeletingMagnetId(magnetId);
    try {
      const res = await fetch(`${GIVE_MAGNET_URL}?magnet_id=${magnetId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success(`Магнит «${breed}» удалён из коллекции`);
      onMagnetsReload(client.id);
      onInventoryChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось удалить магнит");
    } finally { setDeletingMagnetId(null); }
  };

  const handleDeleteOrder = async (orderId: number) => {
    setDeletingOrderId(orderId);
    try {
      const deletedOrder = clientOrders.find((o) => o.id === orderId);
      const params = new URLSearchParams({ order_id: String(orderId) });
      if (deleteReturnMagnets) params.set("return_magnets", "1");
      if (deleteReturnBonuses) params.set("return_bonuses", "1");
      const res = await fetch(`${ADD_CLIENT_URL}?${params}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setClientOrders((prev) => prev.filter((o) => o.id !== orderId));
      setConfirmDeleteOrderId(null);
      if (deletedOrder) {
        onClientUpdated({ id: client.id, name: client.name, phone: client.phone, registered: client.registered, total_amount: (client.total_amount || 0) - deletedOrder.amount });
      }
      const parts: string[] = [];
      if (deleteReturnMagnets && (data.magnets_removed as string[] | undefined)?.length) {
        parts.push(`магниты возвращены: ${(data.magnets_removed as string[]).join(", ")}`);
        onInventoryChanged();
      }
      if (deleteReturnBonuses && (data.bonuses_removed as string[] | undefined)?.length) {
        parts.push(`бонусы возвращены на склад`);
      }
      toast.success(`Заказ удалён${parts.length ? `, ${parts.join("; ")}` : ""}`);
      onMagnetsReload(client.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось удалить заказ");
    } finally { setDeletingOrderId(null); }
  };

  const handleGiveBonus = async (milestone: typeof BONUS_MILESTONES[0]) => {
    const key = `${milestone.count}-${milestone.type}`;
    setGivingBonus(key);
    try {
      const res = await fetch(GIVE_MAGNET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "give_bonus",
          registration_id: client.id,
          milestone_count: milestone.count,
          milestone_type: milestone.type,
          reward: milestone.reward,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success(`Бонус «${milestone.reward}» выдан`);
      onMagnetsReload(client.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка выдачи бонуса");
    } finally { setGivingBonus(null); }
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
            <ClientModalInfo
              client={client}
              editing={editing}
              editName={editName}
              editPhone={editPhone}
              savingEdit={savingEdit}
              onEditNameChange={setEditName}
              onEditPhoneChange={setEditPhone}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditing(false)}
              onStartEdit={() => { setEditName(client.name || ""); setEditPhone(client.phone || ""); setEditing(true); }}
            />

            <ClientModalOrders
              orders={clientOrders}
              magnets={magnets}
              bonuses={bonuses}
              ordersLoading={ordersLoading}
              deletingOrderId={deletingOrderId}
              confirmDeleteOrderId={confirmDeleteOrderId}
              deleteReturnMagnets={deleteReturnMagnets}
              deleteReturnBonuses={deleteReturnBonuses}
              onOpenOrder={openOrder}
              onConfirmDelete={(id) => { setConfirmDeleteOrderId(id); setDeleteReturnMagnets(true); setDeleteReturnBonuses(true); }}
              onCancelDelete={() => setConfirmDeleteOrderId(null)}
              onDeleteOrder={handleDeleteOrder}
              onReturnMagnetsChange={setDeleteReturnMagnets}
              onReturnBonusesChange={setDeleteReturnBonuses}
            />

            <ClientModalMagnets
              magnets={magnets}
              magnetsLoading={mLoading}
              clientOrders={clientOrders}
              inventory={inventory}
              selectedBreed={selectedBreed}
              breedSearch={breedSearch}
              breedOpen={breedOpen}
              givingMagnet={givingMagnet}
              deletingMagnetId={deletingMagnetId}
              comment={comment}
              savingComment={savingComment}
              confirmDelete={confirmDelete}
              deleting={deleting}
              pendingBonuses={pendingBonuses}
              givingBonus={givingBonus}
              bonusStock={bonusStock}
              onBreedSelect={setSelectedBreed}
              onBreedSearchChange={setBreedSearch}
              onBreedOpenToggle={() => setBreedOpen((v) => !v)}
              onBreedClose={() => setBreedOpen(false)}
              onGiveMagnet={handleGiveMagnet}
              onDeleteMagnet={handleDeleteMagnet}
              onCommentChange={setComment}
              onSaveComment={handleSaveComment}
              onConfirmDelete={() => setConfirmDelete(true)}
              onCancelDelete={() => setConfirmDelete(false)}
              onDelete={handleDelete}
              onGiveBonus={handleGiveBonus}
            />
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