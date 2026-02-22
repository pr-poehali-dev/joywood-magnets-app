import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadWidgetAssets } from "@/components/ui/phone-verify-widget";
import { usePhoneInput } from "@/hooks/usePhoneInput";
import { loadSession, saveSession, SESSION_KEY } from "./collection/types";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SCAN_URL = "https://functions.poehali.dev/a1fcc017-69d2-46bf-95cc-a735deda6c26";
const LOOKUP_URL = "https://functions.poehali.dev/58aabebd-4ca5-40ce-9188-288ec6f26ec4";
const BREED_PHOTOS_URL = "https://functions.poehali.dev/264a19bd-40c8-4203-a8cd-9f3709bedcee";
const SETTINGS_URL = "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1";

type ScanStep = "phone" | "verify" | "scanning" | "result";
type ScanResult = "revealed" | "already_revealed" | "not_in_collection" | null;

const STAR_LABELS: Record<number, string> = { 1: "⭐", 2: "⭐⭐", 3: "⭐⭐⭐" };

export default function ScanMagnet() {
  const { breed } = useParams<{ breed: string }>();
  const navigate = useNavigate();
  const breedDecoded = decodeURIComponent(breed || "");

  const [step, setStep] = useState<ScanStep>("phone");
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scanData, setScanData] = useState<{ breed: string; stars?: number; category?: string; magnet_id?: number } | null>(null);
  const [breedPhoto, setBreedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const phone = usePhoneInput();

  useEffect(() => {
    fetch(SETTINGS_URL)
      .then((r) => r.json())
      .then((s) => setVerificationEnabled(s.phone_verification_enabled !== "false"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const session = loadSession();
    if (session && step === "phone") {
      doScan(session.phone);
    }
  }, []);

  const doScan = useCallback(async (userPhone: string) => {
    setStep("scanning");
    setLoading(true);
    try {
      const [scanRes, photosRes] = await Promise.all([
        fetch(SCAN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: userPhone, breed: breedDecoded }),
        }),
        fetch(BREED_PHOTOS_URL),
      ]);
      const data = await scanRes.json();
      const photosData = await photosRes.json();
      const photos = photosData.photos || {};
      if (photos[breedDecoded]) setBreedPhoto(photos[breedDecoded]);

      if (!scanRes.ok) {
        toast.error(data.error || "Ошибка при сканировании");
        setStep("phone");
        return;
      }

      setScanResult(data.result);
      setScanData({ breed: data.breed, stars: data.stars, category: data.category, magnet_id: data.magnet_id });
      setStep("result");

      if (data.result === "revealed") {
        setShowAnimation(true);
        const lookupRes = await fetch(LOOKUP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: userPhone }),
        });
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          const session = loadSession();
          if (session) {
            saveSession(session.phone, lookupData, photos);
          }
        }
      }
    } catch {
      toast.error("Не удалось обработать сканирование");
      setStep("phone");
    } finally {
      setLoading(false);
    }
  }, [breedDecoded]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.isValid) return;
    if (verificationEnabled) {
      await loadWidgetAssets();
      setVerifiedPhone(phone.fullPhone);
      setStep("verify");
    } else {
      await doScan(phone.fullPhone);
    }
  };

  useEffect(() => {
    if (step !== "verify" || !widgetRef.current) return;
    const container = widgetRef.current;
    container.innerHTML = "";

    const onVerified = (e: CustomEvent) => {
      const verPhone = e.detail?.phone || verifiedPhone;
      doScan(verPhone);
    };

    container.addEventListener("verified", onVerified as EventListener);
    const widget = document.createElement("i-dgtl-sms-widget");
    widget.setAttribute("phone", verifiedPhone);
    container.appendChild(widget);
    return () => container.removeEventListener("verified", onVerified as EventListener);
  }, [step, verifiedPhone, doScan]);

  if (!breedDecoded) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Порода не указана</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-2">
          <img
            src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg"
            alt="Joywood"
            className="w-14 h-14 mx-auto object-contain"
          />
          <h1 className="text-xl font-bold">Joywood — коллекция пород</h1>
        </div>

        {(step === "phone" || step === "verify") && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-1">
              <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Вы сканируете магнит</p>
              <p className="text-lg font-bold text-amber-900">{breedDecoded}</p>
            </div>

            {step === "phone" && (
              <form onSubmit={handlePhoneSubmit} className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Введите ваш номер телефона, чтобы добавить магнит в коллекцию
                </p>
                <Input
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={phone.value}
                  onChange={phone.onChange}
                  className="text-center text-lg"
                  autoFocus
                />
                <Button type="submit" className="w-full" disabled={!phone.isValid || loading}>
                  {loading ? "Проверяем..." : "Раскрыть магнит"}
                </Button>
              </form>
            )}

            {step === "verify" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">Подтвердите номер телефона</p>
                <div ref={widgetRef} />
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep("phone")}>
                  ← Назад
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "scanning" && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Обрабатываем сканирование...</p>
          </div>
        )}

        {step === "result" && scanResult === "revealed" && (
          <div className="space-y-5">
            <div className={`text-center space-y-3 transition-all duration-700 ${showAnimation ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="text-5xl animate-bounce">🎉</div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-600 uppercase tracking-wide">Магнит раскрыт!</p>
                <p className="text-2xl font-bold">{scanData?.breed}</p>
                {scanData?.stars && (
                  <p className="text-lg">{STAR_LABELS[scanData.stars]}</p>
                )}
                {scanData?.category && (
                  <p className="text-sm text-muted-foreground">{scanData.category}</p>
                )}
              </div>
              {breedPhoto && (
                <div className="relative mx-auto w-40 h-40 rounded-2xl overflow-hidden shadow-lg">
                  <img src={breedPhoto} alt={scanData?.breed} className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Порода добавлена в вашу коллекцию
              </p>
            </div>
            <Button className="w-full" onClick={() => {
              localStorage.removeItem(SESSION_KEY);
              navigate("/");
            }}>
              <Icon name="BookOpen" size={16} className="mr-2" />
              Открыть мою коллекцию
            </Button>
          </div>
        )}

        {step === "result" && scanResult === "already_revealed" && (
          <div className="space-y-5">
            <div className="text-center space-y-3">
              <div className="text-4xl">✅</div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">Уже в коллекции</p>
                <p className="text-2xl font-bold">{scanData?.breed}</p>
              </div>
              {breedPhoto && (
                <div className="mx-auto w-32 h-32 rounded-xl overflow-hidden shadow">
                  <img src={breedPhoto} alt={scanData?.breed} className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">Этот магнит уже есть в вашей коллекции</p>
            </div>
            <Button className="w-full" onClick={() => navigate("/")}>
              <Icon name="BookOpen" size={16} className="mr-2" />
              Открыть мою коллекцию
            </Button>
          </div>
        )}

        {step === "result" && scanResult === "not_in_collection" && (
          <div className="space-y-5">
            <div className="text-center space-y-3">
              <div className="text-4xl">🔍</div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-600 uppercase tracking-wide">Магнит не ожидается</p>
                <p className="text-2xl font-bold">{scanData?.breed}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Этот магнит не числится среди ваших отправленных. Возможно, он принадлежит другому участнику или ещё не был оформлен.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              <Icon name="Home" size={16} className="mr-2" />
              В мою коллекцию
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}