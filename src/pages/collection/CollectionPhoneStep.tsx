import { RefObject } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { PhoneVerifyWidget } from "@/components/ui/phone-verify-widget";
import { PhoneInput } from "@/components/ui/phone-input";
import { usePhoneInput } from "@/hooks/usePhoneInput";

interface Props {
  step: "phone" | "verify";
  loading: boolean;
  notFound: boolean;
  verifiedPhone: string;
  notFoundRef: RefObject<HTMLDivElement>;
  phoneHook: ReturnType<typeof usePhoneInput>;
  onPhoneSubmit: (e: React.FormEvent) => void;
  onVerifySuccess: () => void;
  onVerifyBack: () => void;
}

const CollectionPhoneStep = ({
  step,
  loading,
  notFound,
  verifiedPhone,
  notFoundRef,
  phoneHook,
  onPhoneSubmit,
  onVerifySuccess,
  onVerifyBack,
}: Props) => {
  return (
    <>
      {step === "phone" && (
        <Card className="shadow-lg border-gold-200">
          <CardContent className="pt-6">
            <form onSubmit={onPhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Номер телефона</Label>
                <PhoneInput id="phone" phoneHook={phoneHook} />
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
        <Card ref={notFoundRef} className="border-gold-200 bg-gold-50">
          <CardContent className="pt-6 text-center space-y-4">
            <Icon name="UserX" size={44} className="mx-auto text-gold-400" />
            <div>
              <p className="font-semibold text-gold-900">Номер не найден</p>
              <p className="text-sm text-gold-700 mt-1">
                Возможно, вы ещё не зарегистрированы в акции или указали другой номер
              </p>
            </div>
            <a href="/register">
              <Button className="w-full bg-gold-500 hover:bg-gold-600 gap-2">
                <Icon name="UserPlus" size={16} />
                Зарегистрироваться в акции
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default CollectionPhoneStep;
