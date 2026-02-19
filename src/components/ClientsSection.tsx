import { useState, useEffect, Fragment, useCallback } from "react";
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
import {
  Registration,
  ClientMagnet,
  GET_REGISTRATIONS_URL,
  GIVE_MAGNET_URL,
} from "./clients/types";
import AddClientDialog from "./clients/AddClientDialog";
import ClientExpandedRow from "./clients/ClientExpandedRow";

interface ClientsSectionProps {
  focusClientId?: number | null;
  onFocusHandled?: () => void;
}

const ClientsSection = ({ focusClientId, onFocusHandled }: ClientsSectionProps) => {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [clientMagnets, setClientMagnets] = useState<Record<number, ClientMagnet[]>>({});
  const [magnetsLoading, setMagnetsLoading] = useState<Record<number, boolean>>({});
  const [inventory, setInventory] = useState<Record<string, number>>({});

  const loadInventory = useCallback(() => {
    fetch(`${GIVE_MAGNET_URL}?action=inventory`)
      .then((r) => r.json())
      .then((data) => {
        const inv: Record<string, number> = {};
        for (const [breed, info] of Object.entries(data.inventory || {})) {
          inv[breed] = (info as { stock: number }).stock;
        }
        setInventory(inv);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  useEffect(() => {
    if (focusClientId != null) {
      loadClients();
      setExpandedId(focusClientId);
      onFocusHandled?.();
      setTimeout(() => {
        const el = document.getElementById(`client-row-${focusClientId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusClientId]);

  const loadClients = () => {
    setLoading(true);
    fetch(GET_REGISTRATIONS_URL)
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadClientMagnets = useCallback((regId: number) => {
    setMagnetsLoading((p) => ({ ...p, [regId]: true }));
    fetch(`${GIVE_MAGNET_URL}?registration_id=${regId}`)
      .then((r) => r.json())
      .then((data) => setClientMagnets((p) => ({ ...p, [regId]: data.magnets || [] })))
      .catch(() => {})
      .finally(() => setMagnetsLoading((p) => ({ ...p, [regId]: false })));
  }, []);

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    if (expandedId !== null && !clientMagnets[expandedId]) {
      loadClientMagnets(expandedId);
    }
  }, [expandedId, loadClientMagnets, clientMagnets]);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.channel.toLowerCase().includes(q) || (c.ozon_order_code || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск по имени, телефону, каналу, коду Ozon..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Badge variant="secondary" className="text-sm">{filtered.length} клиентов</Badge>
        <AddClientDialog onClientAdded={(newClient) => setClients((prev) => [newClient, ...prev])} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Канал</TableHead>
              <TableHead>Код Ozon</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />Загрузка...</TableCell></TableRow>
            )}
            {!loading && filtered.map((client) => {
              const isExpanded = expandedId === client.id;

              return (
                <Fragment key={client.id}>
                  <TableRow id={`client-row-${client.id}`} className={`cursor-pointer hover:bg-orange-50/50 transition-colors ${focusClientId === client.id ? "bg-orange-50" : ""}`} onClick={() => setExpandedId(isExpanded ? null : client.id)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Icon name={isExpanded ? "ChevronDown" : "ChevronRight"} size={16} className="text-muted-foreground" />
                        {client.name || <span className="text-muted-foreground italic">Не указано</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{client.phone || "—"}</TableCell>
                    <TableCell>{client.channel ? <Badge variant="outline" className="text-xs">{client.channel}</Badge> : "—"}</TableCell>
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
                  </TableRow>

                  {isExpanded && (
                    <ClientExpandedRow
                      client={client}
                      magnets={clientMagnets[client.id] || []}
                      magnetsLoading={!!magnetsLoading[client.id]}
                      inventory={inventory}
                      onMagnetGiven={(regId, magnet, breed, stockAfter) => {
                        setClientMagnets((p) => ({ ...p, [regId]: [magnet, ...(p[regId] || [])] }));
                        if (stockAfter !== null && stockAfter !== undefined) {
                          setInventory((p) => ({ ...p, [breed]: stockAfter }));
                        }
                      }}
                      onInventoryChanged={loadInventory}
                      onClientDeleted={() => {
                        setExpandedId(null);
                        loadClients();
                      }}
                      onClientUpdated={(updated) => {
                        setClients((prev) =>
                          prev.map((c) =>
                            c.id === updated.id
                              ? { ...c, name: updated.name, phone: updated.phone, registered: updated.registered }
                              : c
                          )
                        );
                      }}
                    />
                  )}
                </Fragment>
              );
            })}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />Клиенты не найдены</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ClientsSection;