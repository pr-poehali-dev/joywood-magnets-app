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
import { ADD_CLIENT_URL, OrderRecord } from "./types";

interface Props {
  onOrderCreated: (order: OrderRecord, clientId: number) => void;
}

const OzonOrderForm = ({ onOrderCreated }: Props) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [channel, setChannel] = useState("Ozon");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Номер заказа Ozon</Label>
          <Input
            placeholder="Например: 12345678-0001"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Сумма (₽)</Label>
          <Input
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1.5 min-w-[180px]">
          <Label>Канал</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger>
              <SelectValue />
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
        <Button
          className="gap-1.5"
          disabled={submitting || !orderNumber.trim()}
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
    </div>
  );
};

export default OzonOrderForm;
