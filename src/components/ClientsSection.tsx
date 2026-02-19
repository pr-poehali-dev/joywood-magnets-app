import { useState, useEffect, Fragment } from "react";
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
import { CHANNELS } from "@/lib/store";
import { toast } from "sonner";

const GET_REGISTRATIONS_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";
const ADD_CLIENT_URL = "https://functions.poehali.dev/16cf02a4-2bbe-4378-9c28-f8ad3393c028";

interface Registration {
  id: number;
  name: string;
  phone: string;
  channel: string;
  ozon_order_code: string | null;
  created_at: string;
  registered: boolean;
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

const ClientsSection = () => {
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

  const loadClients = () => {
    setLoading(true);
    fetch(GET_REGISTRATIONS_URL)
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClients();
  }, []);

  const phoneDigits = newPhone.replace(/\D/g, "");

  const isOzonOnly = addMode === "ozon";
  const isFormValid = isOzonOnly
    ? newOzonCode.trim().length >= 3
    : newName.trim().length >= 2 && phoneDigits.length >= 11 && newChannel;

  const resetForm = () => {
    setNewName("");
    setNewPhone("");
    setNewChannel("");
    setNewOzonCode("");
  };

  const handleAdd = async () => {
    if (!isFormValid) return;
    setSaving(true);
    try {
      const body = isOzonOnly
        ? { ozon_order_code: newOzonCode.trim() }
        : {
            name: newName.trim(),
            phone: newPhone.trim(),
            channel: newChannel,
            ozon_order_code: newChannel === "Ozon" ? newOzonCode.trim() || null : null,
          };

      const res = await fetch(ADD_CLIENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");

      const label = isOzonOnly ? `Заказ ${newOzonCode.trim()}` : newName.trim();
      toast.success(`${label} — добавлен`);
      resetForm();
      setDialogOpen(false);
      loadClients();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось добавить клиента";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.channel.toLowerCase().includes(q) ||
      (c.ozon_order_code || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Icon
            name="Search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Поиск по имени, телефону, каналу, коду Ozon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="text-sm">
          {filtered.length} клиентов
        </Badge>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Icon name="UserPlus" size={16} />
              Добавить клиента
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Новый клиент</DialogTitle>
            </DialogHeader>
            <Tabs value={addMode} onValueChange={(v) => { setAddMode(v); resetForm(); }} className="pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="ozon" className="flex-1">Только код Ozon</TabsTrigger>
                <TabsTrigger value="full" className="flex-1">Полные данные</TabsTrigger>
              </TabsList>

              <TabsContent value="ozon" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Код заказа Ozon</Label>
                  <Input
                    placeholder="Например: 12345678-0001"
                    value={newOzonCode}
                    onChange={(e) => setNewOzonCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Клиент сможет привязать этот заказ при регистрации — записи объединятся автоматически
                  </p>
                </div>
                <Button
                  className="w-full"
                  disabled={!isFormValid || saving}
                  onClick={handleAdd}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Icon name="Loader2" size={16} className="animate-spin" />
                      Сохранение...
                    </span>
                  ) : (
                    "Добавить по коду Ozon"
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="full" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Имя</Label>
                  <Input
                    placeholder="Имя клиента"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    type="tel"
                    placeholder="+7 (___) ___-__-__"
                    value={newPhone}
                    onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    По этому номеру клиент увидит свои магниты на /my-collection
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Канал</Label>
                  <Select value={newChannel} onValueChange={setNewChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Откуда пришёл клиент" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => (
                        <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newChannel === "Ozon" && (
                  <div className="space-y-2">
                    <Label>Код заказа Ozon</Label>
                    <Input
                      placeholder="Например: 12345678-0001"
                      value={newOzonCode}
                      onChange={(e) => setNewOzonCode(e.target.value)}
                    />
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={!isFormValid || saving}
                  onClick={handleAdd}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Icon name="Loader2" size={16} className="animate-spin" />
                      Сохранение...
                    </span>
                  ) : (
                    "Добавить клиента"
                  )}
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
              <TableHead>Код заказа Ozon</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />
                  Загрузка...
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.map((client) => {
              const isExpanded = expandedId === client.id;
              return (
                <Fragment key={client.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-orange-50/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : client.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Icon
                          name={isExpanded ? "ChevronDown" : "ChevronRight"}
                          size={16}
                          className="text-muted-foreground"
                        />
                        {client.name || <span className="text-muted-foreground italic">Не указано</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.phone || "—"}
                    </TableCell>
                    <TableCell>
                      {client.channel ? (
                        <Badge variant="outline" className="text-xs">{client.channel}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {client.ozon_order_code || "—"}
                    </TableCell>
                    <TableCell>
                      {client.registered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Icon name="CheckCircle" size={12} />
                          Зарегистрирован
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Icon name="Clock" size={12} />
                          Ожидает регистрации
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(client.created_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-slate-50/80 p-0">
                        <div className="p-6 space-y-2 text-sm">
                          {client.name && (
                            <div className="flex items-center gap-2">
                              <Icon name="User" size={14} className="text-orange-500" />
                              <span className="font-medium">{client.name}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2">
                              <Icon name="Phone" size={14} className="text-muted-foreground" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.channel && (
                            <div className="flex items-center gap-2">
                              <Icon name="MapPin" size={14} className="text-muted-foreground" />
                              <span>Канал: {client.channel}</span>
                            </div>
                          )}
                          {client.ozon_order_code && (
                            <div className="flex items-center gap-2">
                              <Icon name="Package" size={14} className="text-blue-500" />
                              <span>Ozon заказ: <strong>{client.ozon_order_code}</strong></span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Icon name="CalendarDays" size={14} />
                            <span>Добавлен: {new Date(client.created_at).toLocaleString("ru-RU")}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />
                  Клиенты не найдены
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ClientsSection;
