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
import { WOOD_BREEDS, STAR_LABELS } from "@/lib/store";
import { toast } from "sonner";
import { useInventory } from "@/hooks/useInventory";
import { API_URLS } from "@/lib/api";

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

const MagnetsSection = () => {
  const [section, setSection] = useState<"stock" | "photos">("stock");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingBreed, setUploadingBreed] = useState<string | null>(null);
  const [deletingBreed, setDeletingBreed] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBreed, setPendingBreed] = useState<string | null>(null);

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

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingBreed) return;
    e.target.value = "";

    setUploadingBreed(pendingBreed);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(API_URLS.BREED_PHOTOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breed: pendingBreed, image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setPhotos((prev) => ({ ...prev, [pendingBreed]: data.url + "?t=" + Date.now() }));
      toast.success(`Фото «${pendingBreed}» загружено`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось загрузить");
    } finally {
      setUploadingBreed(null);
      setPendingBreed(null);
    }
  }, [pendingBreed]);

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

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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

  const filteredBreeds = useMemo(() => WOOD_BREEDS.filter((b) => {
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    if (starsFilter !== "all" && b.stars !== Number(starsFilter)) return false;
    return true;
  }), [categoryFilter, starsFilter]);

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
                        onClick={() => { setPendingBreed(breed.breed); fileInputRef.current?.click(); }}
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
      </>}
    </div>
  );
};

export default MagnetsSection;