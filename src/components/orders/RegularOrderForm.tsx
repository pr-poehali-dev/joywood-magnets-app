import { useState } from "react";
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

interface Props {
  clients: ClientOption[];
  onClientAdded: (client: ClientOption) => void;
  onOrderCreated: (order: OrderRecord, clientId: number) => void;
}

const RegularOrderForm = ({ clients, onClientAdded, onOrderCreated }: Props) => {
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [regularChannel, setRegularChannel] = useState("");
  const [regularAmount, setRegularAmount] = useState("");
  const [regularCode, setRegularCode] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isNewClient = selectedClientId === "__new__";

  const filteredClients = clients.filter((c) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.channel.toLowerCase().includes(q)
    );
  });

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
      setSelectedClientId("");
      setRegularAmount("");
      setRegularCode("");
      setNewClientName("");
      setNewClientPhone("");

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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка оформления");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Клиент</Label>
        <Input
          placeholder="Поиск клиента по имени, телефону..."
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="mb-1"
        />
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите клиента" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__new__">
              <span className="flex items-center gap-2 text-orange-600 font-medium">
                <Icon name="UserPlus" size={14} />
                + Новый клиент
              </span>
            </SelectItem>
            {filteredClients.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name || "—"} {c.phone ? `· ${c.phone}` : ""}{" "}
                <span className="text-muted-foreground text-xs">({c.channel})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isNewClient && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border border-orange-200 rounded-lg bg-orange-50">
          <div className="space-y-1.5">
            <Label className="text-orange-700">Имя нового клиента</Label>
            <Input
              placeholder="Имя"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className="border-orange-200 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-orange-700">Телефон (необязательно)</Label>
            <Input
              placeholder="+7..."
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              className="border-orange-200 bg-white"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Канал</Label>
          <Select value={regularChannel} onValueChange={setRegularChannel}>
            <SelectTrigger>
              <SelectValue placeholder="Канал" />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {ch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Сумма (₽)</Label>
          <Input
            type="number"
            placeholder="0"
            value={regularAmount}
            onChange={(e) => setRegularAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Код заказа (необязательно)</Label>
          <Input
            placeholder="Номер / код"
            value={regularCode}
            onChange={(e) => setRegularCode(e.target.value)}
          />
        </div>
      </div>

      <Button
        className="gap-1.5"
        disabled={submitting || !selectedClientId || !regularChannel}
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
