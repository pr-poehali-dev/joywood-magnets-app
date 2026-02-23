import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import CollectionDashboard from "./CollectionDashboard";
import CollectionBonusProgress from "./CollectionBonusProgress";
import CollectionBreedAtlas from "./CollectionBreedAtlas";
import CollectionRaccoon from "./CollectionRaccoon";
import CollectionRaccoonNotes from "./CollectionRaccoonNotes";
import { renderTop } from "./CollectionRating";
import { CollectionData, Rating } from "./types";
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

// Блок: заметки + енот слева, рейтинг справа
// Заметки занимают фиксированное пространство над еnotом — измеряется через refs
const RaccoonRatingBlock = ({
  raccoon,
  rating,
  totalMagnets,
  animateXp,
  collectedBreeds,
  breedNotes,
}: {
  raccoon: CollectionData["raccoon"];
  rating: Rating | undefined;
  totalMagnets: number;
  animateXp: boolean;
  collectedBreeds: Set<string>;
  breedNotes: Record<string, string>;
}) => {
  const raccoonRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const [notesHeight, setNotesHeight] = useState(0);

  const hasNotes = collectedBreeds.size > 0 && Object.keys(breedNotes).some(
    (b) => collectedBreeds.has(b)
  );

  // Вычисляем высоту для блока заметок = высота правой колонки - высота енота - gap(12px)
  useEffect(() => {
    if (!hasNotes) return;
    const recalc = () => {
      const rightH = rightColRef.current?.offsetHeight ?? 0;
      const raccoonH = raccoonRef.current?.offsetHeight ?? 0;
      const gap = 12;
      const h = rightH - raccoonH - gap;
      setNotesHeight(h > 60 ? h : 0);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    if (rightColRef.current) ro.observe(rightColRef.current);
    if (raccoonRef.current) ro.observe(raccoonRef.current);
    return () => ro.disconnect();
  }, [hasNotes]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Левая колонка */}
      <div className="flex flex-col gap-3 justify-end">
        {raccoon && hasNotes && notesHeight > 0 && (
          <CollectionRaccoonNotes
            collectedBreeds={collectedBreeds}
            breedNotes={breedNotes}
            height={notesHeight}
          />
        )}
        {raccoon && (
          <div ref={raccoonRef}>
            <CollectionRaccoon raccoon={raccoon} animateXp={animateXp} />
          </div>
        )}
      </div>

      {/* Правая колонка */}
      {rating && (
        <div ref={rightColRef} className="flex flex-col gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              🏅 По магнитам
            </p>
            {renderTop(rating.top_magnets ?? [], rating.rank_magnets, "total_magnets", "", totalMagnets)}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              💎 По стоимости
            </p>
            {renderTop(rating.top_value ?? [], rating.rank_value, "collection_value", "", rating.my_collection_value)}
          </div>
          <p className="text-[10px] text-center text-muted-foreground/60">
            Среди {rating.total_participants} участников
          </p>
        </div>
      )}
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
      <div data-raccoon-card>
        <RaccoonRatingBlock
          raccoon={data.raccoon}
          rating={data.rating}
          totalMagnets={data.total_magnets}
          animateXp={animateXp}
          collectedBreeds={collectedBreeds}
          breedNotes={breedNotes}
        />
      </div>
    )}

    <CollectionBonusProgress data={data} />
  </div>
);

export default CollectionView;