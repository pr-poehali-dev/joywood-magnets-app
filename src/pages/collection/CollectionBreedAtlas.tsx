import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { STAR_LABELS, WOOD_BREEDS } from "@/lib/store";
import { CollectionData } from "./types";

const TOTAL_BREEDS = WOOD_BREEDS.length;

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
}

const CollectionBreedAtlas = ({ data, sortedBreeds, collectedBreeds, breedPhotos }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon name="Map" size={18} className="text-orange-500" />
          Атлас пород — {data.unique_breeds}/{TOTAL_BREEDS}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sortedBreeds.map((breed) => {
            const collected = collectedBreeds.has(breed.breed);
            const magnet = collected ? data.magnets.find((m) => m.breed === breed.breed) : null;
            const photoUrl = breedPhotos[breed.breed];

            return (
              <div
                key={breed.breed}
                className={`rounded-xl border overflow-hidden flex flex-col transition-all ${
                  collected
                    ? "border-green-300 shadow-sm"
                    : "border-gray-200 opacity-60"
                }`}
              >
                <div className={`relative aspect-square w-full ${collected ? (STAR_BG[breed.stars] ?? "bg-amber-50") : "bg-gray-100"}`}>
                  {photoUrl ? (
                    <>
                      <img
                        src={photoUrl}
                        alt={breed.breed}
                        className={`w-full h-full object-cover ${!collected ? "grayscale opacity-50" : ""}`}
                      />
                      {!collected && (
                        <div className="absolute inset-0 flex items-center justify-center text-3xl">❓</div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">
                      {collected ? STAR_LABELS[breed.stars] : "❓"}
                    </div>
                  )}
                  {collected && (
                    <div className="absolute top-1 right-1 text-xs leading-none bg-white/80 rounded-full px-1 py-0.5">
                      {STAR_LABELS[breed.stars]}
                    </div>
                  )}
                </div>

                <div className={`px-1.5 py-1.5 text-center text-xs ${collected ? "bg-white" : "bg-gray-50"}`}>
                  <div className={`font-medium leading-tight ${collected ? "text-gray-800" : "text-gray-400"}`}>
                    {breed.breed}
                  </div>
                  {magnet && (
                    <div className="text-[10px] text-green-600 mt-0.5">
                      {new Date(magnet.given_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionBreedAtlas;
