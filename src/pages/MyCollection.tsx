import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { loadWidgetAssets } from "@/components/ui/phone-verify-widget";
import { WOOD_BREEDS } from "@/lib/store";
import { toast } from "sonner";
import { usePhoneInput } from "@/hooks/usePhoneInput";
import { CollectionData, Step, SESSION_KEY, saveSession, loadSession } from "./collection/types";
import CollectionPhoneStep from "./collection/CollectionPhoneStep";
import CollectionDashboard from "./collection/CollectionDashboard";
import CollectionBonusProgress from "./collection/CollectionBonusProgress";
import CollectionBreedAtlas from "./collection/CollectionBreedAtlas";
import Icon from "@/components/ui/icon";

const LOOKUP_URL = "https://functions.poehali.dev/58aabebd-4ca5-40ce-9188-288ec6f26ec4";
const BREED_PHOTOS_URL = "https://functions.poehali.dev/264a19bd-40c8-4203-a8cd-9f3709bedcee";
const SETTINGS_URL = "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1";

const MyCollection = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CollectionData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [breedPhotos, setBreedPhotos] = useState<Record<string, string>>({});
  const [justRegistered, setJustRegistered] = useState(false);
  const notFoundRef = useRef<HTMLDivElement>(null);
  const autoSearched = useRef(false);

  const phone = usePhoneInput();
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [policyUrl, setPolicyUrl] = useState("");

  useEffect(() => {
    fetch(SETTINGS_URL)
      .then((r) => r.json())
      .then((s) => {
        setVerificationEnabled(s.phone_verification_enabled !== "false");
        setShowRegister(s.show_register_page === "true");
        setPolicyUrl(s.privacy_policy_url || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const session = loadSession();
    if (session && step === "phone") {
      setData(session.data);
      setBreedPhotos(session.photos);
      setStep("collection");
      fetch(BREED_PHOTOS_URL)
        .then((r) => r.json())
        .then((d) => {
          const photos = d.photos || {};
          setBreedPhotos(photos);
          saveSession(session.phone, session.data, photos);
        })
        .catch(() => {});
    }
  }, []);

  const doSearch = useCallback(async (searchPhone: string, isNewRegistration = false) => {
    setLoading(true);
    try {
      const [res, photosRes] = await Promise.all([
        fetch(LOOKUP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: searchPhone }),
        }),
        fetch(BREED_PHOTOS_URL),
      ]);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Ошибка загрузки");
      const photosData = await photosRes.json();
      const photos = photosData.photos || {};
      setBreedPhotos(photos);
      setData(result);
      saveSession(searchPhone, result, photos);
      if (isNewRegistration) setJustRegistered(true);
      setStep("collection");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось загрузить данные");
      setStep("phone");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkExists = useCallback(async (searchPhone: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(LOOKUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: searchPhone, check_only: true }),
      });
      if (res.status === 404) {
        setNotFound(true);
        setTimeout(() => notFoundRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
        return;
      }
      if (!res.ok) throw new Error("Ошибка проверки");
      if (!verificationEnabled) {
        await doSearch(searchPhone);
        return;
      }
      await loadWidgetAssets();
      setVerifiedPhone(searchPhone);
      setStep("verify");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось проверить номер");
    } finally {
      setLoading(false);
    }
  }, [verificationEnabled, doSearch]);

  const handleRegistered = useCallback(async (registeredPhone: string) => {
    await doSearch(registeredPhone, true);
  }, [doSearch]);

  useEffect(() => {
    const urlPhone = searchParams.get("phone");
    if (urlPhone && !autoSearched.current) {
      autoSearched.current = true;
      checkExists(urlPhone);
    }
  }, [searchParams, checkExists]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.isValid) return;
    await checkExists(phone.fullPhone);
  };

  const handleReset = () => {
    localStorage.removeItem(SESSION_KEY);
    setData(null);
    setStep("phone");
    setNotFound(false);
    setJustRegistered(false);
    autoSearched.current = false;
  };

  const collectedBreeds = data ? new Set(data.magnets.map((m) => m.breed)) : new Set<string>();
  const collectedOrder = data ? data.magnets.map((m) => m.breed) : [];
  const inactiveBreeds = data?.inactive_breeds ? new Set(data.inactive_breeds) : new Set<string>();

  const visibleBreeds = WOOD_BREEDS.filter(
    (b) => !inactiveBreeds.has(b.breed) || collectedBreeds.has(b.breed)
  );

  const sortedBreeds = data
    ? [
        ...visibleBreeds.filter((b) => collectedBreeds.has(b.breed)).sort(
          (a, b) => collectedOrder.indexOf(a.breed) - collectedOrder.indexOf(b.breed)
        ),
        ...visibleBreeds.filter((b) => !collectedBreeds.has(b.breed)),
      ]
    : visibleBreeds;

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-3">
          <img
            src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg"
            alt="Joywood"
            className="w-20 h-20 mx-auto object-contain"
          />
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-foreground">Ваша коллекция уже началась</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              В ваших руках — образец настоящей ценной породы дерева. Joywood работает с более чем 50 породами, и каждая следующая покупка приближает вас к редким экземплярам и подаркам
            </p>
          </div>
        </div>

        {(step === "phone" || step === "verify") && (
          <CollectionPhoneStep
            step={step}
            loading={loading}
            notFound={notFound}
            verifiedPhone={verifiedPhone}
            notFoundRef={notFoundRef}
            phoneHook={phone}
            showRegister={showRegister}
            policyUrl={policyUrl}
            onPhoneSubmit={handlePhoneSubmit}
            onVerifySuccess={() => doSearch(verifiedPhone)}
            onVerifyBack={() => setStep("phone")}
            onRegistered={handleRegistered}
          />
        )}

        {step === "collection" && data && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {justRegistered && (
              <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 flex gap-3 items-start">
                <span className="text-2xl leading-none mt-0.5">🎉</span>
                <div>
                  <div className="font-semibold text-green-900 text-sm">Добро пожаловать в акцию Joywood!</div>
                  <div className="text-sm text-green-700 mt-0.5 leading-relaxed">
                    Вы успешно зарегистрированы. Ваш первый магнит уже ждёт вас — он прибыл вместе с заказом Ozon. Каждая следующая покупка принесёт новые редкие породы.
                  </div>
                </div>
              </div>
            )}
            <CollectionDashboard data={data} onReset={handleReset} />
            <CollectionBonusProgress data={data} />
            <CollectionBreedAtlas
              data={data}
              sortedBreeds={sortedBreeds}
              collectedBreeds={collectedBreeds}
              breedPhotos={breedPhotos}
              totalVisible={visibleBreeds.length}
            />
          </div>
        )}

        {step === "collection" && !data && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Icon name="Loader2" size={20} className="animate-spin" />
            Загрузка...
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCollection;