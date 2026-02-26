import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import Icon from "@/components/ui/icon";

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

interface SettingsAccessCardProps {
  verificationEnabled: boolean;
  showRegister: boolean;
  fetching: boolean;
  loadingKey: string | null;
  onToggle: (key: string, value: boolean, onSuccess: (v: boolean) => void, labels: [string, string]) => void;
  setVerificationEnabled: (v: boolean) => void;
  setShowRegister: (v: boolean) => void;
}

const SettingsAccessCard = ({
  verificationEnabled,
  showRegister,
  fetching,
  loadingKey,
  onToggle,
  setVerificationEnabled,
  setShowRegister,
}: SettingsAccessCardProps) => (
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
        onToggle={(v) => onToggle(
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
        onToggle={(v) => onToggle(
          "show_register_page", v,
          setShowRegister,
          ["Страница регистрации включена", "Страница регистрации скрыта"]
        )}
      />
    </CardContent>
  </Card>
);

export default SettingsAccessCard;
