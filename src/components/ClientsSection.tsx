import { useState, useEffect, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
const REGISTER_URL = "https://functions.poehali.dev/40f9e8db-184c-407c-ace9-d0877ed306b9";

interface Registration {
  id: number;
  name: string;
  phone: string;
  channel: string;
  ozon_order_code: string | null;
  created_at: string;
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

  const isOzon = newChannel === "Ozon";
  const phoneDigits = newPhone.replace(/\D/g, "");
  const isFormValid =
    newName.trim().length >= 2 &&
    phoneDigits.length >= 11 &&
    newChannel &&
    (!isOzon || newOzonCode.trim().length >= 3);

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
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          channel: newChannel,
          ozon_order_code: isOzon ? newOzonCode.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success(`Клиент ${newName.trim()} добавлен`);
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
      c.channel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Icon
            name="Search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Поиск по имени, телефону или каналу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="text-sm">
          {filtered.length} клиентов
        </Badge>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <div className="space-y-4 pt-2">
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
                  По этому номеру клиент сможет посмотреть свои магниты на странице /my-collection
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
              {isOzon && (
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
            </div>
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
              <TableHead>Дата регистрации</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
                        {client.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.phone}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {client.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.ozon_order_code || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-slate-50/80 p-0">
                        <div className="p-6 space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Icon name="User" size={14} className="text-orange-500" />
                            <span className="font-medium">{client.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon name="Phone" size={14} className="text-muted-foreground" />
                            <span>{client.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon name="MapPin" size={14} className="text-muted-foreground" />
                            <span>Канал: {client.channel}</span>
                          </div>
                          {client.ozon_order_code && (
                            <div className="flex items-center gap-2">
                              <Icon name="Package" size={14} className="text-blue-500" />
                              <span>Ozon заказ: <strong>{client.ozon_order_code}</strong></span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Icon name="CalendarDays" size={14} />
                            <span>Зарегистрирован: {new Date(client.created_at).toLocaleString("ru-RU")}</span>
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
                  colSpan={5}
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
