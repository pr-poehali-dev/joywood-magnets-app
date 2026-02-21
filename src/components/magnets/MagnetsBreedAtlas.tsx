import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { WOOD_BREEDS, STAR_LABELS } from "@/lib/store";
import { toast } from "sonner";
import { API_URLS } from "@/lib/api";

interface Props {
  inventory: Record<string, { stock: number }>;
  loadingInv: boolean;
  setStockForBreed: (breed: string, stock: number) => void;
}

const MagnetsBreedAtlas = ({ inventory, loadingInv, setStockForBreed }: Props) => {
  const [starsFilter, setStarsFilter] = useState<string>("all");
  const [editingBreed, setEditingBreed] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSaveStock = useCallback(async (breed: string, stars: number, category: string) => {
    const stock = parseInt(editStock, 10);
    if (isNaN(stock) || stock < 0) { toast.error("Укажите корректное количество"); return; }
    setSaving(true);
    try {
      const res = await fetch(API_URLS.GIVE_MAGNET, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ breed, stars, category, stock }] }),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
      setStockForBreed(breed, stock);
      setEditingBreed(null);
      toast.success(`${breed} — остаток: ${stock}`);
    } catch {
      toast.error("Не удалось сохранить");
    } finally { setSaving(false); }
  }, [editStock, setStockForBreed]);

  const filteredBreeds = useMemo(() => {
    const filtered = WOOD_BREEDS.filter((b) => {
      if (starsFilter !== "all" && b.stars !== Number(starsFilter)) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (a.stars !== b.stars) return a.stars - b.stars;
      const stockA = inventory[a.breed]?.stock ?? 0;
      const stockB = inventory[b.breed]?.stock ?? 0;
      return stockB - stockA;
    });
  }, [starsFilter, inventory]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-lg">Атлас пород</h3>
        <div className="flex-1" />
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
      ) : filteredBreeds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Породы не найдены по выбранным фильтрам
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filteredBreeds.map((breed, idx) => {
              const inv = inventory[breed.breed];
              const stock = inv ? inv.stock : 0;
              const isEditing = editingBreed === breed.breed;
              const prevBreed = filteredBreeds[idx - 1];
              const isGroupStart = idx === 0 || prevBreed.stars !== breed.stars;

              return (
                <div key={breed.breed}>
                  {isGroupStart && (
                    <div className="px-4 py-1.5 bg-slate-50 border-b flex items-center gap-2">
                      <span className="text-sm">{STAR_LABELS[breed.stars]}</span>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{breed.category}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-4 py-1.5 hover:bg-slate-50 transition-colors">
                    <span className="text-sm flex-1 min-w-0 truncate">{breed.breed}</span>
                    <div className="shrink-0 flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            className="h-6 w-16 text-xs text-right px-1.5"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveStock(breed.breed, breed.stars, breed.category);
                              if (e.key === "Escape") setEditingBreed(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={saving} onClick={() => handleSaveStock(breed.breed, breed.stars, breed.category)}>
                            {saving ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Check" size={11} className="text-green-600" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingBreed(null)}>
                            <Icon name="X" size={11} className="text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <button
                          className={`text-xs font-semibold px-2 py-0.5 rounded hover:bg-slate-100 transition-colors flex items-center gap-1 ${stock === 0 ? "text-red-600" : stock < 5 ? "text-yellow-600" : "text-green-700"}`}
                          onClick={() => { setEditingBreed(breed.breed); setEditStock(String(stock)); }}
                        >
                          {(stock === 0 || (stock > 0 && stock < 5)) && <Icon name="AlertTriangle" size={10} />}
                          {stock} шт
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
};

export default MagnetsBreedAtlas;
