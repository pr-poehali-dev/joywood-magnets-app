import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { STAR_LABELS, WOOD_BREEDS } from "@/lib/store";
import { CollectionData } from "./types";

const TOTAL_BREEDS = WOOD_BREEDS.length;

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sortedBreeds.map((breed) => {
            const collected = collectedBreeds.has(breed.breed);
            const magnet = collected ? data.magnets.find((m) => m.breed === breed.breed) : null;
            const photoUrl = breedPhotos[breed.breed];
            return (
              <div
                key={breed.breed}
                className={`rounded-lg border text-center text-xs transition-all overflow-hidden ${
                  collected
                    ? "bg-green-50 border-green-300 text-green-800"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                {photoUrl ? (
                  <div className="relative aspect-square w-full">
                    <img
                      src={photoUrl}
                      alt={breed.breed}
                      className={`w-full h-full object-cover ${!collected ? "grayscale opacity-40" : ""}`}
                    />
                    {!collected && (
                      <div className="absolute inset-0 flex items-center justify-center text-2xl">❓</div>
                    )}
                    {collected && (
                      <div className="absolute top-1 right-1 text-sm leading-none">{STAR_LABELS[breed.stars]}</div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 pt-2">
                    <div className="text-lg mb-0.5">
                      {collected ? STAR_LABELS[breed.stars] : "❓"}
                    </div>
                  </div>
                )}
                <div className="px-1.5 py-1.5">
                  <div className={`font-medium ${collected ? "" : "opacity-50"}`}>
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
