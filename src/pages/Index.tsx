import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import ClientsSection from "@/components/ClientsSection";
import MagnetsSection from "@/components/MagnetsSection";
import OrdersSection from "@/components/OrdersSection";
import RecentRegistrations from "@/components/RecentRegistrations";
import AdminGuard, { useAdmin } from "@/components/AdminGuard";
import AnalyticsSection from "@/components/AnalyticsSection";
import SettingsSection from "@/components/SettingsSection";
import ManagersSection from "@/components/ManagersSection";

const BASE_TABS = [
  { value: "orders", label: "Заказы", icon: "ShoppingCart" },
  { value: "clients", label: "Клиенты", icon: "Users" },
  { value: "registrations", label: "Регистрации", icon: "UserCheck" },
  { value: "magnets", label: "Магниты", icon: "Magnet" },
  { value: "analytics", label: "Аналитика", icon: "TrendingUp" },
  { value: "settings", label: "Настройки", icon: "Settings" },
];

const ADMIN_TABS = [
  ...BASE_TABS,
  { value: "managers", label: "Менеджеры", icon: "ShieldCheck" },
];

const AdminContent = () => {
  const { user, logout } = useAdmin();
  const [activeTab, setActiveTab] = useState("orders");
  const [focusClientId, setFocusClientId] = useState<number | null>(null);
  const [newRegsCount, setNewRegsCount] = useState(0);
  const [clientsReloadKey, setClientsReloadKey] = useState(0);

  const tabsList = user?.role === "admin" ? ADMIN_TABS : BASE_TABS;

  const navigateToClient = useCallback((clientId: number) => {
    setFocusClientId(clientId);
    setActiveTab("clients");
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === "clients") setClientsReloadKey((k) => k + 1);
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 flex-1">
            <img src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg" alt="Joywood" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Joywood Магниты</h1>
              <p className="text-sm text-muted-foreground">Панель управления акцией</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-orange-600 transition-colors"
              >
                <Icon name="ExternalLink" size={14} />
                Страница клиента
              </a>
              <div className="flex items-center gap-2 pl-3 border-l">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-foreground">{user?.email}</p>
                  <p className="text-[10px] text-muted-foreground">{user?.role === "admin" ? "Администратор" : "Менеджер"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-red-500 px-2">
                  <Icon name="LogOut" size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-[73px] z-20 bg-slate-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
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
          </Tabs>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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
          <TabsContent value="analytics">
            <AnalyticsSection onNavigateToClient={navigateToClient} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsSection />
          </TabsContent>
          {user?.role === "admin" && (
            <TabsContent value="managers">
              <ManagersSection />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

const Index = () => (
  <AdminGuard>
    <AdminContent />
  </AdminGuard>
);

export default Index;