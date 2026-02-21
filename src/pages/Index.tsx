import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import ClientsSection from "@/components/ClientsSection";
import MagnetsSection from "@/components/MagnetsSection";
import OrdersSection from "@/components/OrdersSection";
import StatsSection from "@/components/StatsSection";
import RecentRegistrations from "@/components/RecentRegistrations";
import AdminGuard from "@/components/AdminGuard";
import AnalyticsSection from "@/components/AnalyticsSection";

const tabsList = [
  { value: "orders", label: "Заказы", icon: "ShoppingCart" },
  { value: "clients", label: "Клиенты", icon: "Users" },
  { value: "registrations", label: "Регистрации", icon: "UserCheck" },
  { value: "magnets", label: "Магниты", icon: "Magnet" },
  { value: "stats", label: "Статистика", icon: "BarChart3" },
  { value: "analytics", label: "Аналитика", icon: "TrendingUp" },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("orders");
  const [focusClientId, setFocusClientId] = useState<number | null>(null);
  const [newRegsCount, setNewRegsCount] = useState(0);
  const [clientsReloadKey, setClientsReloadKey] = useState(0);

  const navigateToClient = useCallback((clientId: number) => {
    setFocusClientId(clientId);
    setActiveTab("clients");
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === "clients") setClientsReloadKey((k) => k + 1);
    setActiveTab(tab);
  };

  return (
    <AdminGuard>
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 flex-1">
            <img src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg" alt="Joywood" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Joywood Магниты
              </h1>
              <p className="text-sm text-muted-foreground">
                Панель управления акцией
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-orange-600 transition-colors"
              >
                <Icon name="ExternalLink" size={14} />
                Страница клиента
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-white border shadow-sm h-auto flex-wrap p-1">
            {tabsList.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 px-4 py-2"
              >
                <Icon name={tab.icon} size={16} />
                {tab.label}
                {tab.value === "registrations" && newRegsCount > 0 && (
                  <span className="ml-1 bg-green-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {newRegsCount > 9 ? "9+" : newRegsCount}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="clients">
            <ClientsSection
              focusClientId={focusClientId}
              onFocusHandled={() => setFocusClientId(null)}
              reloadKey={clientsReloadKey}
            />
          </TabsContent>
          <TabsContent value="magnets">
            <MagnetsSection />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersSection onNavigateToClient={navigateToClient} />
          </TabsContent>
          <TabsContent value="registrations">
            <RecentRegistrations onNavigateToClient={navigateToClient} onCountChange={setNewRegsCount} />
          </TabsContent>
          <TabsContent value="stats">
            <StatsSection />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsSection onNavigateToClient={navigateToClient} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
    </AdminGuard>
  );
};

export default Index;