import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import {
  DEMO_CLIENTS,
  DEMO_ORDERS,
  CHANNELS,
  WOOD_BREEDS,
  STAR_LABELS,
  getMagnetRecommendation,
  formatMoney,
  formatDate,
} from "@/lib/store";

const OrdersSection = () => {
  const [selectedClient, setSelectedClient] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [channel, setChannel] = useState("");
  const [isFirst, setIsFirst] = useState(false);
  const [selectedMagnets, setSelectedMagnets] = useState<string[]>([]);

  const client = DEMO_CLIENTS.find((c) => c.id === selectedClient);
  const totalSpent = client?.totalSpent ?? 0;

  const recommendation = useMemo(() => {
    if (amount <= 0) return "";
    return getMagnetRecommendation(amount, isFirst, totalSpent);
  }, [amount, isFirst, totalSpent]);

  const availableBreeds = WOOD_BREEDS.filter((b) => b.inStock > 0);

  const toggleMagnet = (breed: string) => {
    setSelectedMagnets((prev) =>
      prev.includes(breed)
        ? prev.filter((b) => b !== breed)
        : [...prev, breed]
    );
  };

  const recentOrders = [...DEMO_ORDERS]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleReset = () => {
    setSelectedClient("");
    setAmount(0);
    setChannel("");
    setIsFirst(false);
    setSelectedMagnets([]);
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon name="Plus" size={20} className="text-orange-500" />
            Новый заказ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Клиент</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_CLIENTS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сумма заказа</Label>
              <Input
                type="number"
                placeholder="0"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Канал</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите канал" />
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
            <div className="flex items-end pb-0.5">
              <div className="flex items-center space-x-2">
                <Switch
                  id="first-order"
                  checked={isFirst}
                  onCheckedChange={setIsFirst}
                />
                <Label htmlFor="first-order" className="cursor-pointer">
                  Первый заказ
                </Label>
              </div>
            </div>
          </div>

          {client && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm flex items-center gap-4">
              <Icon name="User" size={16} className="text-muted-foreground" />
              <span>
                {client.name} | Общая сумма:{" "}
                <span className="font-semibold">
                  {formatMoney(client.totalSpent)}
                </span>{" "}
                | Магнитов: {client.magnetsCollected.length} | Пород:{" "}
                {client.uniqueBreeds}
              </span>
            </div>
          )}

          {recommendation && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
              <Icon name="Gift" size={22} className="text-orange-500 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">
                  Рекомендация по магнитам
                </div>
                <div className="font-semibold text-sm">{recommendation}</div>
              </div>
            </div>
          )}

          {recommendation && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Выберите магниты для выдачи
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {availableBreeds.map((breed) => {
                  const isSelected = selectedMagnets.includes(breed.breed);
                  return (
                    <div
                      key={breed.breed}
                      onClick={() => toggleMagnet(breed.breed)}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all text-sm ${
                        isSelected
                          ? "border-orange-400 bg-orange-50 shadow-sm"
                          : "border-gray-200 hover:border-orange-200"
                      }`}
                    >
                      <Checkbox checked={isSelected} />
                      <span className="font-medium">{breed.breed}</span>
                      <span className="text-xs ml-auto">
                        {STAR_LABELS[breed.stars]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Icon name="Check" size={16} className="mr-2" />
              Оформить заказ
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Icon name="Clock" size={20} className="text-muted-foreground" />
          Последние заказы
        </h3>
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {order.id}
                    </span>
                    <span className="font-medium">{order.clientName}</span>
                    <Badge variant="outline" className="text-xs">
                      {order.channel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {order.magnetsGiven.map((m) => (
                        <span
                          key={m.id}
                          className="bg-orange-50 text-orange-800 border border-orange-200 rounded-full px-2 py-0.5 text-xs"
                        >
                          {m.breed} {STAR_LABELS[m.stars]}
                        </span>
                      ))}
                    </div>
                    <span className="font-semibold">
                      {formatMoney(order.amount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.date)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdersSection;
