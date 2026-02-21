import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

declare global {
  interface Window {
    VerifyWidget: {
      mount: (selector: string, options: object, sendFn: (key: string) => Promise<unknown>, onSuccess: () => void) => void;
      unmount: (selector: string) => void;
    };
  }
}

const SEND_VERIFY_URL = "https://functions.poehali.dev/0ddb5905-2b59-42a3-a5a2-ddeaa961caa9";
const CHECK_VERIFY_URL = "https://functions.poehali.dev/97edf104-eb7b-4e03-bb36-53ef11b85257";
const WIDGET_ID = "qFvkj4";
const CAPTCHA_SITEKEY = "9858807e-0328-46a4-914e-1d7e825044e0";

let assetsLoaded = false;

function loadWidgetAssets(): Promise<void> {
  if (assetsLoaded) return Promise.resolve();
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
      script.onload = () => { assetsLoaded = true; resolve(); };
      document.head.appendChild(script);
    } else {
      assetsLoaded = true;
      resolve();
    }
  });
}

export { loadWidgetAssets };

interface PhoneVerifyWidgetProps {
  phone: string;
  onSuccess: () => void;
  onBack: () => void;
  elementId?: string;
}

export function PhoneVerifyWidget({ phone, onSuccess, onBack, elementId = "verify-widget" }: PhoneVerifyWidgetProps) {
  const verifyKeyRef = useRef<string>("");
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!window.VerifyWidget) return;

    const selector = `#${elementId}`;

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
        window.VerifyWidget.unmount(selector);
        onSuccessRef.current();
      } else {
        toast.error("Верификация не подтверждена");
      }
    };

    window.VerifyWidget.mount(
      selector,
      { destination: phone, widgetId: WIDGET_ID, captchaSiteKey: CAPTCHA_SITEKEY },
      sendAuthKeyFunc,
      onSuccessFunc,
    );

    return () => {
      window.VerifyWidget?.unmount(selector);
    };
  }, [phone, elementId]);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <p className="font-semibold text-foreground">Подтвердите номер телефона</p>
        <p className="text-sm text-muted-foreground">Выберите удобный способ получения кода</p>
      </div>
      <div id={elementId} />
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={onBack}
      >
        <Icon name="ArrowLeft" size={16} />
        Назад
      </Button>
    </div>
  );
}
