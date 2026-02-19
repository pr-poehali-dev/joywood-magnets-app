import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { BONUS_MILESTONES, DEMO_CLIENTS } from "@/lib/store";

const BonusTracker = () => {
  const clientProgress = DEMO_CLIENTS.map((client) => {
    const magnetsCount = client.magnetsCollected.length;
    const breedsCount = client.uniqueBreeds;

    const milestones = BONUS_MILESTONES.map((m) => {
      const current = m.type === "magnets" ? magnetsCount : breedsCount;
      const percentage = Math.min(100, Math.round((current / m.count) * 100));
      const achieved = current >= m.count;
      return {
        ...m,
        current,
        percentage,
        achieved,
        remaining: Math.max(0, m.count - current),
      };
    });

    const nextMilestone = milestones.find((m) => !m.achieved);

    return {
      client,
      milestones,
      nextMilestone,
      nextPercentage: nextMilestone?.percentage ?? 100,
    };
  }).sort((a, b) => b.nextPercentage - a.nextPercentage);

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

      <div className="space-y-4">
        {clientProgress.map(({ client, milestones, nextMilestone }) => (
          <Card key={client.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="User" size={18} className="text-muted-foreground" />
                  {client.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {client.magnetsCollected.length} магнитов
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {client.uniqueBreeds} пород
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestones.map((m, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{m.icon}</span>
                        <span
                          className={
                            m.achieved
                              ? "text-green-700 font-medium"
                              : "text-foreground"
                          }
                        >
                          {m.reward}
                        </span>
                        {m.achieved && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            Получено
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {m.current} / {m.count}{" "}
                        {m.type === "magnets" ? "магн." : "пород"}
                      </span>
                    </div>
                    <Progress
                      value={m.percentage}
                      className={`h-2 ${m.achieved ? "[&>div]:bg-green-500" : ""}`}
                    />
                  </div>
                ))}
                {nextMilestone && (
                  <div className="bg-orange-50 rounded-lg p-3 text-sm flex items-center gap-2">
                    <Icon
                      name="Target"
                      size={16}
                      className="text-orange-500 shrink-0"
                    />
                    <span>
                      До следующего бонуса ({nextMilestone.reward}):{" "}
                      <span className="font-semibold">
                        {nextMilestone.remaining}{" "}
                        {nextMilestone.type === "magnets" ? "магнитов" : "пород"}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BonusTracker;
