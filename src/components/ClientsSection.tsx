import { useState, useEffect, Fragment, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { CHANNELS, WOOD_BREEDS, STAR_LABELS, STAR_NAMES } from "@/lib/store";
import { toast } from "sonner";

const GET_REGISTRATIONS_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";
const ADD_CLIENT_URL = "https://functions.poehali.dev/16cf02a4-2bbe-4378-9c28-f8ad3393c028";
const GIVE_MAGNET_URL = "https://functions.poehali.dev/05adfa61-68b9-4eb5-95d0-a48462122ff3";

interface Registration {
  id: number;
  name: string;
  phone: string;
  channel: string;
  ozon_order_code: string | null;
  created_at: string;
  registered: boolean;
}

interface ClientMagnet {
  id: number;
  breed: string;
  stars: number;
  category: string;
  given_at: string;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 1) return digits ? "+7" : "";
  const d = digits.startsWith("7") ? digits : "7" + digits;
  let result = "+7";
  if (d.length > 1) result += ` (${d.slice(1, 4)}`;
  if (d.length > 4) result += `) ${d.slice(4, 7)}`;
  if (d.length > 7) result += `-${d.slice(7, 9)}`;
  if (d.length > 9) result += `-${d.slice(9, 11)}`;
  return result;
};

const starBg: Record<number, string> = {
  1: "bg-amber-50 border-amber-200",
  2: "bg-orange-50 border-orange-300",
  3: "bg-red-50 border-red-300",
};

interface ClientsSectionProps {
  focusClientId?: number | null;
  onFocusHandled?: () => void;
}

