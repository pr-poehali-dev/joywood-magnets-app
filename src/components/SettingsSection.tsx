import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";

const SETTINGS_URL = "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1";

interface SettingRowProps {
  label: string;
  description: string;
  descriptionOff?: string;
  checked: boolean;
  loading: boolean;
  fetching: boolean;
  onToggle: (v: boolean) => void;
}

const SettingRow = ({ label, description, descriptionOff, checked, loading, fetching, onToggle }: SettingRowProps) => (
  <div className="flex items-center justify-between py-3 border-b last:border-0">
    <div className="space-y-0.5">
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-muted-foreground">
        {checked ? description : (descriptionOff ?? description)}
      </div>
    </div>
    <div className="flex items-center gap-2 ml-4">
      {fetching ? (
        <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />
      ) : (
        <>
          <span className={`text-xs font-medium ${checked ? "text-green-600" : "text-slate-400"}`}>
            {checked ? "Включено" : "Выключено"}
          </span>
          <Switch checked={checked} onCheckedChange={onToggle} disabled={loading} />
        </>
      )}
    </div>
  </div>
);

const SettingsSection = () => {
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch(SETTINGS_URL)
      .then((r) => r.json())
      .then((data) => {
        setVerificationEnabled(data.phone_verification_enabled !== "false");
        setShowRegister(data.show_register_page === "true");
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const saveSetting = async (key: string, value: boolean, onSuccess: (v: boolean) => void, labels: [string, string]) => {
    setLoadingKey(key);
    try {
      const res = await fetch(SETTINGS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: String(value) }),
      });
      if (res.ok) {
        onSuccess(value);
        toast({ title: value ? labels[0] : labels[1] });
      } else {
        toast({ title: "Ошибка", description: "Не удалось сохранить настройку", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет соединения", variant: "destructive" });
    } finally {
      setLoadingKey(null);
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
          <CardDescription>Управление входом и регистрацией клиентов</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            label="SMS-верификация телефона"
            description="Клиент подтверждает номер через SMS-код перед просмотром коллекции"
            descriptionOff="Клиент вводит телефон и сразу видит коллекцию без SMS"
            checked={verificationEnabled}
            loading={loadingKey === "phone_verification_enabled"}
            fetching={fetching}
            onToggle={(v) => saveSetting(
              "phone_verification_enabled", v,
              setVerificationEnabled,
              ["Верификация включена", "Верификация выключена"]
            )}
          />
          <SettingRow
            label="Страница самостоятельной регистрации"
            description="На странице входа видна ссылка на регистрацию (/register)"
            descriptionOff="Ссылка на регистрацию скрыта. Клиенты с Ozon регистрируются через форму на странице входа"
            checked={showRegister}
            loading={loadingKey === "show_register_page"}
            fetching={fetching}
            onToggle={(v) => saveSetting(
              "show_register_page", v,
              setShowRegister,
              ["Страница регистрации включена", "Страница регистрации скрыта"]
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsSection;
