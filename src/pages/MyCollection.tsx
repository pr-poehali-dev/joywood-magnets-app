import { useRef, useEffect } from "react";
import CollectionPhoneStep from "./collection/CollectionPhoneStep";
import CollectionHeader from "./collection/CollectionHeader";
import CollectionView from "./collection/CollectionView";
import MagnetRevealModal from "@/components/MagnetRevealModal";
import LevelUpModal from "@/components/LevelUpModal";
import Icon from "@/components/ui/icon";
import { useCollectionData } from "./collection/useCollectionData";
import { primeAudio } from "@/components/MagnetRevealModal";

const MyCollection = () => {
  // Прогреваем AudioContext при первом тапе/клике на странице
  // Это нужно для пользователей, которые входят через сессию (минуя форму телефона)
  useEffect(() => {
    const prime = () => {
      primeAudio();
      document.removeEventListener("touchstart", prime, true);
      document.removeEventListener("mousedown", prime, true);
    };
    document.addEventListener("touchstart", prime, { capture: true, once: true });
    document.addEventListener("mousedown", prime, { capture: true, once: true });
    return () => {
      document.removeEventListener("touchstart", prime, true);
      document.removeEventListener("mousedown", prime, true);
    };
  }, []);

  const {
    step, loading, data, notFound, verifiedPhone, breedPhotos, breedNotes,
    justRegistered, scanResult, setScanResult,
    revealModal, levelUpModal, animateXp,
    phone, showRegister, policyUrl, needsConsent, pendingPhone, pendingPolicyVersion,
    notFoundRef,
    sortedBreeds, collectedBreeds, visibleBreeds,
    handlePhoneSubmit, handleReset, handleVerifyBack,
    handleRegistered, handleConsentAccepted,
    handleRevealClose, handleMagnetClick, handleLevelUpClose,
    doSearch,
  } = useCollectionData();

  // Запоминаем последнюю раскрытую породу для приоритета в заметках
  const lastRevealedRef = useRef<string | null>(null);
  if (revealModal?.breed) lastRevealedRef.current = revealModal.breed;
  const newBreeds = lastRevealedRef.current ? [lastRevealedRef.current] : undefined;

  return (
    <>
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="w-full max-w-lg mx-auto space-y-6">
          <CollectionHeader />

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
            <CollectionView
              data={data}
              justRegistered={justRegistered}
              scanResult={scanResult}
              onScanResultClose={() => setScanResult(null)}
              onReset={handleReset}
              sortedBreeds={sortedBreeds}
              collectedBreeds={collectedBreeds}
              breedPhotos={breedPhotos}
              breedNotes={breedNotes}
              visibleBreeds={visibleBreeds}
              animateXp={animateXp}
              videoLevel={levelUpModal}
              onRaccoonVideoEnd={handleLevelUpClose}
              newBreeds={newBreeds}
            />
          )}

          {step === "collection" && !data && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Icon name="Loader2" size={20} className="animate-spin" />
              Загрузка...
            </div>
          )}
        </div>
      </div>

      {/* LevelUpModal — только конфетти + кнопка, видео теперь в карточке енота */}
      {levelUpModal && (
        <LevelUpModal
          newLevel={levelUpModal}
          onClose={handleLevelUpClose}
        />
      )}

      {revealModal && (
        <MagnetRevealModal
          breed={revealModal.breed}
          photoUrl={revealModal.photoUrl}
          stars={revealModal.stars}
          category={revealModal.category}
          onClose={handleRevealClose}
          onMagnetClick={handleMagnetClick}
        />
      )}
    </>
  );
};

export default MyCollection;