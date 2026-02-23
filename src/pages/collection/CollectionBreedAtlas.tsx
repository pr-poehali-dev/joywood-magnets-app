import { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { STAR_LABELS, WOOD_BREEDS } from "@/lib/store";
import { CollectionData } from "./types";

const STAR_BG: Record<number, string> = {
  1: "bg-amber-50",
  2: "bg-orange-50",
  3: "bg-red-50",
};

interface Props {
  data: CollectionData;
  sortedBreeds: typeof WOOD_BREEDS;
  collectedBreeds: Set<string>;
  breedPhotos: Record<string, string>;
  totalVisible?: number;
}

// Слот волновой карусели: показывает цветное фото с blur, меняет по сигналу onDone
const WaveSlot = ({
  photos,
  playing,
  onDone,
}: {
  photos: string[];
  playing: boolean;
  onDone: () => void;
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!playing || !photos.length) return;
    // fade-in
    setVisible(true);
    const t1 = setTimeout(() => {
      // fade-out
      setVisible(false);
      const t2 = setTimeout(() => {
        setPhotoIndex((i) => (i + 1) % photos.length);
        doneRef.current();
      }, 600);
      return () => clearTimeout(t2);
    }, 1800);
    return () => clearTimeout(t1);
  }, [playing, photos]);

  const photo = photos[photoIndex];

  return (
    <div className="rounded-xl border border-dashed border-amber-200 overflow-hidden flex flex-col bg-amber-50/30">
      <div className="relative aspect-square w-full bg-amber-50 overflow-hidden">
        {photo && (
          <img
            src={photo}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            style={{
              opacity: visible ? 1 : 0,
              filter: "blur(2px)",
              transition: "opacity 0.6s ease",
            }}
          />
        )}
        {!visible && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-amber-300" />
          </div>
        )}
      </div>
    </div>
  );
};

const WAVE_SLOTS = 3;
// Пауза между завершением одного слота и стартом следующего (мс)
const WAVE_GAP = 600;
// Пауза после последнего слота перед повтором волны (мс)
const WAVE_PAUSE = 1200;

