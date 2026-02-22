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
  onPhoneSubmit: (e: React.FormEvent) => void;
  onVerifySuccess: () => void;
  onVerifyBack: () => void;
  onRegistered: (phone: string) => void;
}

const CollectionPhoneStep = ({
  step,
  loading,
  notFound,
  verifiedPhone,
  notFoundRef,
  phoneHook,
  showRegister = false,
  policyUrl = "",
  onPhoneSubmit,
  onVerifySuccess,
  onVerifyBack,
  onRegistered,
}: Props) => {
  const [ozonName, setOzonName] = useState("");
  const [ozonCode, setOzonCode] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (ozonName.trim().length < 2) { setRegError("Введите имя (минимум 2 символа)"); return; }
    if (!ozonCode.trim()) { setRegError("Введите номер заказа Ozon"); return; }
    if (!phoneHook.isValid) { setRegError("Введите корректный номер телефона"); return; }
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
      onRegistered(phoneHook.fullPhone);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Ошибка. Попробуйте ещё раз.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <>
      {step === "phone" && (
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
              {policyUrl && (
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="policy-accept"
                    checked={policyAccepted}
                    onChange={(e) => setPolicyAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-amber-600 shrink-0"
                  />
                  <label htmlFor="policy-accept" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    Выражаю своё согласие с{" "}
                    <a href={policyUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 underline hover:text-amber-700">
                      политикой конфиденциальности
                    </a>{" "}
                    в отношении пользовательских данных и даю своё согласие на обработку персональных данных
                  </label>
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-gold-500 hover:bg-gold-600"
                disabled={!phoneHook.isValid || loading || (!!policyUrl && !policyAccepted)}
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
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="policy-accept-reg"
                    checked={policyAccepted}
                    onChange={(e) => setPolicyAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-blue-300 accent-blue-600 shrink-0"
                  />
                  <label htmlFor="policy-accept-reg" className="text-xs text-blue-800 leading-relaxed cursor-pointer">
                    Выражаю своё согласие с{" "}
                    <a href={policyUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">
                      политикой конфиденциальности
                    </a>{" "}
                    в отношении пользовательских данных и даю своё согласие на обработку персональных данных
                  </label>
                </div>
              )}

              {regError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <Icon name="AlertCircle" size={14} />
                  {regError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                disabled={registering || (!!policyUrl && !policyAccepted)}
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