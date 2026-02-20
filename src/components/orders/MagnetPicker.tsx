import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { WOOD_BREEDS, STAR_LABELS, STAR_NAMES } from "@/lib/store";
import { GIVE_MAGNET_URL } from "../clients/types";

interface GivenMagnet {
  id: number;
  breed: string;
  stars: number;
}

interface Props {
  registrationId: number;
  clientName: string;
  onDone: () => void;
}

const starBg: Record<number, string> = {
  1: "bg-amber-50 border-amber-200 text-amber-800",
  2: "bg-orange-50 border-orange-300 text-orange-800",
  3: "bg-red-50 border-red-300 text-red-800",
};

const MagnetPicker = ({ registrationId, clientName, onDone }: Props) => {
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [given, setGiven] = useState<GivenMagnet[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [giving, setGiving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${GIVE_MAGNET_URL}?action=inventory`)
      .then((r) => r.json())
      .then((data) => {
        const inv: Record<string, number> = {};
        for (const [breed, info] of Object.entries(data.inventory || {})) {
          inv[breed] = (info as { stock: number }).stock;
        }
        setInventory(inv);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const givenBreeds = new Set(given.map((g) => g.breed));

  const availableBreeds = WOOD_BREEDS
    .filter((b) => !givenBreeds.has(b.breed))
    .map((b) => ({ ...b, stock: inventory[b.breed] ?? 0 }))
    .sort((a, b) => b.stock - a.stock);

  const filtered = search.trim()
    ? availableBreeds.filter((b) => b.breed.toLowerCase().includes(search.toLowerCase()))
    : availableBreeds;

  const handleGive = async (breed: string, stars: number, category: string) => {
    setGiving(true);
    try {
      const res = await fetch(GIVE_MAGNET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, breed, stars, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setGiven((prev) => [...prev, { id: data.id, breed, stars }]);
      setInventory((prev) => ({ ...prev, [breed]: Math.max((prev[breed] ?? 1) - 1, 0) }));
      setSearch("");
      setDropdownOpen(false);
      toast.success(`${breed} ${STAR_LABELS[stars]} выдан`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка выдачи магнита");
    } finally {
      setGiving(false);
    }
  };

  return (
    <div className="border border-orange-200 rounded-lg bg-orange-50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <Icon name="Gift" size={16} className="text-orange-500" />
            Выдача магнитов — {clientName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Добавьте магниты к заказу, затем нажмите «Готово»</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={onDone}>
          <Icon name="Check" size={14} />
          Готово
        </Button>
      </div>

      {given.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {given.map((m) => (
            <span
              key={m.id}
              className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium ${starBg[m.stars] ?? ""}`}
            >
              {m.breed} {STAR_LABELS[m.stars]}
            </span>
          ))}
        </div>
      )}

      <div className="relative" ref={ref}>
        <div
          className="flex h-9 w-full items-center justify-between rounded-md border bg-white px-3 text-sm cursor-pointer hover:bg-slate-50"
          onClick={() => setDropdownOpen((v) => !v)}
        >
          <span className="text-muted-foreground">Выбрать породу для выдачи...</span>
          <Icon name="ChevronDown" size={14} className="text-muted-foreground shrink-0" />
        </div>

        {dropdownOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg">
            <div className="p-2 border-b">
              <Input
                autoFocus
                placeholder="Поиск породы..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-3">Не найдено</div>
              )}
              {filtered.map((b) => {
                const hasStock = b.stock > 0;
                return (
                  <button
                    key={b.breed}
                    disabled={!hasStock || giving}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (hasStock) handleGive(b.breed, b.stars, b.category);
                    }}
                  >
                    <span>{STAR_LABELS[b.stars]} {b.breed} — {STAR_NAMES[b.stars]}</span>
                    <span className={`text-xs shrink-0 ${hasStock ? "text-green-600" : "text-red-500"}`}>
                      {b.stock} шт
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MagnetPicker;
