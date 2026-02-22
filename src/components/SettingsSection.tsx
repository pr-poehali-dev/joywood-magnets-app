import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";

const SETTINGS_URL = "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1";

const SettingsSection = () => {
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch(SETTINGS_URL)
      .then((r) => r.json())
      .then((data) => setVerificationEnabled(data.phone_verification_enabled !== "false"))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const toggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(SETTINGS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "phone_verification_enabled",
          value: String(checked),
          password: sessionStorage.getItem("jw_admin_password") || "",
        }),
      });
      if (res.ok) {
        setVerificationEnabled(checked);
        toast({
          title: checked ? "Верификация включена" : "Верификация выключена",
          description: checked
            ? "Клиенты должны подтверждать телефон через SMS"
            : "Клиенты входят без SMS-кода",
        });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Ошибка",
          description: err.error || "Не удалось сохранить настройку",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет соединения", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="ShieldCheck" size={18} className="text-orange-500" />
            Безопасность и доступ
          </CardTitle>
          <CardDescription>Управление методами входа для клиентов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3 border-b last:border-0">
            <div className="space-y-0.5">
              <div className="font-medium text-sm">SMS-верификация телефона</div>
              <div className="text-xs text-muted-foreground">
                {verificationEnabled
                  ? "Клиент вводит телефон и подтверждает его через SMS-код"
                  : "Клиент вводит телефон и сразу видит коллекцию без SMS"}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {fetching ? (
                <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />
              ) : (
                <>
                  <span className={`text-xs font-medium ${verificationEnabled ? "text-green-600" : "text-slate-400"}`}>
                    {verificationEnabled ? "Включена" : "Выключена"}
                  </span>
                  <Switch
                    checked={verificationEnabled}
                    onCheckedChange={toggle}
                    disabled={loading}
                  />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsSection;
