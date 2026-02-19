import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import ClientsSection from "@/components/ClientsSection";
import MagnetsSection from "@/components/MagnetsSection";
import OrdersSection from "@/components/OrdersSection";
import OrderHistory from "@/components/OrderHistory";
import BonusTracker from "@/components/BonusTracker";
import StatsSection from "@/components/StatsSection";

const tabs = [
  { value: "clients", label: "Клиенты", icon: "Users" },
  { value: "magnets", label: "Магниты", icon: "Magnet" },
  { value: "orders", label: "Заказы", icon: "ShoppingCart" },
  { value: "history", label: "История", icon: "History" },
  { value: "bonuses", label: "Бонусы", icon: "Award" },
  { value: "stats", label: "Статистика", icon: "BarChart3" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-white rounded-lg p-2">
              <Icon name="TreeDeciduous" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Joywood Магниты
              </h1>
              <p className="text-sm text-muted-foreground">
                Атлас пород — управление акцией
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="bg-white border shadow-sm h-auto flex-wrap p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 px-4 py-2"
              >
                <Icon name={tab.icon} size={16} />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="clients">
            <ClientsSection />
          </TabsContent>
          <TabsContent value="magnets">
            <MagnetsSection />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersSection />
          </TabsContent>
          <TabsContent value="history">
            <OrderHistory />
          </TabsContent>
          <TabsContent value="bonuses">
            <BonusTracker />
          </TabsContent>
          <TabsContent value="stats">
            <StatsSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
