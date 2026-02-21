import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { usePhoneInput } from "@/hooks/usePhoneInput";
import { PhoneInput } from "@/components/ui/phone-input";

declare global {
  interface Window {
    VerifyWidget: {
      mount: (selector: string, options: object, sendFn: (key: string) => Promise<unknown>, onSuccess: () => void) => void;
      unmount: (selector: string) => void;
    };
  }
}

const REGISTER_URL = "https://functions.poehali.dev/40f9e8db-184c-407c-ace9-d0877ed306b9";
const SEND_VERIFY_URL = "https://functions.poehali.dev/0ddb5905-2b59-42a3-a5a2-ddeaa961caa9";
const CHECK_VERIFY_URL = "https://functions.poehali.dev/97edf104-eb7b-4e03-bb36-53ef11b85257";
const WIDGET_ID = "qFvkj4";
const CAPTCHA_SITEKEY = "9858807e-0328-46a4-914e-1d7e825044e0";

type Step = "form" | "verify";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [ozonCode, setOzonCode] = useState("");
  const [showOzon, setShowOzon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");

  const phone = usePhoneInput();
  const verifyKeyRef = useRef<string>("");
  const widgetLoaded = useRef(false);

  const isValid =
    name.trim().length >= 2 &&
    phone.isValid &&
    (!showOzon || ozonCode.trim().length >= 3);

  const loadWidgetAssets = useCallback(() => {
    if (widgetLoaded.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      if (!document.querySelector('link[href*="VerifyWidget.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.direct.i-dgtl.ru/VerifyWidget.css";
        document.head.appendChild(link);
      }
      if (!document.querySelector('script[src*="VerifyWidget"]')) {
        const script = document.createElement("script");
        script.src = "https://cdn.direct.i-dgtl.ru/VerifyWidget.umd.min.js";
        script.onload = () => { widgetLoaded.current = true; resolve(); };
        document.head.appendChild(script);
      } else {
        widgetLoaded.current = true;
        resolve();
      }
    });
  }, []);

  const doRegister = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.fullPhone,
          ozon_order_code: showOzon && ozonCode.trim() ? ozonCode.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
      navigate("/my-collection?phone=" + encodeURIComponent(phone.fullPhone));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
      setStep("form");
    } finally {
      setLoading(false);
    }
  }, [name, phone.fullPhone, showOzon, ozonCode, navigate]);

  const doRegisterRef = useRef(doRegister);
  doRegisterRef.current = doRegister;

  const mountWidget = useCallback((phoneNumber: string) => {
    if (!window.VerifyWidget) return;

    const sendAuthKeyFunc = async (key: string) => {
      verifyKeyRef.current = key;
      const res = await fetch(SEND_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Ошибка отправки кода");
      return res;
    };

    const onSuccessFunc = async () => {
      const res = await fetch(CHECK_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: verifyKeyRef.current }),
      });
      const result = await res.json();
      if (result.status === "CONFIRMED") {
        window.VerifyWidget.unmount("#verify-widget");
        doRegisterRef.current();
      } else {
        toast.error("Верификация не подтверждена");
      }
    };

    window.VerifyWidget.mount(
      "#verify-widget",
      { destination: phoneNumber, widgetId: WIDGET_ID, captchaSiteKey: CAPTCHA_SITEKEY },
      sendAuthKeyFunc,
      onSuccessFunc,
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      await loadWidgetAssets();
      setStep("verify");
      setTimeout(() => mountWidget(phone.fullPhone), 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <img src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg" alt="Joywood" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="text-2xl font-bold text-foreground">Атлас пород</h1>
          <p className="text-muted-foreground text-sm">
            Регистрация в акции Joywood — собирайте коллекцию магнитов из ценных пород дерева
          </p>
        </div>

        <Card className="shadow-lg border-gold-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Регистрация участника</CardTitle>
          </CardHeader>
          <CardContent>
            {step === "form" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Ваше имя</Label>
                  <Input
                    id="name"
                    placeholder="Как к вам обращаться?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <PhoneInput id="phone" phoneHook={phone} />
                  <p className="text-xs text-muted-foreground">
                    По номеру телефона вы сможете войти в коллекцию в любое время
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowOzon((v) => !v)}
                    className={`w-full flex items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                      showOzon
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Icon name="Package" size={16} />
                      Покупал(а) на Ozon
                    </span>
                    <Icon name={showOzon ? "ChevronUp" : "ChevronDown"} size={16} />
                  </button>

                  {showOzon && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Label htmlFor="ozon-code">Номер заказа Ozon</Label>
                      <Input
                        id="ozon-code"
                        placeholder="Например: 12345678-0001"
                        value={ozonCode}
                        onChange={(e) => setOzonCode(e.target.value)}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Найдите номер в разделе «Мои заказы» на Ozon
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-gold-500 hover:bg-gold-600"
                  disabled={!isValid || loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Icon name="Loader2" size={18} className="animate-spin" />
                      Загрузка...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Icon name="UserPlus" size={18} />
                      Зарегистрироваться
                    </span>
                  )}
                </Button>
              </form>
            )}

            {step === "verify" && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Подтвердите номер телефона</p>
                  <p className="text-sm text-muted-foreground">Выберите удобный способ получения кода</p>
                </div>
                <div id="verify-widget" />
                {loading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    Регистрация...
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setStep("form")}
                >
                  <Icon name="ArrowLeft" size={16} />
                  Изменить данные
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {step === "form" && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-lg border p-3">
              <div className="text-xl mb-1">🧲</div>
              <div className="text-xs text-muted-foreground">20 пород в коллекции</div>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <div className="text-xl mb-1">🎁</div>
              <div className="text-xs text-muted-foreground">Бонусы за сбор</div>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <div className="text-xl mb-1">⭐</div>
              <div className="text-xs text-muted-foreground">Редкие магниты</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
