import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

const GIVE_MAGNET_URL = "https://functions.poehali.dev/05adfa61-68b9-4eb5-95d0-a48462122ff3";

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

interface InventoryMap {
  [breed: string]: { stars: number; category: string; stock: number };
}

const MagnetsSection = () => {
  const [orderAmount, setOrderAmount] = useState<number>(0);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [starsFilter, setStarsFilter] = useState<string>("all");

  const [inventory, setInventory] = useState<InventoryMap>({});
  const [editingBreed, setEditingBreed] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loadingInv, setLoadingInv] = useState(true);

  const loadInventory = useCallback(() => {
    setLoadingInv(true);
    fetch(`${GIVE_MAGNET_URL}?action=inventory`)
      .then((r) => r.json())
      .then((data) => setInventory(data.inventory || {}))
      .catch(() => {})
      .finally(() => setLoadingInv(false));
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const handleSaveStock = async (breed: string, stars: number, category: string) => {
    const stock = parseInt(editStock, 10);
    if (isNaN(stock) || stock < 0) { toast.error("Укажите корректное количество"); return; }
    setSaving(true);
    try {
      const res = await fetch(GIVE_MAGNET_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ breed, stars, category, stock }] }),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
      setInventory((prev) => ({ ...prev, [breed]: { stars, category, stock } }));
      setEditingBreed(null);
      toast.success(`${breed} — остаток: ${stock}`);
    } catch {
      toast.error("Не удалось сохранить");
    } finally { setSaving(false); }
  };

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

  const totalStock = Object.values(inventory).reduce((s, v) => s + v.stock, 0);
  const lowStockCount = WOOD_BREEDS.filter((b) => {
    const inv = inventory[b.breed];
    return inv && inv.stock > 0 && inv.stock < 5;
  }).length;
  const outOfStockCount = WOOD_BREEDS.filter((b) => {
    const inv = inventory[b.breed];
    return !inv || inv.stock === 0;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-orange-200">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{totalStock}</div>
            <div className="text-xs text-muted-foreground">Всего на складе</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-green-600">{WOOD_BREEDS.length - outOfStockCount}</div>
            <div className="text-xs text-muted-foreground">Пород в наличии</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            <div className="text-xs text-muted-foreground">Мало (менее 5)</div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <div className="text-xs text-muted-foreground">Нет в наличии</div>
          </CardContent>
        </Card>
      </div>

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

      {loadingInv ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />
          Загрузка остатков...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredBreeds.map((breed) => {
            const inv = inventory[breed.breed];
            const stock = inv ? inv.stock : 0;
            const isEditing = editingBreed === breed.breed;

            return (
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
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">В наличии:</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            className="h-6 w-16 text-xs text-right px-1"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveStock(breed.breed, breed.stars, breed.category);
                              if (e.key === "Escape") setEditingBreed(null);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={saving}
                            onClick={() => handleSaveStock(breed.breed, breed.stars, breed.category)}
                          >
                            {saving ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Check" size={12} className="text-green-600" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => setEditingBreed(null)}
                          >
                            <Icon name="X" size={12} className="text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className={`font-medium cursor-pointer hover:underline ${stock === 0 ? "text-red-600" : stock < 5 ? "text-yellow-600" : "text-green-700"}`}
                          onClick={() => { setEditingBreed(breed.breed); setEditStock(String(stock)); }}
                        >
                          {stock}
                          {stock === 0 && (
                            <Icon name="AlertTriangle" size={12} className="inline ml-1 text-red-500" />
                          )}
                          {stock > 0 && stock < 5 && (
                            <Icon name="AlertTriangle" size={12} className="inline ml-1 text-yellow-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loadingInv && filteredBreeds.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Породы не найдены по выбранным фильтрам
        </div>
      )}
    </div>
  );
};

export default MagnetsSection;
