import { useState, useEffect, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Icon from "@/components/ui/icon";

const GET_REGISTRATIONS_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";

interface Registration {
  id: number;
  name: string;
  phone: string;
  channel: string;
  ozon_order_code: string | null;
  created_at: string;
}

const ClientsSection = () => {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch(GET_REGISTRATIONS_URL)
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.channel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Icon
            name="Search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Поиск по имени, телефону или каналу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="text-sm">
          {filtered.length} клиентов
        </Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Канал</TableHead>
              <TableHead>Код заказа Ozon</TableHead>
              <TableHead>Дата регистрации</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Icon name="Loader2" size={32} className="mx-auto mb-3 animate-spin opacity-40" />
                  Загрузка...
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.map((client) => {
              const isExpanded = expandedId === client.id;
              return (
                <Fragment key={client.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-orange-50/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : client.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Icon
                          name={isExpanded ? "ChevronDown" : "ChevronRight"}
                          size={16}
                          className="text-muted-foreground"
                        />
                        {client.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.phone}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {client.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.ozon_order_code || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-slate-50/80 p-0">
                        <div className="p-6 space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Icon name="User" size={14} className="text-orange-500" />
                            <span className="font-medium">{client.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon name="Phone" size={14} className="text-muted-foreground" />
                            <span>{client.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon name="MapPin" size={14} className="text-muted-foreground" />
                            <span>Канал: {client.channel}</span>
                          </div>
                          {client.ozon_order_code && (
                            <div className="flex items-center gap-2">
                              <Icon name="Package" size={14} className="text-blue-500" />
                              <span>Ozon заказ: <strong>{client.ozon_order_code}</strong></span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Icon name="CalendarDays" size={14} />
                            <span>Зарегистрирован: {new Date(client.created_at).toLocaleString("ru-RU")}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Icon name="SearchX" size={40} className="mx-auto mb-3 opacity-30" />
                  Клиенты не найдены
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ClientsSection;
