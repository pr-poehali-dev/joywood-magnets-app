import { useState, useCallback, useEffect } from "react";
import { API_URLS } from "@/lib/api";

export interface InventoryItem {
  stars: number;
  category: string;
  stock: number;
  active: boolean;
}

export type InventoryMap = Record<string, InventoryItem>;
export type InventoryStockMap = Record<string, number>;

interface UseInventoryResult {
  inventory: InventoryMap;
  stockMap: InventoryStockMap;
  loading: boolean;
  reload: () => void;
  setStockForBreed: (breed: string, stock?: number, active?: boolean) => void;
  decrementStock: (breed: string) => void;
  incrementStock: (breed: string) => void;
}

export function useInventory(): UseInventoryResult {
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fetch(`${API_URLS.GIVE_MAGNET}?action=inventory`)
      .then((r) => r.json())
      .then((data) => setInventory(data.inventory || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const stockMap: InventoryStockMap = Object.fromEntries(
    Object.entries(inventory).map(([breed, info]) => [breed, info.stock])
  );

  const setStockForBreed = useCallback((breed: string, stock?: number, active?: boolean) => {
    setInventory((prev) => ({
      ...prev,
      [breed]: {
        ...prev[breed],
        ...(stock !== undefined ? { stock } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    }));
  }, []);

  const decrementStock = useCallback((breed: string) => {
    setInventory((prev) => ({
      ...prev,
      [breed]: { ...prev[breed], stock: Math.max((prev[breed]?.stock ?? 1) - 1, 0) },
    }));
  }, []);

  const incrementStock = useCallback((breed: string) => {
    setInventory((prev) => ({
      ...prev,
      [breed]: { ...prev[breed], stock: (prev[breed]?.stock ?? 0) + 1 },
    }));
  }, []);

  return { inventory, stockMap, loading, reload, setStockForBreed, decrementStock, incrementStock };
}
