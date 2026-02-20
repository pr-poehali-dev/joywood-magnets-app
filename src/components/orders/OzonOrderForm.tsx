import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { ADD_CLIENT_URL, OrderRecord } from "./types";
import MagnetPicker from "./MagnetPicker";

interface Props {
  onOrderCreated: (order: OrderRecord, clientId: number) => void;
}

const OzonOrderForm = ({ onOrderCreated }: Props) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingClient, setPendingClient] = useState<{ id: number; name: string } | null>(null);

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
          channel: "Ozon",
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

      setOrderNumber("");
      setAmount("");
      setPendingClient({ id: data.client_id, name: data.client_name });
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
        clientName={pendingClient.name}
        onDone={() => setPendingClient(null)}
      />
    );
  }

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
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Сумма (₽)</Label>
          <Input
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            min="0"
          />
        </div>
      </div>
      <Button
        className="gap-1.5 bg-orange-500 hover:bg-orange-600"
        disabled={submitting || !orderNumber.trim()}
        onClick={handleSubmit}
      >
        {submitting ? (
          <Icon name="Loader2" size={16} className="animate-spin" />
        ) : (
          <Icon name="Check" size={16} />
        )}
        Оформить заказ Ozon
      </Button>
    </div>
  );
};

export default OzonOrderForm;