const ClientsSection = ({ focusClientId, onFocusHandled }: ClientsSectionProps) => {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState<string>("ozon");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [newOzonCode, setNewOzonCode] = useState("");
  const [saving, setSaving] = useState(false);

  const [clientMagnets, setClientMagnets] = useState<Record<number, ClientMagnet[]>>({});
  const [magnetsLoading, setMagnetsLoading] = useState<Record<number, boolean>>({});
  const [selectedBreed, setSelectedBreed] = useState("");
  const [givingMagnet, setGivingMagnet] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
      loadClientMagnets(focusClientId);
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
    if (expandedId !== null) {
      loadClientMagnets(expandedId);
      setSelectedBreed("");
    }
  }, [expandedId, loadClientMagnets]);

  const phoneDigits = newPhone.replace(/\D/g, "");
  const isOzonOnly = addMode === "ozon";
  const isFormValid = isOzonOnly
    ? newOzonCode.trim().length >= 3
    : newName.trim().length >= 2 && phoneDigits.length >= 11 && newChannel;

  const resetForm = () => { setNewName(""); setNewPhone(""); setNewChannel(""); setNewOzonCode(""); };

  const handleAdd = async () => {
    if (!isFormValid) return;
    setSaving(true);
    try {
      const body = isOzonOnly
        ? { ozon_order_code: newOzonCode.trim() }
        : { name: newName.trim(), phone: newPhone.trim(), channel: newChannel, ozon_order_code: newChannel === "Ozon" ? newOzonCode.trim() || null : null };
      const res = await fetch(ADD_CLIENT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success(`${isOzonOnly ? `Заказ ${newOzonCode.trim()}` : newName.trim()} — добавлен`);
      resetForm();
      setDialogOpen(false);
      loadClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось добавить клиента");
    } finally { setSaving(false); }
  };

  const handleGiveMagnet = async (regId: number) => {
    if (!selectedBreed) return;
    const breed = WOOD_BREEDS.find((b) => b.breed === selectedBreed);
    if (!breed) return;
    setGivingMagnet(true);
    try {
      const res = await fetch(GIVE_MAGNET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: regId, breed: breed.breed, stars: breed.stars, category: breed.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success(`${breed.breed} ${STAR_LABELS[breed.stars]} выдан`);
      setSelectedBreed("");
      loadClientMagnets(regId);
      loadInventory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось выдать магнит");
    } finally { setGivingMagnet(false); }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${ADD_CLIENT_URL}?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Клиент удалён");
      setConfirmDeleteId(null);
      if (expandedId === id) setExpandedId(null);
      loadClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось удалить");
    } finally { setDeletingId(null); }
  };

  const startEditClient = (client: Registration) => {
    setEditingClient(client.id);
    setEditName(client.name || "");
    setEditPhone(client.phone || "");
  };

  const handleSaveEdit = async (clientId: number) => {
    if (!editName.trim() && !editPhone.trim()) {
      toast.error("Укажите хотя бы имя или телефон");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(ADD_CLIENT_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientId, name: editName.trim(), phone: editPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Данные клиента обновлены");
      setEditingClient(null);
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? { ...c, name: data.client.name, phone: data.client.phone, registered: data.client.registered }
            : c
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSavingEdit(false);
    }
  };

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
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Icon name="UserPlus" size={16} />Добавить клиента</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Новый клиент</DialogTitle></DialogHeader>
            <Tabs value={addMode} onValueChange={(v) => { setAddMode(v); resetForm(); }} className="pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="ozon" className="flex-1">Только код Ozon</TabsTrigger>
                <TabsTrigger value="full" className="flex-1">Полные данные</TabsTrigger>
              </TabsList>
              <TabsContent value="ozon" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Код заказа Ozon</Label>
                  <Input placeholder="Например: 12345678-0001" value={newOzonCode} onChange={(e) => setNewOzonCode(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Клиент привяжет заказ при регистрации — записи объединятся</p>
                </div>
                <Button className="w-full" disabled={!isFormValid || saving} onClick={handleAdd}>
                  {saving ? <span className="flex items-center gap-2"><Icon name="Loader2" size={16} className="animate-spin" />Сохранение...</span> : "Добавить по коду Ozon"}
                </Button>
              </TabsContent>
              <TabsContent value="full" className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Имя</Label><Input placeholder="Имя клиента" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input type="tel" placeholder="+7 (___) ___-__-__" value={newPhone} onChange={(e) => setNewPhone(formatPhone(e.target.value))} />
                  <p className="text-xs text-muted-foreground">По этому номеру клиент увидит свои магниты на /my-collection</p>
                </div>
                <div className="space-y-2">
                  <Label>Канал</Label>
                  <Select value={newChannel} onValueChange={setNewChannel}>
                    <SelectTrigger><SelectValue placeholder="Откуда пришёл клиент" /></SelectTrigger>
                    <SelectContent>{CHANNELS.map((ch) => (<SelectItem key={ch} value={ch}>{ch}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                {newChannel === "Ozon" && (
                  <div className="space-y-2"><Label>Код заказа Ozon</Label><Input placeholder="Например: 12345678-0001" value={newOzonCode} onChange={(e) => setNewOzonCode(e.target.value)} /></div>
                )}
                <Button className="w-full" disabled={!isFormValid || saving} onClick={handleAdd}>
                  {saving ? <span className="flex items-center gap-2"><Icon name="Loader2" size={16} className="animate-spin" />Сохранение...</span> : "Добавить клиента"}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
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
              const magnets = clientMagnets[client.id] || [];
              const mLoading = magnetsLoading[client.id];
              const collectedBreeds = new Set(magnets.map((m) => m.breed));

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
                    <TableRow>
                      <TableCell colSpan={6} className="bg-slate-50/80 p-0">
                        <div className="p-6 space-y-5">
                          {editingClient === client.id ? (
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
                                <Button size="sm" className="h-8 gap-1" disabled={savingEdit} onClick={(e) => { e.stopPropagation(); handleSaveEdit(client.id); }}>
                                  {savingEdit ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
                                  Сохранить
                                </Button>
                                <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); setEditingClient(null); }}>
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 text-sm flex-wrap">
                              {client.name && <div className="flex items-center gap-1.5"><Icon name="User" size={14} className="text-orange-500" /><span className="font-medium">{client.name}</span></div>}
                              {client.phone && <div className="flex items-center gap-1.5"><Icon name="Phone" size={14} className="text-muted-foreground" />{client.phone}</div>}
                              {client.ozon_order_code && <div className="flex items-center gap-1.5"><Icon name="Package" size={14} className="text-blue-500" />Ozon: <strong>{client.ozon_order_code}</strong></div>}
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-orange-600 gap-1" onClick={(e) => { e.stopPropagation(); startEditClient(client); }}>
                                <Icon name="Pencil" size={12} />Редактировать
                              </Button>
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
                                onClick={(e) => { e.stopPropagation(); handleGiveMagnet(client.id); }}
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
                                  <Button size="sm" variant="destructive" disabled={deletingId === client.id} onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}>
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