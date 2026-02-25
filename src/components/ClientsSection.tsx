import { useState, useEffect, useCallback, useRef } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { ClientMagnet, Registration, GIVE_MAGNET_URL, GET_REGISTRATIONS_URL } from "./clients/types";
import { BONUS_MILESTONES } from "@/lib/store";

const BONUS_STOCK_URL = "https://functions.poehali.dev/5cbee799-0fa3-44e1-8954-66474bf973b0";
const PAGE_SIZE = 50;

interface BonusRecord {
  id: number;
  milestone_count: number;
  milestone_type: string;
  reward: string;
  given_at: string;
}
import ClientModal from "./clients/ClientModal";
import { useInventory } from "@/hooks/useInventory";

interface ClientsSectionProps {
  focusClientId?: number | null;
  onFocusHandled?: () => void;
  reloadKey?: number;
}

const ClientsSection = ({ focusClientId, onFocusHandled, reloadKey }: ClientsSectionProps) => {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<Registration | null>(null);
  const [clientMagnets, setClientMagnets] = useState<Record<number, ClientMagnet[]>>({});
  const [magnetsLoading, setMagnetsLoading] = useState<Record<number, boolean>>({});
  const [clientBonuses, setClientBonuses] = useState<Record<number, BonusRecord[]>>({});
  const [bonusStock, setBonusStock] = useState<Record<string, number>>({});

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { stockMap: inventory, reload: loadInventory, setStockForBreed } = useInventory();

  const fetchClients = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (q) params.set("q", q);
    adminFetch(`${GET_REGISTRATIONS_URL}?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setClients(data.clients || []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchClients(1, search), 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [search, fetchClients]);

  useEffect(() => {
    fetchClients(page, search);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (reloadKey && reloadKey > 0) fetchClients(page, search);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // При focusClientId — грузим конкретного клиента отдельным запросом
  useEffect(() => {
    if (focusClientId == null) return;
    adminFetch(`${GET_REGISTRATIONS_URL}?action=client_by_id&id=${focusClientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.client) {
          setSelectedClient(data.client);
          setSelectedId(focusClientId);
          loadClientMagnets(focusClientId);
          loadBonusStock();
        }
      })
      .catch(() => {});
    onFocusHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusClientId]);

  const loadClientMagnets = useCallback((regId: number) => {
    setMagnetsLoading((p) => ({ ...p, [regId]: true }));
    Promise.all([
      adminFetch(`${GIVE_MAGNET_URL}?registration_id=${regId}`).then((r) => r.json()),
      adminFetch(`${GIVE_MAGNET_URL}?action=bonuses&registration_id=${regId}`).then((r) => r.json()),
    ])
      .then(([magnetsData, bonusesData]) => {
        setClientMagnets((p) => ({ ...p, [regId]: magnetsData.magnets || [] }));
        setClientBonuses((p) => ({ ...p, [regId]: bonusesData.bonuses || [] }));
      })
      .catch(() => {})
      .finally(() => setMagnetsLoading((p) => ({ ...p, [regId]: false })));
  }, []);

  const loadBonusStock = useCallback(() => {
    fetch(BONUS_STOCK_URL)
      .then((r) => r.json())
      .then((data) => setBonusStock(data.stock || {}))
      .catch(() => {});
  }, []);

  const handleOpen = useCallback((client: Registration) => {
    setSelectedId(client.id);
    setSelectedClient(client);
    loadClientMagnets(client.id);
    loadBonusStock();
  }, [loadClientMagnets, loadBonusStock]);

  const updateClient = useCallback((updated: Pick<Registration, "id" | "name" | "phone" | "registered"> & { total_amount?: number }) => {
    setClients((prev) => prev.map((c) =>
      c.id === updated.id
        ? { ...c, name: updated.name, phone: updated.phone, registered: updated.registered, ...(updated.total_amount !== undefined ? { total_amount: updated.total_amount } : {}) }
        : c
    ));
    setSelectedClient((prev) => prev?.id === updated.id ? { ...prev, ...updated } : prev);
  }, []);

  const removeClient = useCallback((id: number) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setTotal((t) => t - 1);
    setSelectedId(null);
    setSelectedClient(null);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, телефону, каналу, коду Ozon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
        <Badge variant="secondary" className="text-sm">{total.toLocaleString("ru-RU")} клиентов</Badge>
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
              <TableHead className="hidden md:table-cell">Менеджер</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />
                  Загрузка...
                </TableCell>
              </TableRow>
            )}
            {!loading && clients.map((client) => (
              <TableRow
                key={client.id}
                id={`client-row-${client.id}`}
                className="cursor-pointer hover:bg-orange-50/50 transition-colors"
                onClick={() => handleOpen(client)}
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
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {client.created_by ? client.created_by.split("@")[0] : "—"}
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
            {!loading && clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />
                  Клиенты не найдены
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
            <Icon name="ChevronLeft" size={16} />
          </Button>
          <span className="text-sm text-muted-foreground px-2">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      )}

      <ClientModal
        client={selectedClient}
        open={selectedId !== null}
        magnets={selectedId ? (clientMagnets[selectedId] || []) : []}
        magnetsLoading={selectedId ? !!magnetsLoading[selectedId] : false}
        bonuses={selectedId ? (clientBonuses[selectedId] || []) : []}
        inventory={inventory}
        bonusStock={bonusStock}
        onClose={() => { setSelectedId(null); setSelectedClient(null); }}
        onMagnetGiven={(regId, magnet, breed, stockAfter) => {
          setClientMagnets((p) => ({ ...p, [regId]: [magnet, ...(p[regId] || [])] }));
          if (stockAfter !== null && stockAfter !== undefined) setStockForBreed(breed, stockAfter);
        }}
        onMagnetsReload={loadClientMagnets}
        onInventoryChanged={loadInventory}
        onClientDeleted={() => {
          if (selectedId) removeClient(selectedId);
        }}
        onClientUpdated={updateClient}
      />
    </div>
  );
};

export default ClientsSection;