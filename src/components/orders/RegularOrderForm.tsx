import { useState, useRef, useEffect } from "react";
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
import Icon from "@/components/ui/icon";
import { CHANNELS } from "@/lib/store";
import { toast } from "sonner";
import { ADD_CLIENT_URL, ClientOption, OrderRecord } from "./types";
import MagnetPicker from "./MagnetPicker";

const NON_OZON_CHANNELS = CHANNELS.filter((ch) => ch !== "Ozon");

interface Props {
  clients: ClientOption[];
  onClientAdded: (client: ClientOption) => void;
  onOrderCreated: (order: OrderRecord, clientId: number) => void;
}

const RegularOrderForm = ({ clients, onClientAdded, onOrderCreated }: Props) => {
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClientLabel, setSelectedClientLabel] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [regularChannel, setRegularChannel] = useState("");
  const [regularAmount, setRegularAmount] = useState("");
  const [regularCode, setRegularCode] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  interface PendingBonus { count: number; type: string; reward: string; }
  const [pendingClient, setPendingClient] = useState<{ id: number; orderId: number; name: string; amount: number; isFirstOrder: boolean; isRegistered: boolean; pendingBonuses: PendingBonus[] } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isNewClient = selectedClientId === "__new__";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredClients = clients.filter((c) => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.channel.toLowerCase().includes(q)
    );
  });

  const selectClient = (id: string, label: string) => {
    setSelectedClientId(id);
    setSelectedClientLabel(label);
    setDropdownOpen(false);
    setClientSearch("");
    setNewClientName("");
    setNewClientPhone("");
  };

  const handleSubmit = async () => {
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
    if (!regularAmount || parseFloat(regularAmount) <= 0) {
      toast.error("Укажите сумму заказа");
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
        onClientAdded({
          id: clientId,
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          channel: regularChannel,
        });
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

      onOrderCreated(
        {
          id: data.order_id,
          order_code: data.order_code || "",
          amount: data.amount || 0,
          channel: data.channel,
          status: data.status || "active",
          created_at: data.created_at,
          registration_id: data.client_id,
          client_name: data.client_name,
          client_phone: data.client_phone || "",
        },
        data.client_id,
      );

      setSelectedClientId("");
      setSelectedClientLabel("");
      setClientSearch("");
      setRegularAmount("");
      setRegularCode("");
      setNewClientName("");
      setNewClientPhone("");
      setPendingClient({ id: data.client_id, orderId: data.order_id, name: data.client_name, amount: data.amount || 0, isFirstOrder: !!data.magnet_given, isRegistered: data.registered !== false, pendingBonuses: data.pending_bonuses || [] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка оформления");
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingClient) {
    return (
      <MagnetPicker
        registrationId={pendingClient.id}
        orderId={pendingClient.orderId}
        clientName={pendingClient.name}
        orderAmount={pendingClient.amount}
        isFirstOrder={pendingClient.isFirstOrder}
        isRegistered={pendingClient.isRegistered}
        pendingBonuses={pendingClient.pendingBonuses}
        onDone={() => setPendingClient(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Клиент</Label>
          <div className="relative" ref={dropdownRef}>
            <div
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent/20"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <span className={selectedClientId ? "text-foreground" : "text-muted-foreground"}>
                {selectedClientId ? selectedClientLabel : "Выберите клиента"}
              </span>
              <Icon name="ChevronsUpDown" size={14} className="text-muted-foreground shrink-0" />
            </div>

            {dropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg">
                <div className="p-2 border-b">
                  <Input
                    autoFocus
                    placeholder="Поиск по имени, телефону..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="max-h-[220px] overflow-y-auto">
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center gap-1.5 text-orange-600 font-medium"
                    onMouseDown={(e) => { e.preventDefault(); selectClient("__new__", "+ Новый клиент"); }}
                  >
                    <Icon name="UserPlus" size={14} />
                    + Новый клиент
                  </button>
                  {filteredClients.slice(0, 50).map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectClient(String(c.id), `${c.name || "Без имени"}${c.phone ? ` · ${c.phone}` : ""}`);
                      }}
                    >
                      <span className="font-medium">{c.name || "Без имени"}</span>
                      {c.phone && <span className="text-muted-foreground text-xs ml-1.5">{c.phone}</span>}
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-3">Не найдено</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Канал</Label>
          <Select value={regularChannel} onValueChange={setRegularChannel}>
            <SelectTrigger>
              <SelectValue placeholder="Канал продажи" />
            </SelectTrigger>
            <SelectContent>
              {NON_OZON_CHANNELS.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {ch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isNewClient && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border border-orange-200 rounded-lg bg-orange-50">
          <div className="space-y-1.5">
            <Label className="text-orange-700">Имя клиента <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Введите имя"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className="border-orange-200 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-orange-700">Телефон <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
            <Input
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              className="border-orange-200 bg-white"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Сумма (₽)</Label>
          <Input
            type="number"
            placeholder="0"
            value={regularAmount}
            onChange={(e) => setRegularAmount(e.target.value)}
            min="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Номер заказа <span className="text-muted-foreground font-normal text-xs">(необязательно)</span></Label>
          <Input
            placeholder="Артикул, номер чека..."
            value={regularCode}
            onChange={(e) => setRegularCode(e.target.value)}
            className="font-mono"
          />
        </div>
      </div>

      <Button
        className="gap-1.5 bg-orange-500 hover:bg-orange-600"
        disabled={submitting || !selectedClientId || !regularChannel || (isNewClient && !newClientName.trim())}
        onClick={handleSubmit}
      >
        {submitting ? (
          <Icon name="Loader2" size={16} className="animate-spin" />
        ) : (
          <Icon name="Plus" size={16} />
        )}
        Оформить заказ
      </Button>
    </div>
  );
};

export default RegularOrderForm;