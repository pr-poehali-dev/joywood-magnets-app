import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DEMO_CLIENTS, STAR_LABELS, formatMoney } from "@/lib/store";

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Активен", color: "bg-green-100 text-green-800" },
  paused: { label: "Пауза", color: "bg-yellow-100 text-yellow-800" },
  stopped: { label: "Остановлен", color: "bg-red-100 text-red-800" },
};

const ClientsSection = () => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = DEMO_CLIENTS.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q)
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
            placeholder="Поиск по имени, телефону или email..."
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
              <TableHead>Каналы</TableHead>
              <TableHead className="text-right">Сумма заказов</TableHead>
              <TableHead className="text-center">Магниты</TableHead>
              <TableHead className="text-center">Уникальные породы</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => {
              const isExpanded = expandedId === client.id;
              const status = statusConfig[client.status];
              return (
                <>
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-orange-50/50 transition-colors"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : client.id)
                    }
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
                      <div className="flex flex-wrap gap-1">
                        {client.channels.map((ch) => (
                          <Badge
                            key={ch}
                            variant="outline"
                            className="text-xs"
                          >
                            {ch}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(client.totalSpent)}
                    </TableCell>
                    <TableCell className="text-center">
                      {client.magnetsCollected.length}
                    </TableCell>
                    <TableCell className="text-center">
                      {client.uniqueBreeds}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${client.id}-detail`}>
                      <TableCell colSpan={7} className="bg-slate-50/80 p-0">
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Icon
                              name="Magnet"
                              size={18}
                              className="text-orange-500"
                            />
                            <h4 className="font-semibold text-sm">
                              Коллекция магнитов ({client.magnetsCollected.length})
                            </h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {client.magnetsCollected.map((magnet) => (
                              <div
                                key={magnet.id}
                                className="bg-white rounded-lg border p-3 text-center shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="text-2xl mb-1">
                                  {STAR_LABELS[magnet.stars]}
                                </div>
                                <div className="font-medium text-sm">
                                  {magnet.breed}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(magnet.givenAt).toLocaleDateString(
                                    "ru-RU",
                                    { day: "numeric", month: "short" }
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {client.notes && (
                            <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                              <Icon name="StickyNote" size={14} />
                              {client.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
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
