import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { ClientMagnet, GIVE_MAGNET_URL } from "./clients/types";
import { BONUS_MILESTONES } from "@/lib/store";

const BONUS_STOCK_URL = "https://functions.poehali.dev/5cbee799-0fa3-44e1-8954-66474bf973b0";

interface BonusRecord {
  id: number;
  milestone_count: number;
  milestone_type: string;
  reward: string;
  given_at: string;
}
import ClientModal from "./clients/ClientModal";
import { useClients } from "@/hooks/useClients";
import { useInventory } from "@/hooks/useInventory";

interface ClientsSectionProps {
  focusClientId?: number | null;
  onFocusHandled?: () => void;
  reloadKey?: number;
}

const ClientsSection = ({ focusClientId, onFocusHandled, reloadKey }: ClientsSectionProps) => {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [clientMagnets, setClientMagnets] = useState<Record<number, ClientMagnet[]>>({});
  const [magnetsLoading, setMagnetsLoading] = useState<Record<number, boolean>>({});
  const [clientBonuses, setClientBonuses] = useState<Record<number, BonusRecord[]>>({});
  const [bonusStock, setBonusStock] = useState<Record<string, number>>({});

  const { clients, loading, reload: loadClients, updateClient, removeClient } = useClients();
  const { stockMap: inventory, reload: loadInventory, setStockForBreed } = useInventory();

  const loadClientMagnets = useCallback((regId: number) => {
    setMagnetsLoading((p) => ({ ...p, [regId]: true }));
    Promise.all([
      fetch(`${GIVE_MAGNET_URL}?registration_id=${regId}`).then((r) => r.json()),
      fetch(`${GIVE_MAGNET_URL}?action=bonuses&registration_id=${regId}`).then((r) => r.json()),
    ])
      .then(([magnetsData, bonusesData]) => {
        setClientMagnets((p) => ({ ...p, [regId]: magnetsData.magnets || [] }));
        setClientBonuses((p) => ({ ...p, [regId]: bonusesData.bonuses || [] }));
      })
      .catch(() => {})
      .finally(() => setMagnetsLoading((p) => ({ ...p, [regId]: false })));
  }, []);

  useEffect(() => {
    if (focusClientId != null) {
      loadClients();
      setSelectedId(focusClientId);
      loadClientMagnets(focusClientId);
      onFocusHandled?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusClientId]);

  useEffect(() => {
    if (reloadKey && reloadKey > 0) loadClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const loadBonusStock = useCallback(() => {
    fetch(BONUS_STOCK_URL)
      .then((r) => r.json())
      .then((data) => setBonusStock(data.stock || {}))
      .catch(() => {});
  }, []);

  const handleOpen = useCallback((id: number) => {
    setSelectedId(id);
    if (!clientMagnets[id] || !clientBonuses[id]) loadClientMagnets(id);
    loadBonusStock();
  }, [clientMagnets, clientBonuses, loadClientMagnets, loadBonusStock]);

  const selectedClient = clients.find((c) => c.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.channel.toLowerCase().includes(q) ||
      (c.ozon_order_code || "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск по имени, телефону, каналу, коду Ozon..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Badge variant="secondary" className="text-sm">{filtered.length} клиентов</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Первичный канал</TableHead>
              <TableHead>Код Ozon</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />Загрузка...</TableCell></TableRow>
            )}
            {!loading && filtered.map((client) => (
              <TableRow
                key={client.id}
                id={`client-row-${client.id}`}
                className="cursor-pointer hover:bg-orange-50/50 transition-colors"
                onClick={() => handleOpen(client.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                    {client.name || <span className="text-muted-foreground italic">Не указано</span>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{client.phone || "—"}</TableCell>
                <TableCell>
                  {(client.channels?.length > 0 ? client.channels : client.channel ? [client.channel] : []).map((ch, i) => (
                    <Badge key={ch} variant="outline" className={`text-xs ${i > 0 ? "ml-1" : ""}`}>{ch}</Badge>
                  ))}
                  {!client.channels?.length && !client.channel && "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{client.ozon_order_code || "—"}</TableCell>
                <TableCell>
                  {client.registered ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Icon name="CheckCircle" size={12} />Зарегистрирован
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Icon name="Clock" size={12} />Ожидает
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(client.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </TableCell>
                <TableCell className="text-center">
                  {client.comment && (
                    <span title={client.comment} className="inline-flex">
                      <Icon name="MessageSquare" size={14} className="text-blue-400" />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />Клиенты не найдены</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <ClientModal
        client={selectedClient}
        open={selectedId !== null}
        magnets={selectedId ? (clientMagnets[selectedId] || []) : []}
        magnetsLoading={selectedId ? !!magnetsLoading[selectedId] : false}
        bonuses={selectedId ? (clientBonuses[selectedId] || []) : []}
        inventory={inventory}
        bonusStock={bonusStock}
        onClose={() => setSelectedId(null)}
        onMagnetGiven={(regId, magnet, breed, stockAfter) => {
          setClientMagnets((p) => ({ ...p, [regId]: [magnet, ...(p[regId] || [])] }));
          if (stockAfter !== null && stockAfter !== undefined) setStockForBreed(breed, stockAfter);
        }}
        onMagnetsReload={loadClientMagnets}
        onInventoryChanged={loadInventory}
        onClientDeleted={() => {
          setSelectedId(null);
          loadClients();
        }}
        onClientUpdated={updateClient}
      />
    </div>
  );
};

export default ClientsSection;