const CollectionBreedAtlas = ({
  data,
  sortedBreeds,
  collectedBreeds,
  breedPhotos,
  totalVisible,
}: Props) => {
  const inTransitCount = data.in_transit?.length ?? 0;
  const emptySlots = data.raccoon?.empty_slots ?? 3;

  // Разовое перемешивание — фиксируем порядок при первом рендере
  // и не меняем при обновлениях collectedBreeds/breedPhotos
  const shuffledOrderRef = useRef<string[] | null>(null);
  const carouselPhotos = useMemo(() => {
    const photos = WOOD_BREEDS
      .filter((b) => !collectedBreeds.has(b.breed) && breedPhotos[b.breed])
      .map((b) => b.breed);
    if (!shuffledOrderRef.current) {
      shuffledOrderRef.current = [...photos].sort(() => Math.random() - 0.5);
    }
    // Применяем зафиксированный порядок, фильтруя актуальные породы
    const photoSet = new Set(photos);
    return shuffledOrderRef.current
      .filter((breed) => photoSet.has(breed))
      .map((breed) => breedPhotos[breed]);
  }, [collectedBreeds, breedPhotos]);

  // Делим фото между 3 слотами равномерно
  const slotPhotos = useMemo(() => {
    if (!carouselPhotos.length) return [[], [], []] as string[][];
    const chunk = Math.ceil(carouselPhotos.length / WAVE_SLOTS);
    return Array.from({ length: WAVE_SLOTS }, (_, i) =>
      carouselPhotos.slice(i * chunk, (i + 1) * chunk)
    );
  }, [carouselPhotos]);

  // activeSlot: -1 = ничего, 0/1/2 = играет соответствующий слот
  const [activeSlot, setActiveSlot] = useState(-1);
  const waveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Запускаем волну как только есть фото
  useEffect(() => {
    if (!carouselPhotos.length) return;
    waveTimer.current = setTimeout(() => setActiveSlot(0), 800);
    return () => { if (waveTimer.current) clearTimeout(waveTimer.current); };
  }, [carouselPhotos.length]);

  const handleSlotDone = (slotIndex: number) => {
    setActiveSlot(-1);
    const next = slotIndex + 1;
    if (next < WAVE_SLOTS) {
      waveTimer.current = setTimeout(() => setActiveSlot(next), WAVE_GAP);
    } else {
      // Пауза и новая волна
      waveTimer.current = setTimeout(() => setActiveSlot(0), WAVE_PAUSE);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon name="Map" size={18} className="text-orange-500" />
          Моя коллекция — {data.unique_breeds} пород
          {inTransitCount > 0 && (
            <span className="ml-auto text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {inTransitCount} в пути
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Магниты в пути */}
        {inTransitCount > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Отправлены вам</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(data.in_transit ?? []).map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-amber-300 overflow-hidden flex flex-col shadow-sm"
                >
                  <div className="relative aspect-square w-full bg-amber-50 flex items-center justify-center">
                    <div className="text-3xl animate-pulse">📦</div>
                  </div>
                  <div className="px-1.5 py-1.5 text-center text-xs bg-amber-50">
                    <div className="font-medium leading-tight text-amber-800">Отправлен</div>
                    <div className="text-[10px] text-amber-600 mt-0.5">
                      Отсканируй QR после получения
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Собранные породы */}
        {collectedBreeds.size > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {sortedBreeds.filter((b) => collectedBreeds.has(b.breed)).map((breed) => {
              const magnet = data.magnets.find((m) => m.breed === breed.breed);
              const photoUrl = breedPhotos[breed.breed];
              return (
                <div
                  key={breed.breed}
                  data-breed={breed.breed}
                  className="rounded-xl border border-green-300 overflow-hidden flex flex-col shadow-sm transition-all"
                >
                  <div className={`relative aspect-square w-full ${STAR_BG[breed.stars] ?? "bg-amber-50"}`}>
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={breed.breed}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl">
                        {STAR_LABELS[breed.stars]}
                      </div>
                    )}
                    <div className="absolute top-1 right-1 text-xs leading-none bg-white/80 rounded-full px-1 py-0.5">
                      {STAR_LABELS[breed.stars]}
                    </div>
                  </div>
                  <div className="px-1.5 py-1.5 text-center text-xs bg-white">
                    <div className="font-medium leading-tight text-gray-800">{breed.breed}</div>
                    {magnet && (
                      <div className="text-[10px] text-green-600 mt-0.5">
                        {new Date(magnet.given_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Пустые слоты под следующие магниты */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex flex-col"
              >
                <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center">
                  <Icon name="Plus" size={20} className="text-gray-300" />
                </div>
                <div className="px-1.5 py-1.5 text-center text-xs bg-gray-50">
                  <div className="font-medium leading-tight text-gray-300">Ждёт магнит</div>
                </div>
              </div>
            ))}

            {/* Заблокированный слот — открывается с уровнем */}
            {!data.raccoon?.is_max_level && (
              <div className="rounded-xl overflow-hidden flex flex-col bg-gray-100 border border-gray-200">
                <div className="relative aspect-square w-full bg-gray-100 flex items-center justify-center">
                  <Icon name="Lock" size={22} className="text-gray-300" />
                </div>
                <div className="px-1.5 py-1.5 text-center text-[9px] bg-gray-100 leading-tight text-gray-400">
                  Больше мест со следующим уровнем
                </div>
              </div>
            )}
          </div>
        )}

        {/* Пустое состояние — только слоты */}
        {collectedBreeds.size === 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex flex-col"
              >
                <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center">
                  <Icon name="Plus" size={20} className="text-gray-300" />
                </div>
                <div className="px-1.5 py-1.5 text-center text-xs bg-gray-50">
                  <div className="font-medium leading-tight text-gray-300">Ждёт магнит</div>
                </div>
              </div>
            ))}

            {/* Заблокированный слот */}
            {!data.raccoon?.is_max_level && (
              <div className="rounded-xl overflow-hidden flex flex-col bg-gray-100 border border-gray-200">
                <div className="relative aspect-square w-full bg-gray-100 flex items-center justify-center">
                  <Icon name="Lock" size={22} className="text-gray-300" />
                </div>
                <div className="px-1.5 py-1.5 text-center text-[9px] bg-gray-100 leading-tight text-gray-400">
                  Больше мест со следующим уровнем
                </div>
              </div>
            )}
          </div>
        )}

        {/* Карусель — что тебя ждёт в следующий раз */}
        {carouselPhotos.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <p className="text-xs text-muted-foreground font-medium px-2">Что тебя ждёт в следующий раз?</p>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: WAVE_SLOTS }).map((_, i) => (
                <WaveSlot
                  key={i}
                  photos={slotPhotos[i] ?? []}
                  playing={activeSlot === i}
                  onDone={() => handleSlotDone(i)}
                />
              ))}
            </div>
            <p className="text-[11px] text-center text-muted-foreground/70 pt-1">
              Каждый{" "}
              <a
                href="https://joywood.store/shop"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[11px] font-semibold rounded-full px-2.5 py-0.5 leading-tight transition-all"
              >
                новый заказ
              </a>
              {" "}открывает следующую породу
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CollectionBreedAtlas;