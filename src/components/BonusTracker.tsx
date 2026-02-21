import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { BONUS_MILESTONES } from "@/lib/store";
import { toast } from "sonner";

const GIVE_MAGNET_URL = "https://functions.poehali.dev/05adfa61-68b9-4eb5-95d0-a48462122ff3";
const GET_REGISTRATIONS_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";

interface ClientSummary {
  id: number;
  name: string;
  phone: string;
  total_magnets: number;
  unique_breeds: number;
  bonuses: BonusRecord[];
}

interface BonusRecord {
  id: number;
  milestone_count: number;
  milestone_type: string;
  reward: string;
  given_at: string;
}

const BonusTracker = () => {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [givingBonus, setGivingBonus] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${GET_REGISTRATIONS_URL}?action=list`);
      const data = await res.json();
      const regs = (data.registrations || []).filter((r: { registered: boolean }) => r.registered);

      const summaries = await Promise.all(
        regs.map(async (r: { id: number; name: string; phone: string }) => {
          const [magnetsRes, bonusesRes] = await Promise.all([
            fetch(`${GIVE_MAGNET_URL}?registration_id=${r.id}`),
            fetch(`${GIVE_MAGNET_URL}?action=bonuses&registration_id=${r.id}`),
          ]);
          const magnetsData = await magnetsRes.json();
          const bonusesData = await bonusesRes.json();
          const magnets: Array<{ breed: string }> = magnetsData.magnets || [];
          const uniqueBreeds = new Set(magnets.map((m) => m.breed)).size;
          return {
            id: r.id,
            name: r.name,
            phone: r.phone,
            total_magnets: magnets.length,
            unique_breeds: uniqueBreeds,
            bonuses: bonusesData.bonuses || [],
          };
        })
      );

      summaries.sort((a, b) => b.unique_breeds - a.unique_breeds || b.total_magnets - a.total_magnets);
      setClients(summaries);
    } catch {
      toast.error("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleGiveBonus = async (client: ClientSummary, milestone: typeof BONUS_MILESTONES[0]) => {
    const key = `${client.id}-${milestone.count}-${milestone.type}`;
    setGivingBonus(key);
    try {
      const res = await fetch(GIVE_MAGNET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "give_bonus",
          registration_id: client.id,
          milestone_count: milestone.count,
          milestone_type: milestone.type,
          reward: milestone.reward,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success(`Бонус «${milestone.reward}» выдан клиенту ${client.name}`);
      await loadClients();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка выдачи бонуса");
    } finally {
      setGivingBonus(null);
    }
  };

  const eligibleClients = useMemo(() => clients.filter((c) => {
    return BONUS_MILESTONES.some((m) => {
      const current = m.type === "magnets" ? c.total_magnets : c.unique_breeds;
      const alreadyGiven = c.bonuses.some(
        (b) => b.milestone_count === m.count && b.milestone_type === m.type
      );
      return current >= m.count && !alreadyGiven;
    });
  }), [clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Icon name="Loader2" size={20} className="animate-spin" />
        Загрузка данных клиентов...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {BONUS_MILESTONES.map((m, i) => (
          <Card key={i} className="text-center">
            <CardContent className="p-4">
              <div className="text-3xl mb-2">{m.icon}</div>
              <div className="text-sm font-semibold mb-1">
                {m.count} {m.type === "magnets" ? "магнитов" : "пород"}
              </div>
              <div className="text-xs text-muted-foreground">{m.reward}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {eligibleClients.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-800">
              <Icon name="Bell" size={18} className="text-orange-500" />
              Требуют выдачи бонуса ({eligibleClients.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {eligibleClients.map((client) => {
              const pendingMilestones = BONUS_MILESTONES.filter((m) => {
                const current = m.type === "magnets" ? client.total_magnets : client.unique_breeds;
                const alreadyGiven = client.bonuses.some(
                  (b) => b.milestone_count === m.count && b.milestone_type === m.type
                );
                return current >= m.count && !alreadyGiven;
              });
              return (
                <div key={client.id} className="bg-white rounded-lg border border-orange-200 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.phone}</p>
                    </div>
                    <div className="flex gap-1.5 text-xs text-muted-foreground">
                      <span>{client.total_magnets} магн.</span>
                      <span>·</span>
                      <span>{client.unique_breeds} пород</span>
                    </div>
                  </div>
                  {pendingMilestones.map((m) => {
                    const key = `${client.id}-${m.count}-${m.type}`;
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 bg-orange-50 rounded px-2.5 py-1.5">
                        <span className="text-sm flex items-center gap-1.5">
                          <span>{m.icon}</span>
                          <span className="font-medium text-orange-800">{m.reward}</span>
                        </span>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-orange-500 hover:bg-orange-600 shrink-0"
                          disabled={givingBonus === key}
                          onClick={() => handleGiveBonus(client, m)}
                        >
                          {givingBonus === key
                            ? <Icon name="Loader2" size={12} className="animate-spin" />
                            : <Icon name="Gift" size={12} />
                          }
                          Выдать
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {eligibleClients.length === 0 && !loading && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Icon name="CheckCircle" size={32} className="mx-auto mb-2 text-green-400 opacity-60" />
          Все заработанные бонусы выданы
        </div>
      )}

      <div className="space-y-4">
        {clients.map((client) => {
          const milestones = BONUS_MILESTONES.map((m) => {
            const current = m.type === "magnets" ? client.total_magnets : client.unique_breeds;
            const pct = Math.min(100, Math.round((current / m.count) * 100));
            const reached = current >= m.count;
            const given = client.bonuses.some(
              (b) => b.milestone_count === m.count && b.milestone_type === m.type
            );
            const key = `${client.id}-${m.count}-${m.type}`;
            return { ...m, current, pct, reached, given, key };
          });

          return (
            <Card key={client.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon name="User" size={18} className="text-muted-foreground" />
                    {client.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">{client.total_magnets} магн.</Badge>
                    <Badge variant="secondary" className="text-xs">{client.unique_breeds} пород</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {milestones.map((m) => (
                  <div key={m.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{m.icon}</span>
                        <span className={m.reached ? "text-green-700 font-medium truncate" : "text-foreground truncate"}>
                          {m.reward}
                        </span>
                        {m.reached && m.given && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs shrink-0">Выдан</Badge>
                        )}
                        {m.reached && !m.given && (
                          <Button
                            size="sm"
                            className="h-6 text-[11px] bg-orange-500 hover:bg-orange-600 px-2 shrink-0"
                            disabled={givingBonus === m.key}
                            onClick={() => handleGiveBonus(client, m)}
                          >
                            {givingBonus === m.key
                              ? <Icon name="Loader2" size={10} className="animate-spin" />
                              : "Выдать"
                            }
                          </Button>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {m.current}/{m.count} {m.type === "magnets" ? "магн." : "пород"}
                      </span>
                    </div>
                    <Progress value={m.pct} className={`h-2 ${m.reached ? "[&>div]:bg-green-500" : ""}`} />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BonusTracker;