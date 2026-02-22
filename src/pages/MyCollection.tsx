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
import MagnetRevealModal from "@/components/MagnetRevealModal";
import Icon from "@/components/ui/icon";

const LOOKUP_URL = "https://functions.poehali.dev/58aabebd-4ca5-40ce-9188-288ec6f26ec4";
const BREED_PHOTOS_URL = "https://functions.poehali.dev/264a19bd-40c8-4203-a8cd-9f3709bedcee";
const SETTINGS_URL = "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1";
const SAVE_CONSENT_URL = "https://functions.poehali.dev/abee8bc8-7d35-4fe6-88d2-d62e1faec0c5";

const SCAN_URL = "https://functions.poehali.dev/a1fcc017-69d2-46bf-95cc-a735deda6c26";

const MyCollection = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CollectionData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [breedPhotos, setBreedPhotos] = useState<Record<string, string>>({});
  const [justRegistered, setJustRegistered] = useState(false);
  const [scanResult, setScanResult] = useState<{ result: string; breed: string } | null>(null);
  const [revealModal, setRevealModal] = useState<{ breed: string; photoUrl?: string; stars: number; category: string } | null>(null);
  const notFoundRef = useRef<HTMLDivElement>(null);
  const autoSearched = useRef(false);
  const scanBreed = searchParams.get("scan") || "";

  const phone = usePhoneInput();
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [policyUrl, setPolicyUrl] = useState("");
  const [needsConsent, setNeedsConsent] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [pendingPolicyVersion, setPendingPolicyVersion] = useState("");

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
      const phone = session.phone;
      // Всегда обновляем данные с сервера в фоне (чтобы новые in_transit магниты появлялись сразу)
      const tryFetchFresh = (attempt = 1): void => {
        Promise.all([
          fetch(LOOKUP_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) }).then((r) => r.json()),
          fetch(BREED_PHOTOS_URL).then((r) => r.json()),
        ])
          .then(([freshData, photosData]) => {
            const photos = photosData.photos || {};
            if (freshData && !freshData.error) {
              setData(freshData);
              setBreedPhotos(photos);
              saveSession(phone, freshData, photos);
            } else if (attempt < 3) {
              setTimeout(() => tryFetchFresh(attempt + 1), 1000);
            } else {
              setBreedPhotos(photos);
              saveSession(phone, session.data, photos);
            }
          })
          .catch(() => {
            if (attempt < 3) setTimeout(() => tryFetchFresh(attempt + 1), 1000);
          });
      };
      tryFetchFresh();
      if (scanBreed) {
        fetch(SCAN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, breed: scanBreed }),
        })
          .then((r) => r.json())
          .then((scanData) => {
            if (scanData.result === "revealed") {
              fetch(LOOKUP_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
              })
                .then((r) => r.json())
                .then((refreshed) => {
                  setData(refreshed);
                  saveSession(phone, refreshed, session.photos);
                  const breedInfo = WOOD_BREEDS.find((b) => b.breed === scanBreed);
                  setRevealModal({
                    breed: scanBreed,
                    photoUrl: session.photos[scanBreed],
                    stars: breedInfo?.stars ?? 1,
                    category: breedInfo?.category ?? "",
                  });
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
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
      console.log('[JW] lookup result:', JSON.stringify({ total_magnets: result.total_magnets, in_transit_count: result.in_transit?.length, in_transit: result.in_transit }));
      setBreedPhotos(photos);
      setData(result);
      saveSession(searchPhone, result, photos);
      if (isNewRegistration) setJustRegistered(true);
      setStep("collection");
      if (scanBreed) {
        try {
          const scanRes = await fetch(SCAN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: searchPhone, breed: scanBreed }),
          });
          const scanData = await scanRes.json();
          if (scanData.result === "revealed") {
            const refreshRes = await fetch(LOOKUP_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: searchPhone }),
            });
            if (refreshRes.ok) {
              const refreshed = await refreshRes.json();
              setData(refreshed);
              saveSession(searchPhone, refreshed, photos);
            }
            const breedInfo = WOOD_BREEDS.find((b) => b.breed === scanBreed);
            setRevealModal({
              breed: scanBreed,
              photoUrl: photos[scanBreed],
              stars: breedInfo?.stars ?? 1,
              category: breedInfo?.category ?? "",
            });
          } else {
            setScanResult({ result: scanData.result, breed: scanBreed });
          }
        } catch { /* non-critical */ }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось загрузить данные");
      setStep("phone");
    } finally {
      setLoading(false);
    }
  }, []);

  const proceedAfterConsent = useCallback(async (searchPhone: string) => {
    if (!verificationEnabled) {
      await doSearch(searchPhone);
      return;
    }
    await loadWidgetAssets();
    setVerifiedPhone(searchPhone);
    setStep("verify");
  }, [verificationEnabled, doSearch]);

  const handleConsentAccepted = useCallback(async (searchPhone: string, policyVersion: string) => {
    try {
      await fetch(SAVE_CONSENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: searchPhone,
          policy_version: policyVersion,
          user_agent: navigator.userAgent,
        }),
      });
    } catch { /* non-critical */ }
    setNeedsConsent(false);
    await proceedAfterConsent(searchPhone);
  }, [proceedAfterConsent]);

  const checkExists = useCallback(async (searchPhone: string) => {
    setLoading(true);
    setNotFound(false);
    setNeedsConsent(false);
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
      const data = await res.json();
      if (data.needs_consent) {
        setNeedsConsent(true);
        setPendingPhone(searchPhone);
        setPendingPolicyVersion(data.policy_version || data.policy_url || "");
        return;
      }
      await proceedAfterConsent(searchPhone);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось проверить номер");
    } finally {
      setLoading(false);
    }
  }, [proceedAfterConsent]);

  const handleRegistered = useCallback(async (registeredPhone: string) => {
    await doSearch(registeredPhone, true);
  }, [doSearch]);

  useEffect(() => {
    const urlPhone = searchParams.get("phone");
    const isAdmin = searchParams.get("admin") === "1";
    if (urlPhone && !autoSearched.current) {
      autoSearched.current = true;
      if (isAdmin) {
        doSearch(urlPhone);
      } else {
        checkExists(urlPhone);
      }
    }
  }, [searchParams, checkExists, doSearch]);

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
    setNeedsConsent(false);
    setJustRegistered(false);
    autoSearched.current = false;
  };

  const handleVerifyBack = () => {
    setStep("phone");
    setNeedsConsent(false);
  };

  const scrollToBreed = (breed: string) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-breed="${CSS.escape(breed)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement).style.transition = "box-shadow 0.3s";
        (el as HTMLElement).style.boxShadow = "0 0 0 3px #f59e0b, 0 0 16px 4px #fbbf24aa";
        setTimeout(() => { (el as HTMLElement).style.boxShadow = ""; }, 2000);
      }
    }, 100);
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
    <>
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
            policyVersion={pendingPolicyVersion}
            needsConsent={needsConsent}
            pendingPhone={pendingPhone}
            onPhoneSubmit={handlePhoneSubmit}
            onVerifySuccess={() => doSearch(verifiedPhone)}
            onVerifyBack={handleVerifyBack}
            onRegistered={handleRegistered}
            onConsentAccepted={handleConsentAccepted}
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
            {scanResult && (
              <div className={`rounded-xl border p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-500 ${
                scanResult.result === "revealed" ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" :
                scanResult.result === "already_revealed" ? "bg-blue-50 border-blue-200" :
                "bg-orange-50 border-orange-200"
              }`}>
                <span className="text-2xl leading-none mt-0.5">
                  {scanResult.result === "revealed" ? "🎉" : scanResult.result === "already_revealed" ? "✅" : "📦"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${
                    scanResult.result === "revealed" ? "text-green-900" :
                    scanResult.result === "already_revealed" ? "text-blue-900" : "text-orange-900"
                  }`}>
                    {scanResult.result === "revealed" && `Магнит «${scanResult.breed}» раскрыт!`}
                    {scanResult.result === "already_revealed" && `«${scanResult.breed}» уже в коллекции`}
                    {scanResult.result === "not_in_collection" && `Магнит «${scanResult.breed}» не найден`}
                  </div>
                  <div className={`text-sm mt-0.5 leading-relaxed ${
                    scanResult.result === "revealed" ? "text-green-700" :
                    scanResult.result === "already_revealed" ? "text-blue-700" : "text-orange-700"
                  }`}>
                    {scanResult.result === "revealed" && "Порода добавлена в вашу коллекцию — смотрите ниже!"}
                    {scanResult.result === "already_revealed" && "Этот магнит уже был отсканирован ранее."}
                    {scanResult.result === "not_in_collection" && "Этот магнит не числится среди отправленных вам."}
                  </div>
                </div>
                <button onClick={() => setScanResult(null)} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                  <Icon name="X" size={16} />
                </button>
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

    {revealModal && (
      <MagnetRevealModal
        breed={revealModal.breed}
        photoUrl={revealModal.photoUrl}
        stars={revealModal.stars}
        category={revealModal.category}
        onClose={() => setRevealModal(null)}
        onMagnetClick={() => {
          const breed = revealModal.breed;
          setRevealModal(null);
          scrollToBreed(breed);
        }}
      />
    )}
    </>
  );
};


export default MyCollection;