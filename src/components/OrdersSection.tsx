import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const ADD_CLIENT_URL =
  "https://functions.poehali.dev/16cf02a4-2bbe-4378-9c28-f8ad3393c028";

interface Props {
  onOrderCreated?: (clientId: number) => void;
}

const OrdersSection = ({ onOrderCreated }: Props) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [channel, setChannel] = useState("Ozon");
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

      if (onOrderCreated && data.client_id) {
        onOrderCreated(data.client_id);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка оформления");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon name="ShoppingCart" size={20} className="text-orange-500" />
            Оформить заказ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-start gap-2">
            <Icon
              name="Info"
              size={16}
              className="text-amber-600 mt-0.5 shrink-0"
            />
            <span>
              Введите полный номер заказа (например,{" "}
              <span className="font-mono font-semibold">12345678-0001</span>).
              Если клиент с таким номером (до дефиса) уже есть — заказ
              добавится к нему. Иначе будет создан новый клиент.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Номер заказа</Label>
              <Input
                placeholder="12345678-0001"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !submitting) handleSubmit();
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
                    <SelectItem key={ch} value={ch}>
                      {ch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleSubmit}
            disabled={submitting || !orderNumber.trim()}
          >
            {submitting ? (
              <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
            ) : (
              <Icon name="Check" size={16} className="mr-2" />
            )}
            Оформить заказ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersSection;
