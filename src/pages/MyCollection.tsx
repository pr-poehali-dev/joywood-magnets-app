import CollectionPhoneStep from "./collection/CollectionPhoneStep";
import CollectionHeader from "./collection/CollectionHeader";
import CollectionView from "./collection/CollectionView";
import MagnetRevealModal from "@/components/MagnetRevealModal";
import LevelUpModal from "@/components/LevelUpModal";
import Icon from "@/components/ui/icon";
import { useCollectionData } from "./collection/useCollectionData";

const MyCollection = () => {
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
              playRaccoonVideo={!!levelUpModal}
              onRaccoonVideoEnd={handleLevelUpClose}
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
