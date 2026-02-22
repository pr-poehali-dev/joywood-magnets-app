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
import { API_URLS } from "@/lib/api";

const LOOKUP_URL = "https://functions.poehali.dev/58aabebd-4ca5-40ce-9188-288ec6f26ec4";
const BREED_PHOTOS_URL = "https://functions.poehali.dev/264a19bd-40c8-4203-a8cd-9f3709bedcee";

const MyCollection = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CollectionData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [breedPhotos, setBreedPhotos] = useState<Record<string, string>>({});
  const notFoundRef = useRef<HTMLDivElement>(null);
  const autoSearched = useRef(false);

  const phone = usePhoneInput();
  const [verificationEnabled, setVerificationEnabled] = useState(true);

  useEffect(() => {
    fetch(API_URLS.SETTINGS)
      .then((r) => r.json())
      .then((data) => {
        setVerificationEnabled(data.phone_verification_enabled !== "false");
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

  const doSearch = useCallback(async (searchPhone: string) => {
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
    autoSearched.current = false;
  };

  const collectedBreeds = data ? new Set(data.magnets.map((m) => m.breed)) : new Set<string>();
  const collectedOrder = data ? data.magnets.map((m) => m.breed) : [];

  const sortedBreeds = data
    ? [
        ...WOOD_BREEDS.filter((b) => collectedBreeds.has(b.breed)).sort(
          (a, b) => collectedOrder.indexOf(a.breed) - collectedOrder.indexOf(b.breed)
        ),
        ...WOOD_BREEDS.filter((b) => !collectedBreeds.has(b.breed)),
      ]
    : WOOD_BREEDS;

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
            onPhoneSubmit={handlePhoneSubmit}
            onVerifySuccess={() => doSearch(verifiedPhone)}
            onVerifyBack={() => setStep("phone")}
          />
        )}

        {step === "collection" && data && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CollectionDashboard data={data} onReset={handleReset} />
            <CollectionBonusProgress data={data} />
            <CollectionBreedAtlas
              data={data}
              sortedBreeds={sortedBreeds}
              collectedBreeds={collectedBreeds}
              breedPhotos={breedPhotos}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCollection;