import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { WOOD_BREEDS, STAR_LABELS, BONUS_MILESTONES } from "@/lib/store";
import { toast } from "sonner";
import { useInventory } from "@/hooks/useInventory";
import { API_URLS } from "@/lib/api";


const MagnetsSection = () => {
  const [section, setSection] = useState<"stock" | "photos">("stock");
  const [bonusStock, setBonusStock] = useState<Record<string, number>>({});
  const [editingBonus, setEditingBonus] = useState<string | null>(null);
  const [editBonusStock, setEditBonusStock] = useState("");
  const [savingBonus, setSavingBonus] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingBreed, setUploadingBreed] = useState<string | null>(null);
  const [deletingBreed, setDeletingBreed] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingBreedRef = useRef<string | null>(null);

  const loadPhotos = useCallback(async () => {
    setPhotosLoading(true);
    try {
      const res = await fetch(API_URLS.BREED_PHOTOS);
      const data = await res.json();
      setPhotos(data.photos || {});
    } catch {
      toast.error("Не удалось загрузить фото");
    } finally {
      setPhotosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === "photos") loadPhotos();
  }, [section, loadPhotos]);

  useEffect(() => {
    if (section === "stock") {
      fetch(API_URLS.BONUS_STOCK)
        .then((r) => r.json())
        .then((d) => setBonusStock(d.stock || {}))
        .catch(() => {});
    }
  }, [section]);

  const handleSaveBonusStock = useCallback(async (reward: string) => {
    const stock = parseInt(editBonusStock, 10);
    if (isNaN(stock) || stock < 0) { toast.error("Укажите корректное количество"); return; }
    setSavingBonus(true);
    try {
      const res = await fetch(API_URLS.BONUS_STOCK, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reward, stock }),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
      setBonusStock((prev) => ({ ...prev, [reward]: stock }));
      setEditingBonus(null);
      toast.success(`Остаток «${reward.split(" ")[0]}»: ${stock} шт`);
    } catch {
      toast.error("Не удалось сохранить");
    } finally { setSavingBonus(false); }
  }, [editBonusStock]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const breed = pendingBreedRef.current;
    if (!file || !breed) return;
    e.target.value = "";

    setUploadingBreed(breed);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const SIZE = 800;
          const canvas = document.createElement("canvas");
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext("2d")!;
          const s = Math.min(img.width, img.height);
          const ox = (img.width - s) / 2;
          const oy = (img.height - s) / 2;
          ctx.drawImage(img, ox, oy, s, s, 0, 0, SIZE, SIZE);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      const res = await fetch(API_URLS.BREED_PHOTOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breed, image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setPhotos((prev) => ({ ...prev, [breed]: data.url + "?t=" + Date.now() }));
      toast.success(`Фото «${breed}» загружено`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось загрузить");
    } finally {
      setUploadingBreed(null);
      pendingBreedRef.current = null;
    }
  }, []);

  const handleDeletePhoto = useCallback(async (breed: string) => {
    setDeletingBreed(breed);
    try {
      const res = await fetch(`${API_URLS.BREED_PHOTOS}?breed=${encodeURIComponent(breed)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка");
      setPhotos((prev) => { const n = { ...prev }; delete n[breed]; return n; });
      toast.success(`Фото «${breed}» удалено`);
    } catch {
      toast.error("Не удалось удалить");
    } finally {
      setDeletingBreed(null);
    }
  }, []);

  const [starsFilter, setStarsFilter] = useState<string>("all");
  const [editingBreed, setEditingBreed] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { inventory, loading: loadingInv, setStockForBreed } = useInventory();

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

  const { totalStock, lowStockCount, outOfStockCount } = useMemo(() => {
    const total = Object.values(inventory).reduce((s, v) => s + v.stock, 0);
    const low = WOOD_BREEDS.filter((b) => {
      const inv = inventory[b.breed];
      return inv && inv.stock > 0 && inv.stock < 5;
    }).length;
    const out = WOOD_BREEDS.filter((b) => {
      const inv = inventory[b.breed];
      return !inv || inv.stock === 0;
    }).length;
    return { totalStock: total, lowStockCount: low, outOfStockCount: out };
  }, [inventory]);

  const photosUploaded = Object.keys(photos).length;

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex gap-2">
        <Button
          variant={section === "stock" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setSection("stock")}
        >
          <Icon name="Package" size={15} />
          Склад
        </Button>
        <Button
          variant={section === "photos" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setSection("photos")}
        >
          <Icon name="Image" size={15} />
          Фото пород
          {photosUploaded > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{photosUploaded}</Badge>
          )}
        </Button>
      </div>

      {section === "photos" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Загрузите квадратное фото для каждой породы. Оно будет показано только на клиентской странице коллекции.
            </p>
          </div>
          {photosLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Icon name="Loader2" size={18} className="animate-spin" />
              Загрузка...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {WOOD_BREEDS.map((breed) => {
                const photoUrl = photos[breed.breed];
                const isUploading = uploadingBreed === breed.breed;
                const isDeleting = deletingBreed === breed.breed;
                return (
                  <div key={breed.breed} className="border rounded-lg overflow-hidden bg-white">
                    <div className="aspect-square relative bg-slate-100">
                      {photoUrl ? (
                        <img src={photoUrl} alt={breed.breed} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Icon name="ImageOff" size={28} />
                        </div>
                      )}
                      {photoUrl && (
                        <button
                          className="absolute top-1 right-1 bg-white/90 rounded-full p-1 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
                          onClick={() => handleDeletePhoto(breed.breed)}
                          disabled={isDeleting}
                        >
                          {isDeleting
                            ? <Icon name="Loader2" size={13} className="animate-spin" />
                            : <Icon name="X" size={13} />}
                        </button>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{breed.breed}</p>
                      <button
                        className="mt-1.5 w-full text-xs flex items-center justify-center gap-1 py-1 rounded border border-dashed border-slate-300 hover:border-orange-400 hover:text-orange-600 text-slate-400 transition-colors disabled:opacity-50"
                        disabled={isUploading}
                        onClick={() => { pendingBreedRef.current = breed.breed; fileInputRef.current?.click(); }}
                      >
                        {isUploading
                          ? <><Icon name="Loader2" size={12} className="animate-spin" />Загрузка...</>
                          : <><Icon name="Upload" size={12} />{photoUrl ? "Заменить" : "Загрузить"}</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {section === "stock" && <>
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

      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Icon name="Gift" size={15} className="text-orange-500" />
            Остатки призов
          </p>
          <div className="divide-y">
            {BONUS_MILESTONES.map((m) => {
              const stock = bonusStock[m.reward] ?? 0;
              const isEditing = editingBonus === m.reward;
              return (
                <div key={m.reward} className="flex items-center gap-2 py-1.5">
                  <span className="text-base shrink-0">{m.icon}</span>
                  <span className="text-sm flex-1 min-w-0 truncate">{m.reward}</span>
                  <div className="shrink-0 flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Input
                          type="number"
                          min="0"
                          className="h-6 w-16 text-xs text-right px-1.5"
                          value={editBonusStock}
                          onChange={(e) => setEditBonusStock(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveBonusStock(m.reward);
                            if (e.key === "Escape") setEditingBonus(null);
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={savingBonus} onClick={() => handleSaveBonusStock(m.reward)}>
                          {savingBonus ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Check" size={11} className="text-green-600" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingBonus(null)}>
                          <Icon name="X" size={11} className="text-muted-foreground" />
                        </Button>
                      </>
                    ) : (
                      <button
                        className={`text-xs font-semibold px-2 py-0.5 rounded hover:bg-slate-100 transition-colors flex items-center gap-1 ${stock === 0 ? "text-red-600" : stock <= 2 ? "text-yellow-600" : "text-green-700"}`}
                        onClick={() => { setEditingBonus(m.reward); setEditBonusStock(String(stock)); }}
                      >
                        {stock === 0 && <Icon name="AlertTriangle" size={10} />}
                        {stock} шт
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
      </>}
    </div>
  );
};

export default MagnetsSection;