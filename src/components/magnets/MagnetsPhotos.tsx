import Icon from "@/components/ui/icon";
import { WOOD_BREEDS } from "@/lib/store";

interface Props {
  photos: Record<string, string>;
  photosLoading: boolean;
  uploadingBreed: string | null;
  deletingBreed: string | null;
  onUploadClick: (breed: string) => void;
  onDeletePhoto: (breed: string) => void;
}

const MagnetsPhotos = ({
  photos,
  photosLoading,
  uploadingBreed,
  deletingBreed,
  onUploadClick,
  onDeletePhoto,
}: Props) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <p className="text-sm text-muted-foreground">
        Загрузите квадратное фото для каждой породы. Оно будет показано только на клиентской странице коллекции.
      </p>
    </div>
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
          return (
            <div key={breed.breed} className="border rounded-lg overflow-hidden bg-white">
              <div className="aspect-square relative bg-slate-100">
                {photoUrl ? (
                  <img src={photoUrl} alt={breed.breed} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Icon name="ImageOff" size={28} />
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
              <div className="p-2">
                <p className="text-xs font-medium truncate">{breed.breed}</p>
                <button
                  className="mt-1.5 w-full text-xs flex items-center justify-center gap-1 py-1 rounded border border-dashed border-slate-300 hover:border-orange-400 hover:text-orange-600 text-slate-400 transition-colors disabled:opacity-50"
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
