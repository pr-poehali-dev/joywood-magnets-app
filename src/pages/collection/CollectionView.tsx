import Icon from "@/components/ui/icon";
import CollectionDashboard from "./CollectionDashboard";
import CollectionBonusProgress from "./CollectionBonusProgress";
import CollectionBreedAtlas from "./CollectionBreedAtlas";
import CollectionRaccoon from "./CollectionRaccoon";
import CollectionRaccoonNotes from "./CollectionRaccoonNotes";
import CollectionRating from "./CollectionRating";
import { CollectionData } from "./types";
import { MagnetType } from "@/lib/store";

interface Props {
  data: CollectionData;
  justRegistered: boolean;
  scanResult: { result: string; breed: string } | null;
  onScanResultClose: () => void;
  onReset: () => void;
  sortedBreeds: MagnetType[];
  collectedBreeds: Set<string>;
  breedPhotos: Record<string, string>;
  breedNotes: Record<string, string>;
  visibleBreeds: MagnetType[];
  animateXp: boolean;
}

const ScanResultBanner = ({
  scanResult,
  onClose,
}: {
  scanResult: { result: string; breed: string };
  onClose: () => void;
}) => {
  const isRevealed = scanResult.result === "revealed";
  const isAlready = scanResult.result === "already_revealed";
  return (
    <div
      className={`rounded-xl border p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-500 ${
        isRevealed
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
          : isAlready
          ? "bg-blue-50 border-blue-200"
          : "bg-orange-50 border-orange-200"
      }`}
    >
      <span className="text-2xl leading-none mt-0.5">
        {isRevealed ? "🎉" : isAlready ? "✅" : "📦"}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className={`font-semibold text-sm ${
            isRevealed ? "text-green-900" : isAlready ? "text-blue-900" : "text-orange-900"
          }`}
        >
          {isRevealed && `Магнит «${scanResult.breed}» раскрыт!`}
          {isAlready && `«${scanResult.breed}» уже в коллекции`}
          {!isRevealed && !isAlready && `Магнит «${scanResult.breed}» не найден`}
        </div>
        <div
          className={`text-sm mt-0.5 leading-relaxed ${
            isRevealed ? "text-green-700" : isAlready ? "text-blue-700" : "text-orange-700"
          }`}
        >
          {isRevealed && "Порода добавлена в вашу коллекцию — смотрите ниже!"}
          {isAlready && "Этот магнит уже был отсканирован ранее."}
          {!isRevealed && !isAlready && "Этот магнит не числится среди отправленных вам."}
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
      >
        <Icon name="X" size={16} />
      </button>
    </div>
  );
};

const CollectionView = ({
  data,
  justRegistered,
  scanResult,
  onScanResultClose,
  onReset,
  sortedBreeds,
  collectedBreeds,
  breedPhotos,
  breedNotes,
  visibleBreeds,
  animateXp,
}: Props) => (
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
      <ScanResultBanner scanResult={scanResult} onClose={onScanResultClose} />
    )}

    <CollectionDashboard data={data} onReset={onReset} />

    <CollectionBreedAtlas
      data={data}
      sortedBreeds={sortedBreeds}
      collectedBreeds={collectedBreeds}
      breedPhotos={breedPhotos}
      totalVisible={visibleBreeds.length}
    />

    {(data.raccoon || data.rating) && (
      <div className="space-y-3" data-raccoon-card>
        {/* Заметки енота — над блоком, только если есть собранные породы с заметками */}
        {data.raccoon && collectedBreeds.size > 0 && Object.keys(breedNotes).length > 0 && (
          <CollectionRaccoonNotes
            collectedBreeds={collectedBreeds}
            breedNotes={breedNotes}
          />
        )}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            {data.raccoon
              ? <CollectionRaccoon raccoon={data.raccoon} animateXp={animateXp} />
              : <div />}
          </div>
          <div>
            {data.rating
              ? <CollectionRating rating={data.rating} totalMagnets={data.total_magnets} />
              : <div />}
          </div>
        </div>
      </div>
    )}

    <CollectionBonusProgress data={data} />
  </div>
);

export default CollectionView;