import { useState, useCallback, useEffect } from "react";
import { API_URLS } from "@/lib/api";
import type { Registration } from "@/components/clients/types";

interface UseClientsResult {
  clients: Registration[];
  loading: boolean;
  reload: () => void;
  updateClient: (updated: Pick<Registration, "id" | "name" | "phone" | "registered">) => void;
  removeClient: (id: number) => void;
}

export function useClients(): UseClientsResult {
  const [clients, setClients] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fetch(API_URLS.GET_REGISTRATIONS)
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const updateClient = useCallback((updated: Pick<Registration, "id" | "name" | "phone" | "registered">) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === updated.id
          ? { ...c, name: updated.name, phone: updated.phone, registered: updated.registered }
          : c
      )
    );
  }, []);

  const removeClient = useCallback((id: number) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { clients, loading, reload, updateClient, removeClient };
}
