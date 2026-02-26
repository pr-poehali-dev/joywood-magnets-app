import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import SettingsAccessCard from "@/components/settings/SettingsAccessCard";
import SettingsPolicyCard from "@/components/settings/SettingsPolicyCard";
import SettingsRaccoonCard from "@/components/settings/SettingsRaccoonCard";
import TrashSection from "@/components/TrashSection";

const SETTINGS_URL = "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1";
const RACCOON_ASSETS_URL = "https://functions.poehali.dev/81103f27-f9fd-48ca-87c2-027ad46a7df8";

const SettingsSection = () => {
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [policyUrl, setPolicyUrl] = useState("");
  const [raccoonAssets, setRaccoonAssets] = useState<Record<string, { photo?: string; video?: string }>>({});
  const [raccoonLoading, setRaccoonLoading] = useState(true);
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

    fetch(RACCOON_ASSETS_URL)
      .then((r) => r.json())
      .then((data) => setRaccoonAssets(data))
      .catch(() => {})
      .finally(() => setRaccoonLoading(false));
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
    <div className="space-y-6">
      <div className="max-w-2xl space-y-6">
        <SettingsAccessCard
          verificationEnabled={verificationEnabled}
          showRegister={showRegister}
          fetching={fetching}
          loadingKey={loadingKey}
          onToggle={saveSetting}
          setVerificationEnabled={setVerificationEnabled}
          setShowRegister={setShowRegister}
        />
        <SettingsPolicyCard
          policyUrl={policyUrl}
          onPolicyUrlChange={setPolicyUrl}
        />
      </div>

      <SettingsRaccoonCard
        raccoonAssets={raccoonAssets}
        raccoonLoading={raccoonLoading}
        onAssetsChange={setRaccoonAssets}
      />

      <TrashSection />
    </div>
  );
};

export default SettingsSection;
