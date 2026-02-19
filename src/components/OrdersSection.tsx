import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import { CHANNELS } from "@/lib/store";
import { toast } from "sonner";

const ADD_CLIENT_URL =
  "https://functions.poehali.dev/16cf02a4-2bbe-4378-9c28-f8ad3393c028";
const GET_REGISTRATIONS_URL =
  "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";

interface Props {
  onOrderCreated?: (clientId: number) => void;
}

interface ClientOption {
  id: number;
  name: string;
  phone: string;
  channel: string;
}

interface OrderRecord {
  id: number;
  order_code: string;
  amount: number;
  channel: string;
  status: string;
  created_at: string;
  registration_id: number;
  client_name: string;
  client_phone: string;
}

const OrdersSection = ({ onOrderCreated }: Props) => {
  const [mode, setMode] = useState("ozon");

  const [orderNumber, setOrderNumber] = useState("");
  const [channel, setChannel] = useState("Ozon");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [regularChannel, setRegularChannel] = useState("");
  const [regularAmount, setRegularAmount] = useState("");
  const [regularCode, setRegularCode] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  const isNewClient = selectedClientId === "__new__";

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState("all");

  const loadOrders = useCallback(() => {
    setOrdersLoading(true);
    fetch(`${GET_REGISTRATIONS_URL}?action=orders`)
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => {
    fetch(GET_REGISTRATIONS_URL)
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {});
    loadOrders();
  }, [loadOrders]);

  const handleOzonSubmit = async () => {
    if (!orderNumber.trim() || orderNumber.trim().length < 3) {
      toast.error("Введите номер заказа (минимум 3 символа)");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(ADD_CLIENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_order",
          order_number: orderNumber.trim(),
          channel,
          amount: parseFloat(amount) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");

      if (data.is_new) {
        toast.success(`Создан новый клиент: ${data.client_name}`);
      } else {
        toast.success(`Заказ добавлен к клиенту: ${data.client_name}`);
      }

      setOrderNumber("");
      setAmount("");
      setOrders((prev) => [{
        id: data.order_id,
        order_code: data.order_code || "",
        amount: data.amount || 0,
        channel: data.channel,
        status: data.status || "active",
        created_at: data.created_at,
        registration_id: data.client_id,
        client_name: data.client_name,
        client_phone: data.client_phone || "",
      }, ...prev]);

      if (onOrderCreated && data.client_id) {
        onOrderCreated(data.client_id);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка оформления");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegularSubmit = async () => {
    if (!selectedClientId) {
      toast.error("Выберите клиента");
      return;
    }
    if (!regularChannel) {
      toast.error("Выберите канал");
      return;
    }
    if (isNewClient && !newClientName.trim()) {
      toast.error("Укажите имя нового клиента");
      return;
    }

    setSubmitting(true);
    try {
      let clientId: number;

      if (isNewClient) {
        const addRes = await fetch(ADD_CLIENT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newClientName.trim(),
            phone: newClientPhone.trim(),
            channel: regularChannel,
          }),
        });
        const addData = await addRes.json();
        if (!addRes.ok) throw new Error(addData.error || "Ошибка создания клиента");
        clientId = addData.id;
        setClients((prev) => [...prev, { id: clientId, name: newClientName.trim(), phone: newClientPhone.trim(), channel: regularChannel }]);
      } else {
        clientId = parseInt(selectedClientId);
      }

      const res = await fetch(ADD_CLIENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_order",
          client_id: clientId,
          channel: regularChannel,
          amount: parseFloat(regularAmount) || 0,
          order_number: regularCode.trim() || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");

      toast.success(`Заказ оформлен: ${data.client_name}`);
      setSelectedClientId("");
      setRegularAmount("");
      setRegularCode("");
      setNewClientName("");
      setNewClientPhone("");
      setOrders((prev) => [{
        id: data.order_id,
        order_code: data.order_code || "",
        amount: data.amount || 0,
        channel: data.channel,
        status: data.status || "active",
        created_at: data.created_at,
        registration_id: data.client_id,
        client_name: data.client_name,
        client_phone: data.client_phone || "",
      }, ...prev]);

      if (onOrderCreated && data.client_id) {
        onOrderCreated(data.client_id);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка оформления");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.channel.toLowerCase().includes(q)
    );
  });

  const filteredOrders = orders.filter((o) => {
    if (channelFilter !== "all" && o.channel !== channelFilter) return false;
    return true;
  });

  const totalSum = filteredOrders.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="space-y-6">
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon name="ShoppingCart" size={20} className="text-orange-500" />
            Оформить заказ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="mb-4">
              <TabsTrigger value="ozon" className="flex items-center gap-1.5">
                <Icon name="Package" size={14} />
                По номеру заказа
              </TabsTrigger>
              <TabsTrigger value="regular" className="flex items-center gap-1.5">
                <Icon name="User" size={14} />
                Для клиента
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ozon" className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-start gap-2">
                <Icon name="Info" size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <span>
                  Введите номер заказа (например,{" "}
                  <span className="font-mono font-semibold">12345678-0001</span>).
                  Если клиент с таким номером (до дефиса) уже есть — заказ
                  добавится к нему. Иначе будет создан новый клиент.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Номер заказа</Label>
                  <Input
                    placeholder="12345678-0001"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !submitting) handleOzonSubmit();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Канал</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => (
                        <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Сумма, ₽</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !submitting) handleOzonSubmit();
                    }}
                  />
                </div>
              </div>

              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={handleOzonSubmit}
                disabled={submitting || !orderNumber.trim()}
              >
                {submitting ? (
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                ) : (
                  <Icon name="Check" size={16} className="mr-2" />
                )}
                Оформить заказ
              </Button>
            </TabsContent>

            <TabsContent value="regular" className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm flex items-start gap-2">
                <Icon name="Info" size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <span>
                  Оформите заказ для существующего клиента — при покупке в магазине, через мессенджеры или другие каналы.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Клиент</Label>
                  <Select value={selectedClientId} onValueChange={(v) => { setSelectedClientId(v); setNewClientName(""); setNewClientPhone(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите клиента" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <Input
                          placeholder="Поиск по имени, телефону..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="h-8 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <SelectItem value="__new__">
                        <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                          <Icon name="UserPlus" size={14} />
                          + Новый клиент
                        </span>
                      </SelectItem>
                      {filteredClients.slice(0, 30).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name || "Без имени"} {c.phone ? `· ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                      {filteredClients.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-2">Не найдено</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Канал</Label>
                  <Select value={regularChannel} onValueChange={setRegularChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Канал продажи" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => (
                        <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isNewClient && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="space-y-2">
                    <Label>Имя клиента <span className="text-red-500">*</span></Label>
                    <Input placeholder="Введите имя" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Телефон <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
                    <Input type="tel" placeholder="+7 (___) ___-__-__" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Сумма, ₽</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={regularAmount}
                    onChange={(e) => setRegularAmount(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Номер заказа <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
                  <Input
                    placeholder="Артикул, номер чека..."
                    value={regularCode}
                    onChange={(e) => setRegularCode(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={handleRegularSubmit}
                disabled={submitting || !selectedClientId || !regularChannel || (isNewClient && !newClientName.trim())}
              >
                {submitting ? (
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                ) : (
                  <Icon name="Check" size={16} className="mr-2" />
                )}
                Оформить заказ
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Icon name="History" size={20} className="text-orange-500" />
            История заказов
          </h3>
          <div className="flex-1" />
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Канал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все каналы</SelectItem>
              {CHANNELS.map((ch) => (
                <SelectItem key={ch} value={ch}>{ch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filteredOrders.length} заказов</Badge>
          {totalSum > 0 && (
            <Badge variant="outline" className="text-green-700 border-green-300">
              {totalSum.toLocaleString("ru-RU")} ₽
            </Badge>
          )}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиент</TableHead>
                <TableHead>Номер заказа</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Канал</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />
                    Загрузка...
                  </TableCell>
                </TableRow>
              )}
              {!ordersLoading && filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-orange-50/30">
                  <TableCell className="font-medium">
                    {order.client_name || "—"}
                    {order.client_phone && (
                      <span className="text-muted-foreground text-xs ml-1.5">{order.client_phone}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {order.order_code || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {order.amount > 0 ? `${order.amount.toLocaleString("ru-RU")} ₽` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{order.channel}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                </TableRow>
              ))}
              {!ordersLoading && filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Icon name="ShoppingCart" size={40} className="mx-auto mb-3 opacity-30" />
                    Заказов пока нет
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default OrdersSection;