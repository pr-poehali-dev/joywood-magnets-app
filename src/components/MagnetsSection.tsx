import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import {
  WOOD_BREEDS,
  STAR_LABELS,
  getMagnetRecommendation,
} from "@/lib/store";
import type { Client, MagnetRecommendation } from "@/lib/store";

const categories = [...new Set(WOOD_BREEDS.map((b) => b.category))];

const categoryColors: Record<string, string> = {
  "Обычный": "bg-amber-50 border-amber-200",
  "Особенный": "bg-orange-50 border-orange-300",
  "Элитный": "bg-red-50 border-red-200",
};

const categoryBadgeColors: Record<string, string> = {
  "Обычный": "bg-amber-100 text-amber-800",
  "Особенный": "bg-orange-100 text-orange-800",
  "Элитный": "bg-red-100 text-red-800",
};

function makeVirtualClient(totalSpent: number, isNew: boolean): Client {
  return {
    id: "__calc__",
    name: "Калькулятор",
    phone: "",
    email: "",
    channels: [],
    totalSpent,
    ordersCount: isNew ? 0 : 1,
    magnetsCollected: [],
    uniqueBreeds: 0,
    status: "active",
    createdAt: "",
    notes: "",
  };
}

const MagnetsSection = () => {
  const [orderAmount, setOrderAmount] = useState<number>(0);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [starsFilter, setStarsFilter] = useState<string>("all");

  const recommendation: MagnetRecommendation | null = useMemo(() => {
    if (orderAmount <= 0) return null;
    const virtualClient = makeVirtualClient(totalSpent, isFirstOrder);
    return getMagnetRecommendation({
      client: virtualClient,
      amount: orderAmount,
      isFirstOrder,
    });
  }, [orderAmount, isFirstOrder, totalSpent]);

  const filteredBreeds = WOOD_BREEDS.filter((b) => {
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    if (starsFilter !== "all" && b.stars !== Number(starsFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon name="Calculator" size={20} className="text-orange-500" />
            Калькулятор магнитов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Сумма заказа</Label>
              <Input
                type="number"
                placeholder="0"
                value={orderAmount || ""}
                onChange={(e) => setOrderAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Общая сумма клиента</Label>
              <Input
                type="number"
                placeholder="0"
                value={totalSpent || ""}
                onChange={(e) => setTotalSpent(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="firstOrder"
                  checked={isFirstOrder}
                  onCheckedChange={(v) => setIsFirstOrder(v === true)}
                />
                <Label htmlFor="firstOrder" className="text-sm cursor-pointer">
                  Новый участник (нет магнитов)
                </Label>
              </div>
            </div>
          </div>
          {recommendation && (
            <div className="bg-white rounded-lg border border-orange-200 p-4 flex items-center gap-3">
              <Icon name="Gift" size={22} className="text-orange-500 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">
                  Рекомендация
                </div>
                <div className="font-semibold text-sm">{recommendation.message}</div>
                {recommendation.bonus && (
                  <div className="text-xs text-orange-600 mt-1">
                    + Стартовый {recommendation.bonus.breed} {STAR_LABELS[recommendation.bonus.stars]}
                  </div>
                )}
                {recommendation.startStars && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Категория: {STAR_LABELS[recommendation.startStars]}
                    {recommendation.startStars >= 2 && " (VIP или перелив)"}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-lg">Атлас пород</h3>
        <div className="flex-1" />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={starsFilter} onValueChange={setStarsFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Звёзды" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все звёзды</SelectItem>
            <SelectItem value="1">1 звезда</SelectItem>
            <SelectItem value="2">2 звезды</SelectItem>
            <SelectItem value="3">3 звезды</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredBreeds.map((breed) => (
          <Card
            key={breed.breed}
            className={`transition-all hover:shadow-md ${categoryColors[breed.category] || ""}`}
          >
            <CardContent className="p-4">
              <div className="text-center mb-2">
                <div className="text-xl">{STAR_LABELS[breed.stars]}</div>
              </div>
              <h4 className="font-semibold text-center mb-2">{breed.breed}</h4>
              <div className="flex justify-center mb-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryBadgeColors[breed.category] || ""}`}
                >
                  {breed.category}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">В наличии:</span>
                  <span
                    className={`font-medium ${breed.inStock < 10 ? "text-red-600" : "text-green-700"}`}
                  >
                    {breed.inStock}
                    {breed.inStock < 10 && (
                      <Icon
                        name="AlertTriangle"
                        size={12}
                        className="inline ml-1 text-red-500"
                      />
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Выдано:</span>
                  <span className="font-medium">{breed.totalGiven}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBreeds.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Породы не найдены по выбранным фильтрам
        </div>
      )}
    </div>
  );
};

export default MagnetsSection;