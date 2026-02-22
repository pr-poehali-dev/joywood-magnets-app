import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";

const SETTINGS_URL = "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1";
const UPLOAD_POLICY_URL = "https://functions.poehali.dev/a3dfac54-994c-4651-8b8f-e2191da2f608";

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
  const [policyUrl, setPolicyUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch(SETTINGS_URL)
      .then((r) => r.json())
      .then((data) => {
        setVerificationEnabled(data.phone_verification_enabled !== "false");
        setShowRegister(data.show_register_page === "true");
        setPolicyUrl(data.privacy_policy_url || "");
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

  const handleUploadPolicy = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const res = await fetch(UPLOAD_POLICY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, filename: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      setPolicyUrl(data.url);
      toast({ title: "Политика конфиденциальности загружена" });
    } catch (err) {
      toast({ title: "Ошибка", description: err instanceof Error ? err.message : "Не удалось загрузить файл", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="FileText" size={18} className="text-orange-500" />
            Политика конфиденциальности
          </CardTitle>
          <CardDescription>Документ, который клиент подтверждает при входе в коллекцию</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {policyUrl ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <Icon name="FileCheck" size={18} className="text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">Документ загружен</p>
                <a
                  href={policyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 underline truncate block"
                >
                  Открыть PDF
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <Icon name="AlertCircle" size={18} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">Документ ещё не загружен. Клиенты не видят чекбокс согласия.</p>
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUploadPolicy}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <><Icon name="Loader2" size={14} className="animate-spin" />Загрузка...</>
              ) : (
                <><Icon name="Upload" size={14} />{policyUrl ? "Заменить документ" : "Загрузить PDF"}</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">Только PDF-файл</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsSection;