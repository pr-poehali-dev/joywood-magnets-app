import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { loadWidgetAssets } from "@/components/ui/phone-verify-widget";
import { WOOD_BREEDS } from "@/lib/store";
import { loadRaccoonAssets } from "@/lib/raccoon";
import { toast } from "sonner";
import { usePhoneInput } from "@/hooks/usePhoneInput";
import { CollectionData, Step, saveSession, loadSession } from "./types";

const LOOKUP_URL = "https://functions.poehali.dev/58aabebd-4ca5-40ce-9188-288ec6f26ec4";
const BREED_PHOTOS_URL = "https://functions.poehali.dev/264a19bd-40c8-4203-a8cd-9f3709bedcee";
const BREED_NOTES_URL = "https://functions.poehali.dev/01b2a03b-f306-4d41-8210-bda0b419927a";
const SETTINGS_URL = "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1";
const SAVE_CONSENT_URL = "https://functions.poehali.dev/abee8bc8-7d35-4fe6-88d2-d62e1faec0c5";
const SCAN_URL = "https://functions.poehali.dev/a1fcc017-69d2-46bf-95cc-a735deda6c26";

let photosCache: Record<string, string> | null = null;
export const getBreedPhotos = async (): Promise<Record<string, string>> => {
  if (photosCache) return photosCache;
  const res = await fetch(BREED_PHOTOS_URL);
  const data = await res.json();
  photosCache = data.photos || {};
  return photosCache!;
};

let notesCache: Record<string, string> | null = null;
export const getBreedNotes = async (): Promise<Record<string, string>> => {
  if (notesCache) return notesCache;
  const res = await fetch(BREED_NOTES_URL);
  const data = await res.json();
  notesCache = data.notes || {};
  return notesCache!;
};

export interface RevealModalState {
  breed: string;
  photoUrl?: string;
  stars: number;
  category: string;
}

export interface ScanResultState {
  result: string;
  breed: string;
}

export function useCollectionData() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CollectionData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [breedPhotos, setBreedPhotos] = useState<Record<string, string>>({});
  const [breedNotes, setBreedNotes] = useState<Record<string, string>>({});
  const [justRegistered, setJustRegistered] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null);
  const [revealModal, setRevealModal] = useState<RevealModalState | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<number | null>(null);
  const [animateXp, setAnimateXp] = useState(false);
  const prevLevelRef = useRef<number | null>(null);
  const pendingLevelUp = useRef<number | null>(null);
  const pendingWelcome = useRef(false);
  const welcomeBreed = useRef("");
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

    getBreedPhotos().catch(() => {});
    getBreedNotes().then((n) => setBreedNotes(n)).catch(() => {});
    loadRaccoonAssets().catch(() => {});
  }, []);

  useEffect(() => {
    const session = loadSession();
    if (session && step === "phone") {
      setData(session.data);
      setBreedPhotos(session.photos);
      setStep("collection");
      const sessionPhone = session.phone;

      const tryFetchFresh = (attempt = 1): void => {
        Promise.all([
          fetch(LOOKUP_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: sessionPhone }) }).then((r) => r.json()),
          getBreedPhotos(),
        ])
          .then(([freshData, photos]) => {
            if (freshData && !freshData.error) {
              setData(freshData);
              setBreedPhotos(photos);
              saveSession(sessionPhone, freshData, photos);
            } else if (attempt < 3) {
              setTimeout(() => tryFetchFresh(attempt + 1), 1000);
            } else {
              setBreedPhotos(photos);
              saveSession(sessionPhone, session.data, photos);
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
          body: JSON.stringify({ phone: sessionPhone, breed: scanBreed }),
        })
          .then((r) => r.json())
          .then((scanData) => {
            if (scanData.result === "revealed") {
              fetch(LOOKUP_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: sessionPhone }),
              })
                .then((r) => r.json())
                .then((refreshed) => {
                  setData(refreshed);
                  saveSession(sessionPhone, refreshed, session.photos);
                  const breedInfo = WOOD_BREEDS.find((b) => b.breed === scanBreed);
                  if (scanData.is_welcome) pendingWelcome.current = true;
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
      const [res, photos] = await Promise.all([
        fetch(LOOKUP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: searchPhone }),
        }).then((r) => r.json()),
        getBreedPhotos(),
      ]);
      if (res.error) throw new Error(res.error || "Ошибка загрузки");
      setBreedPhotos(photos);
      setData(res);
      saveSession(searchPhone, res, photos);
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
            if (scanData.is_welcome) pendingWelcome.current = true;
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
    loadWidgetAssets().catch(() => {});
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
    localStorage.removeItem("jw_collection_session_v2");
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

  useEffect(() => {
    const newLevel = data?.raccoon?.level ?? null;
    if (newLevel !== null && prevLevelRef.current !== null && newLevel > prevLevelRef.current) {
      if (revealModal) {
        pendingLevelUp.current = newLevel;
      } else {
        setLevelUpModal(newLevel);
      }
    }
    prevLevelRef.current = newLevel;
  }, [data?.raccoon?.level, revealModal]);

  const collectedBreeds = useMemo(
    () => data ? new Set(data.magnets.map((m) => m.breed)) : new Set<string>(),
    [data]
  );
  const collectedOrder = useMemo(
    () => data ? data.magnets.map((m) => m.breed) : [],
    [data]
  );
  const inactiveBreeds = useMemo(
    () => data?.inactive_breeds ? new Set(data.inactive_breeds) : new Set<string>(),
    [data]
  );
  const visibleBreeds = useMemo(
    () => WOOD_BREEDS.filter((b) => !inactiveBreeds.has(b.breed) || collectedBreeds.has(b.breed)),
    [inactiveBreeds, collectedBreeds]
  );
  const sortedBreeds = useMemo(() => {
    if (!data) return visibleBreeds;
    return [
      ...visibleBreeds.filter((b) => collectedBreeds.has(b.breed)).sort(
        (a, b) => collectedOrder.indexOf(a.breed) - collectedOrder.indexOf(b.breed)
      ),
      ...visibleBreeds.filter((b) => !collectedBreeds.has(b.breed)),
    ];
  }, [data, visibleBreeds, collectedBreeds, collectedOrder]);

  const runPostRevealFlow = (breed: string, lvl: number | null) => {
    // 0ms   — скролл к слоту с магнитом
    // 1800ms — скролл к Еноту
    // 2600ms — XP-анимация начинается
    // 4500ms — XP-анимация заканчивается (пауза для наблюдения)
    // 5200ms — открывается видео повышения уровня (если есть)
    if (breed) scrollToBreed(breed);
    setTimeout(() => {
      const raccoonEl = document.querySelector("[data-raccoon-card]");
      if (raccoonEl) raccoonEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }, breed ? 1800 : 300);
    setTimeout(() => setAnimateXp(true),  breed ? 2600 : 600);
    setTimeout(() => setAnimateXp(false), breed ? 4500 : 2500);
    if (lvl) {
      setTimeout(() => setLevelUpModal(lvl), breed ? 5200 : 3000);
    }
  };

  const handleRevealClose = () => {
    const breed = revealModal?.breed ?? "";
    const lvl = pendingLevelUp.current;
    pendingLevelUp.current = null;
    const isWelcome = pendingWelcome.current;
    pendingWelcome.current = false;
    setRevealModal(null);
    if (isWelcome) {
      welcomeBreed.current = breed;
      setLevelUpModal(1);
    } else {
      runPostRevealFlow(breed, lvl);
    }
  };

  const handleMagnetClick = () => {
    if (!revealModal) return;
    const breed = revealModal.breed;
    const lvl = pendingLevelUp.current;
    pendingLevelUp.current = null;
    const isWelcome = pendingWelcome.current;
    pendingWelcome.current = false;
    setRevealModal(null);
    if (isWelcome) {
      welcomeBreed.current = breed;
      setLevelUpModal(1);
    } else {
      runPostRevealFlow(breed, lvl);
    }
  };

  const handleLevelUpClose = () => {
    const wb = welcomeBreed.current;
    welcomeBreed.current = "";
    setLevelUpModal(null);
    if (wb) {
      runPostRevealFlow(wb, null);
    }
  };

  return {
    // state
    step, loading, data, notFound, verifiedPhone, breedPhotos, breedNotes,
    justRegistered, scanResult, setScanResult,
    revealModal, levelUpModal, setLevelUpModal, animateXp,
    // phone form
    phone, showRegister, policyUrl, needsConsent, pendingPhone, pendingPolicyVersion,
    // refs
    notFoundRef,
    // computed
    sortedBreeds, collectedBreeds, visibleBreeds,
    // handlers
    handlePhoneSubmit, handleReset, handleVerifyBack,
    handleRegistered, handleConsentAccepted,
    handleRevealClose, handleMagnetClick, handleLevelUpClose,
    doSearch,
  };
}