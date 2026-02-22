import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { WOOD_BREEDS } from "@/lib/store";

interface InventoryItem {
  stars: number;
  category: string;
  stock: number;
  active: boolean;
}

interface Props {
  photos: Record<string, string>;
  photosLoading: boolean;
  uploadingBreed: string | null;
  deletingBreed: string | null;
  togglingBreed: string | null;
  inventory: Record<string, InventoryItem>;
  onUploadClick: (breed: string) => void;
  onDeletePhoto: (breed: string) => void;
  onToggleActive: (breed: string, active: boolean) => void;
}

const MagnetsPhotos = ({
  photos,
  photosLoading,
  uploadingBreed,
  deletingBreed,
  togglingBreed,
  inventory,
  onUploadClick,
  onDeletePhoto,
  onToggleActive,
}: Props) => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Загрузите квадратное фото для каждой породы. Переключатель участия управляет видимостью магнита в акции — выключенные породы не выдаются и не видны клиентам (кроме уже полученных).
    </p>
    {photosLoading ? (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Icon name="Loader2" size={18} className="animate-spin" />
        Загрузка...
      </div>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {WOOD_BREEDS.map((breed) => {
          const photoUrl = photos[breed.breed];
          const isUploading = uploadingBreed === breed.breed;
          const isDeleting = deletingBreed === breed.breed;
          const isToggling = togglingBreed === breed.breed;
          const inv = inventory[breed.breed];
          const isActive = inv ? inv.active : true;

          return (
            <div
              key={breed.breed}
              className={`border rounded-lg overflow-hidden bg-white transition-opacity ${!isActive ? "opacity-50" : ""}`}
            >
              <div className="aspect-square relative bg-slate-100">
                {photoUrl ? (
                  <img src={photoUrl} alt={breed.breed} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Icon name="ImageOff" size={28} />
                  </div>
                )}
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100/60">
                    <span className="text-[10px] font-semibold text-slate-500 bg-white/80 rounded px-1.5 py-0.5">Архив</span>
                  </div>
                )}
                {photoUrl && (
                  <button
                    className="absolute top-1 right-1 bg-white/90 rounded-full p-1 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
                    onClick={() => onDeletePhoto(breed.breed)}
                    disabled={isDeleting}
                  >
                    {isDeleting
                      ? <Icon name="Loader2" size={13} className="animate-spin" />
                      : <Icon name="X" size={13} />}
                  </button>
                )}
              </div>
              <div className="p-2 space-y-1.5">
                <p className="text-xs font-medium truncate">{breed.breed}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Участвует</span>
                  {isToggling ? (
                    <Icon name="Loader2" size={12} className="animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => onToggleActive(breed.breed, checked)}
                      className="scale-75 origin-right"
                    />
                  )}
                </div>
                <button
                  className="w-full text-xs flex items-center justify-center gap-1 py-1 rounded border border-dashed border-slate-300 hover:border-orange-400 hover:text-orange-600 text-slate-400 transition-colors disabled:opacity-50"
                  disabled={isUploading}
                  onClick={() => onUploadClick(breed.breed)}
                >
                  {isUploading
                    ? <><Icon name="Loader2" size={12} className="animate-spin" />Загрузка...</>
                    : <><Icon name="Upload" size={12} />{photoUrl ? "Заменить" : "Загрузить"}</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default MagnetsPhotos;
