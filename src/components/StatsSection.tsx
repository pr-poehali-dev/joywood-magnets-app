import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { DEMO_CLIENTS, DEMO_ORDERS, CHANNELS, formatMoney } from "@/lib/store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const totalClients = DEMO_CLIENTS.length;
const totalMagnetsGiven = DEMO_CLIENTS.reduce(
  (acc, c) => acc + c.magnetsCollected.length,
  0
);
const totalRevenue = DEMO_ORDERS.reduce((acc, o) => acc + o.amount, 0);
const avgCheck = Math.round(totalRevenue / DEMO_ORDERS.length);
const activeClients = DEMO_CLIENTS.filter((c) => c.status === "active").length;

const monthlyData: Record<string, number> = {};
DEMO_ORDERS.forEach((o) => {
  const d = new Date(o.date);
  const key = d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
  monthlyData[key] = (monthlyData[key] || 0) + o.amount;
});
const barData = Object.entries(monthlyData).map(([month, amount]) => ({
  month,
  amount,
}));

const channelData: Record<string, number> = {};
DEMO_ORDERS.forEach((o) => {
  channelData[o.channel] = (channelData[o.channel] || 0) + 1;
});
const pieData = Object.entries(channelData).map(([name, value]) => ({
  name,
  value,
}));

const PIE_COLORS = [
  "#f97316",
  "#fb923c",
  "#fdba74",
  "#fcd34d",
  "#a3e635",
  "#34d399",
];

const kpis = [
  {
    label: "Всего клиентов",
    value: totalClients.toString(),
    icon: "Users",
    color: "text-blue-600 bg-blue-50",
  },
  {
    label: "Магнитов выдано",
    value: totalMagnetsGiven.toString(),
    icon: "Magnet",
    color: "text-orange-600 bg-orange-50",
  },
  {
    label: "Средний чек",
    value: formatMoney(avgCheck),
    icon: "Receipt",
    color: "text-green-600 bg-green-50",
  },
  {
    label: "Активных участников",
    value: activeClients.toString(),
    icon: "UserCheck",
    color: "text-purple-600 bg-purple-50",
  },
];

const StatsSection = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${kpi.color}`}>
                  <Icon name={kpi.icon} size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="text-xs text-muted-foreground">
                    {kpi.label}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Icon name="BarChart3" size={18} className="text-orange-500" />
              Заказы по месяцам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatMoney(value), "Сумма"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Icon name="PieChart" size={18} className="text-orange-500" />
              Распределение по каналам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatsSection;
