import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import ClientsSection from "@/components/ClientsSection";
import MagnetsSection from "@/components/MagnetsSection";
import OrdersSection from "@/components/OrdersSection";
import RecentRegistrations from "@/components/RecentRegistrations";
import AdminGuard from "@/components/AdminGuard";
import AnalyticsSection from "@/components/AnalyticsSection";
import { Switch } from "@/components/ui/switch";
import { API_URLS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const tabsList = [
  { value: "orders", label: "Заказы", icon: "ShoppingCart" },
  { value: "clients", label: "Клиенты", icon: "Users" },
  { value: "registrations", label: "Регистрации", icon: "UserCheck" },
  { value: "magnets", label: "Магниты", icon: "Magnet" },
  { value: "analytics", label: "Аналитика", icon: "TrendingUp" },
];

const SESSION_KEY = "jw_admin_auth";

const Index = () => {
  const [activeTab, setActiveTab] = useState("orders");
  const [focusClientId, setFocusClientId] = useState<number | null>(null);
  const [newRegsCount, setNewRegsCount] = useState(0);
  const [clientsReloadKey, setClientsReloadKey] = useState(0);
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(API_URLS.SETTINGS)
      .then((r) => r.json())
      .then((data) => {
        setVerificationEnabled(data.phone_verification_enabled !== "false");
      })
      .catch(() => {});
  }, []);

  const toggleVerification = async (checked: boolean) => {
    setVerificationLoading(true);
    try {
      const res = await fetch(API_URLS.SETTINGS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": sessionStorage.getItem("jw_admin_password") || "",
        },
        body: JSON.stringify({ key: "phone_verification_enabled", value: String(checked) }),
      });
      if (res.ok) {
        setVerificationEnabled(checked);
        toast({
          title: checked ? "Верификация включена" : "Верификация выключена",
          description: checked
            ? "Клиенты снова должны подтверждать телефон"
            : "Клиенты входят без SMS-кода",
        });
      } else {
        toast({ title: "Ошибка", description: "Не удалось сохранить настройку", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет соединения", variant: "destructive" });
    } finally {
      setVerificationLoading(false);
    }
  };

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
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="verification-toggle"
                  checked={verificationEnabled}
                  onCheckedChange={toggleVerification}
                  disabled={verificationLoading}
                />
                <label
                  htmlFor="verification-toggle"
                  className="text-sm text-muted-foreground cursor-pointer select-none flex items-center gap-1"
                >
                  <Icon name="ShieldCheck" size={14} />
                  SMS-верификация
                </label>
              </div>
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