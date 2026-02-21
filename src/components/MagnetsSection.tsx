import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { WOOD_BREEDS, BONUS_MILESTONES } from "@/lib/store";
import { toast } from "sonner";
import { useInventory } from "@/hooks/useInventory";
import { API_URLS } from "@/lib/api";
import MagnetsBonusStats, { BonusMilestoneStat } from "@/components/magnets/MagnetsBonusStats";
import MagnetsPrizeStock from "@/components/magnets/MagnetsPrizeStock";
import MagnetsBreedAtlas from "@/components/magnets/MagnetsBreedAtlas";
import MagnetsPhotos from "@/components/magnets/MagnetsPhotos";

const GIVE_MAGNET_URL = "https://functions.poehali.dev/05adfa61-68b9-4eb5-95d0-a48462122ff3";
const GET_REGISTRATIONS_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";

const MagnetsSection = () => {
  const [section, setSection] = useState<"stock" | "photos">("stock");

  // Bonus prize stock
  const [bonusStock, setBonusStock] = useState<Record<string, number>>({});
  const [editingBonus, setEditingBonus] = useState<string | null>(null);
  const [editBonusStock, setEditBonusStock] = useState("");
  const [savingBonus, setSavingBonus] = useState(false);

  // Bonus summary stats
  const [bonusSummary, setBonusSummary] = useState<BonusMilestoneStat[]>([]);
  const [bonusStatsLoading, setBonusStatsLoading] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingBreed, setUploadingBreed] = useState<string | null>(null);
  const [deletingBreed, setDeletingBreed] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingBreedRef = useRef<string | null>(null);

  const { inventory, loading: loadingInv, setStockForBreed } = useInventory();

  const loadBonusStats = useCallback(async () => {
    setBonusStatsLoading(true);
    try {
      const res = await fetch(`${GET_REGISTRATIONS_URL}?action=list`);
      const data = await res.json();
      const regs = (data.registrations || []).filter((r: { registered: boolean }) => r.registered);
      const summaries = await Promise.all(
        regs.map(async (r: { id: number; name: string }) => {
          const [magnetsRes, bonusesRes] = await Promise.all([
            fetch(`${GIVE_MAGNET_URL}?registration_id=${r.id}`),
            fetch(`${GIVE_MAGNET_URL}?action=bonuses&registration_id=${r.id}`),
          ]);
          const magnetsData = await magnetsRes.json();
          const bonusesData = await bonusesRes.json();
          const magnets: Array<{ breed: string }> = magnetsData.magnets || [];
          return {
            id: r.id,
            name: r.name,
            total_magnets: magnets.length,
            unique_breeds: new Set(magnets.map((m) => m.breed)).size,
            bonuses: bonusesData.bonuses || [],
          };
        })
      );
      setBonusSummary(
        BONUS_MILESTONES.map((m) => ({
          ...m,
          given: summaries.reduce((sum, c) => sum + (c.bonuses.some((b) => b.milestone_count === m.count && b.milestone_type === m.type) ? 1 : 0), 0),
          pending: summaries.filter((c) => {
            const current = m.type === "magnets" ? c.total_magnets : c.unique_breeds;
            return current >= m.count && !c.bonuses.some((b) => b.milestone_count === m.count && b.milestone_type === m.type);
          }).length,
        }))
      );
    } catch { /* silent */ } finally {
      setBonusStatsLoading(false);
    }
  }, []);

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
      loadBonusStats();
    }
  }, [section, loadBonusStats]);

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
        <MagnetsPhotos
          photos={photos}
          photosLoading={photosLoading}
          uploadingBreed={uploadingBreed}
          deletingBreed={deletingBreed}
          onUploadClick={(breed) => { pendingBreedRef.current = breed; fileInputRef.current?.click(); }}
          onDeletePhoto={handleDeletePhoto}
        />
      )}

      {section === "stock" && (
        <>
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

          <MagnetsPrizeStock
            bonusStock={bonusStock}
            editingBonus={editingBonus}
            editBonusStock={editBonusStock}
            savingBonus={savingBonus}
            onEditStart={(reward, current) => { setEditingBonus(reward); setEditBonusStock(String(current)); }}
            onEditChange={setEditBonusStock}
            onEditSave={handleSaveBonusStock}
            onEditCancel={() => setEditingBonus(null)}
          />

          <MagnetsBonusStats
            bonusSummary={bonusSummary}
            bonusStatsLoading={bonusStatsLoading}
          />

          <MagnetsBreedAtlas
            inventory={inventory}
            loadingInv={loadingInv}
            setStockForBreed={setStockForBreed}
          />
        </>
      )}
    </div>
  );
};

export default MagnetsSection;
