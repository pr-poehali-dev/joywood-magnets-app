import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { STAR_LABELS, STAR_NAMES } from "@/lib/store";

interface BreedOption {
  breed: string;
  stars: number;
  category: string;
  stock: number;
}

interface Props {
  filtered: BreedOption[];
  search: string;
  dropdownOpen: boolean;
  giving: boolean;
  onSearchChange: (value: string) => void;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (breed: string, stars: number, category: string) => void;
}

const MagnetBreedDropdown = ({
  filtered,
  search,
  dropdownOpen,
  giving,
  onSearchChange,
  onToggle,
  onClose,
  onSelect,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex h-10 w-full items-center justify-between rounded-md border bg-slate-50 px-3 text-sm cursor-pointer hover:bg-slate-100"
        onClick={onToggle}
      >
        <span className="text-muted-foreground">Выбрать породу вручную...</span>
        <Icon name="ChevronDown" size={14} className="text-muted-foreground shrink-0" />
      </div>

      {dropdownOpen && (
        <div className="absolute z-[60] mt-1 w-full bg-white border rounded-md shadow-lg">
          <div className="p-2 border-b">
            <Input
              autoFocus
              placeholder="Поиск породы..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
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
                    if (hasStock) onSelect(b.breed, b.stars, b.category);
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
  );
};

export default MagnetBreedDropdown;
