import Icon from "@/components/ui/icon";
import CollectionDashboard from "./CollectionDashboard";
import CollectionBonusProgress from "./CollectionBonusProgress";
import CollectionBreedAtlas from "./CollectionBreedAtlas";
import CollectionRaccoon from "./CollectionRaccoon";
import CollectionRaccoonNotes from "./CollectionRaccoonNotes";
import CollectionRating, { renderTop } from "./CollectionRating";
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
      <div data-raccoon-card>
        {/* Строка: енот + рейтинг */}
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {/* Левая колонка: заметки flex-1 + енот снизу */}
          <div className="flex flex-col gap-3 h-full">
            {data.raccoon && collectedBreeds.size > 0 && Object.keys(breedNotes).length > 0 && (
              <CollectionRaccoonNotes
                collectedBreeds={collectedBreeds}
                breedNotes={breedNotes}
                className="flex-1 min-h-0"
              />
            )}
            {data.raccoon && (
              <div className="mt-auto">
                <CollectionRaccoon raccoon={data.raccoon} animateXp={animateXp} />
              </div>
            )}
          </div>

          {/* Правая колонка: два рейтинга */}
          {data.rating && (() => {
            const { rank_magnets, rank_value, total_participants, my_collection_value, top_magnets = [], top_value = [] } = data.rating;
            return (
              <div className="flex flex-col gap-3 h-full">
                {/* Рейтинг по магнитам */}
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    🏅 По магнитам
                  </p>
                  {renderTop(top_magnets, rank_magnets, "total_magnets", "", data.total_magnets)}
                </div>
                {/* Рейтинг по стоимости */}
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    💎 По стоимости
                  </p>
                  {renderTop(top_value, rank_value, "collection_value", "", my_collection_value)}
                </div>
                <p className="text-[10px] text-center text-muted-foreground/60">
                  Среди {total_participants} участников
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    )}

    <CollectionBonusProgress data={data} />
  </div>
);

export default CollectionView;