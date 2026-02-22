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

// Один слот карусели — независимо анимирует фото → ? → фото → ?
const CarouselSlot = ({
  photos,
  delay,
}: {
  photos: string[];
  delay: number;
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!photos.length) return;

    const cycle = () => {
      // Показываем фото
      setVisible(true);
      timerRef.current = setTimeout(() => {
        // Прячем фото
        setVisible(false);
        timerRef.current = setTimeout(() => {
          // Меняем на следующее
          setPhotoIndex((i) => (i + 1) % photos.length);
          cycle();
        }, 800);
      }, 2000);
    };

    const initial = setTimeout(cycle, delay);
    return () => {
      clearTimeout(initial);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [photos, delay]);

  const photo = photos[photoIndex];

  return (
    <div className="rounded-xl border border-dashed border-gray-300 overflow-hidden flex flex-col bg-gray-50">
      <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
        {photo && (
          <img
            src={photo}
            alt="?"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover grayscale"
            style={{
              opacity: visible ? 0.45 : 0,
              transition: "opacity 0.6s ease",
              filter: "grayscale(1) blur(1px)",
            }}
          />
        )}
        <div
          className="absolute inset-0 flex items-center justify-center text-3xl select-none"
          style={{
            opacity: visible ? 0.4 : 1,
            transition: "opacity 0.6s ease",
          }}
        >
          ❓
        </div>
      </div>
      <div className="px-1.5 py-1.5 text-center text-xs bg-gray-50">
        <div className="font-medium leading-tight text-gray-400 blur-[3px] select-none">
          Порода
        </div>
      </div>
    </div>
  );
};

const CollectionBreedAtlas = ({
  data,
  sortedBreeds,
  collectedBreeds,
  breedPhotos,
  totalVisible,
}: Props) => {
  const inTransitCount = data.in_transit?.length ?? 0;
  const emptySlots = data.raccoon?.empty_slots ?? 3;

  // Фото для карусели — только несобранные породы у которых есть фото
  const carouselPhotos = useMemo(() => {
    return WOOD_BREEDS
      .filter((b) => !collectedBreeds.has(b.breed) && breedPhotos[b.breed])
      .map((b) => breedPhotos[b.breed])
      .sort(() => Math.random() - 0.5);
  }, [collectedBreeds, breedPhotos]);

  // Делим фото карусели между слотами равномерно
  const getSlotPhotos = (slotIndex: number) => {
    if (!carouselPhotos.length) return [];
    const chunk = Math.ceil(carouselPhotos.length / emptySlots);
    return carouselPhotos.slice(slotIndex * chunk, (slotIndex + 1) * chunk);
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
          </div>
        )}

        {/* Карусель — что тебя ждёт */}
        {carouselPhotos.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <p className="text-xs text-muted-foreground font-medium px-2">Что тебя ждёт</p>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: Math.min(emptySlots, 8) }).map((_, i) => (
                <CarouselSlot
                  key={i}
                  photos={getSlotPhotos(i)}
                  delay={i * 500}
                />
              ))}
            </div>
            <p className="text-[11px] text-center text-muted-foreground/70 pt-1">
              Каждый новый заказ Joywood открывает редкую породу
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CollectionBreedAtlas;
