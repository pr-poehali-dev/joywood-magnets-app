import { RefObject, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { PhoneVerifyWidget } from "@/components/ui/phone-verify-widget";
import { PhoneInput } from "@/components/ui/phone-input";
import { usePhoneInput } from "@/hooks/usePhoneInput";

const REGISTER_URL = "https://functions.poehali.dev/40f9e8db-184c-407c-ace9-d0877ed306b9";

interface Props {
  step: "phone" | "verify";
  loading: boolean;
  notFound: boolean;
  verifiedPhone: string;
  notFoundRef: RefObject<HTMLDivElement>;
  phoneHook: ReturnType<typeof usePhoneInput>;
  showRegister?: boolean;
  policyUrl?: string;
  policyVersion?: string;
  needsConsent?: boolean;
  pendingPhone?: string;
  onPhoneSubmit: (e: React.FormEvent) => void;
  onVerifySuccess: () => void;
  onVerifyBack: () => void;
  onRegistered: (phone: string) => void;
  onConsentAccepted: (phone: string, policyVersion: string) => void;
}

const PolicyCheckbox = ({ policyUrl, accepted, onChange, colorClass = "text-muted-foreground", linkClass = "text-amber-600 hover:text-amber-700" }: {
  policyUrl: string; accepted: boolean; onChange: (v: boolean) => void; colorClass?: string; linkClass?: string;
}) => (
  <div className="flex items-start gap-2.5">
    <input
      type="checkbox"
      checked={accepted}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-amber-600 shrink-0 cursor-pointer"
    />
    <label className={`text-xs leading-relaxed cursor-pointer ${colorClass}`} onClick={() => onChange(!accepted)}>
      Выражаю своё согласие с{" "}
      <a href={policyUrl} target="_blank" rel="noopener noreferrer" className={`underline ${linkClass}`} onClick={(e) => e.stopPropagation()}>
        политикой конфиденциальности
      </a>{" "}
      в отношении пользовательских данных и даю своё согласие на обработку персональных данных
    </label>
  </div>
);

const CollectionPhoneStep = ({
  step,
  loading,
  notFound,
  verifiedPhone,
  notFoundRef,
  phoneHook,
  showRegister = false,
  policyUrl = "",
  policyVersion = "",
  needsConsent = false,
  pendingPhone = "",
  onPhoneSubmit,
  onVerifySuccess,
  onVerifyBack,
  onRegistered,
  onConsentAccepted,
}: Props) => {
  const [ozonName, setOzonName] = useState("");
  const [ozonCode, setOzonCode] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState("");
  const [regPolicyAccepted, setRegPolicyAccepted] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (ozonName.trim().length < 2) { setRegError("Введите имя (минимум 2 символа)"); return; }
    if (!ozonCode.trim()) { setRegError("Введите номер заказа Ozon"); return; }
    if (!phoneHook.isValid) { setRegError("Введите корректный номер телефона"); return; }
    if (policyUrl && !regPolicyAccepted) { setRegError("Необходимо принять политику конфиденциальности"); return; }
    setRegistering(true);
    try {
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ozonName.trim(),
          phone: phoneHook.fullPhone,
          ozon_order_code: ozonCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
      if (policyUrl) {
        await fetch("https://functions.poehali.dev/abee8bc8-7d35-4fe6-88d2-d62e1faec0c5", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneHook.fullPhone, policy_version: policyVersion, user_agent: navigator.userAgent }),
        }).catch(() => {});
      }
      onRegistered(phoneHook.fullPhone);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Ошибка. Попробуйте ещё раз.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <>
      {step === "phone" && !needsConsent && (
        <Card className="shadow-lg border-gold-200">
          <CardContent className="pt-6">
            <form onSubmit={onPhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Номер телефона</Label>
                <PhoneInput id="phone" phoneHook={phoneHook} />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  По номеру телефона мы находим ваши магниты и показываем прогресс в акции
                </p>
              </div>
              <Button
                type="submit"
                className="w-full bg-gold-500 hover:bg-gold-600"
                disabled={!phoneHook.isValid || loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Icon name="Loader2" size={18} className="animate-spin" />
                    Проверка...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon name="Search" size={18} />
                    Найти мои магниты
                  </span>
                )}
              </Button>
            </form>

            {showRegister && (
              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground mb-2">Ещё не участвуете в акции?</p>
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 text-sm font-medium text-gold-600 hover:text-gold-700"
                >
                  <Icon name="UserPlus" size={16} />
                  Зарегистрироваться
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Блок согласия с политикой — первичный вход */}
      {step === "phone" && needsConsent && policyUrl && (
        <Card className="shadow-lg border-amber-200 bg-amber-50">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 rounded-full p-2 shrink-0 mt-0.5">
                <Icon name="FileText" size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Подтвердите согласие</p>
                <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
                  Для просмотра вашей коллекции необходимо дать согласие на обработку персональных данных
                </p>
              </div>
            </div>

            <PolicyCheckbox
              policyUrl={policyUrl}
              accepted={consentAccepted}
              onChange={setConsentAccepted}
              colorClass="text-amber-800"
              linkClass="text-amber-700 hover:text-amber-900"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => { onVerifyBack(); setConsentAccepted(false); }}
              >
                Назад
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={!consentAccepted || loading}
                onClick={() => onConsentAccepted(pendingPhone, policyVersion)}
              >
                {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : "Продолжить"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "verify" && (
        <Card className="shadow-lg border-gold-200">
          <CardContent className="pt-6">
            <PhoneVerifyWidget
              phone={verifiedPhone}
              onSuccess={onVerifySuccess}
              onBack={onVerifyBack}
            />
          </CardContent>
        </Card>
      )}

      {step === "phone" && notFound && (
        <Card ref={notFoundRef} className="border-blue-200 bg-blue-50">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2 shrink-0 mt-0.5">
                <Icon name="ShoppingBag" size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Впервые с Ozon?</p>
                <p className="text-sm text-blue-700 mt-0.5 leading-relaxed">
                  Введите имя и номер заказа Ozon, чтобы зарегистрироваться в акции и увидеть свой первый магнит
                </p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ozon-name" className="text-sm text-blue-900">Ваше имя</Label>
                <Input
                  id="ozon-name"
                  placeholder="Например: Анна"
                  value={ozonName}
                  onChange={(e) => setOzonName(e.target.value)}
                  className="bg-white border-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ozon-code" className="text-sm text-blue-900">Номер заказа Ozon</Label>
                <Input
                  id="ozon-code"
                  placeholder="Например: 12345678-0001-1"
                  value={ozonCode}
                  onChange={(e) => setOzonCode(e.target.value)}
                  className="bg-white border-blue-200 focus:border-blue-400 font-mono"
                />
                <p className="text-[11px] text-blue-600">Номер заказа указан в приложении Ozon в разделе «Мои заказы» — он выделен зелёной рамкой:</p>
                <img
                  src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/86724393-e12b-46b0-9cb5-6e194e8c0824.png"
                  alt="Где найти номер заказа в Ozon"
                  className="w-full rounded-lg border border-blue-100 mt-1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-blue-900">Номер телефона</Label>
                <PhoneInput id="ozon-phone" phoneHook={phoneHook} />
              </div>

              {policyUrl && (
                <PolicyCheckbox
                  policyUrl={policyUrl}
                  accepted={regPolicyAccepted}
                  onChange={setRegPolicyAccepted}
                  colorClass="text-blue-800"
                  linkClass="text-blue-700 hover:text-blue-900"
                />
              )}

              {regError && (
                <div className="text-sm text-red-600 flex items-start gap-1.5">
                  <Icon name="AlertCircle" size={14} className="shrink-0 mt-0.5" />
                  <span>
                    {regError.replace('+79277760036', '').trimEnd().replace(/по номеру$/, 'по номеру')}
                    {regError.includes('+79277760036') && (
                      <>{" "}<a href="tel:+79277760036" className="font-semibold underline hover:text-red-700 whitespace-nowrap">+7 927 776-00-36</a></>
                    )}
                  </span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                disabled={registering || (!!policyUrl && !regPolicyAccepted)}
              >
                {registering ? (
                  <><Icon name="Loader2" size={16} className="animate-spin" />Регистрация...</>
                ) : (
                  <><Icon name="Sparkles" size={16} />Зарегистрироваться в акции</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default CollectionPhoneStep;