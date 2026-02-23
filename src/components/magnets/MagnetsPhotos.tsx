import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { WOOD_BREEDS } from "@/lib/store";
import { toast } from "sonner";

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
  notes: Record<string, string>;
  savingNoteBreed: string | null;
  onUploadClick: (breed: string) => void;
  onDeletePhoto: (breed: string) => void;
  onToggleActive: (breed: string, active: boolean) => void;
  onSaveNote: (breed: string, text: string) => void;
}

const STAR_GROUP_LABELS: Record<number, string> = {
  1: "⭐ Обычные",
  2: "⭐⭐ Особенные",
  3: "⭐⭐⭐ Элитные",
};

const getScanUrl = (breed: string) =>
  `${window.location.origin}/my-collection?scan=${encodeURIComponent(breed)}`;

const MagnetsPhotos = ({
  photos,
  photosLoading,
  uploadingBreed,
  deletingBreed,
  togglingBreed,
  inventory,
  notes,
  savingNoteBreed,
  onUploadClick,
  onDeletePhoto,
  onToggleActive,
  onSaveNote,
}: Props) => {
  const [copiedBreed, setCopiedBreed] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Record<string, string>>({});

  const handleCopy = (breed: string) => {
    const url = getScanUrl(breed);
    const tryFallback = () => {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      if (ok) {
        setCopiedBreed(breed);
        toast.success("Ссылка скопирована");
        setTimeout(() => setCopiedBreed(null), 2000);
      } else {
        toast.error("Не удалось скопировать — выделите ссылку вручную");
      }
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedBreed(breed);
        toast.success("Ссылка скопирована");
        setTimeout(() => setCopiedBreed(null), 2000);
      }).catch(tryFallback);
    } else {
      tryFallback();
    }
  };

  const getNoteValue = (breed: string) =>
    editingNote[breed] !== undefined ? editingNote[breed] : (notes[breed] ?? "");

  const handleNoteChange = (breed: string, val: string) => {
    setEditingNote((prev) => ({ ...prev, [breed]: val }));
  };

  const handleNoteSave = (breed: string) => {
    const text = getNoteValue(breed);
    onSaveNote(breed, text);
    setEditingNote((prev) => { const n = { ...prev }; delete n[breed]; return n; });
  };

  const grouped = [1, 2, 3].map((stars) => ({
    stars,
    breeds: WOOD_BREEDS
      .filter((b) => b.stars === stars)
      .sort((a, b) => a.breed.localeCompare(b.breed, "ru")),
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Загрузите квадратное фото для каждой породы. В поле «Заметки» можно добавить текст — каждый абзац будет показан еноту клиента как отдельная заметка о породе. Переключатель участия управляет видимостью магнита. QR-ссылка печатается на магните.
      </p>
      {photosLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Icon name="Loader2" size={18} className="animate-spin" />
          Загрузка...
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ stars, breeds }) => (
            <div key={stars}>
              <h3 className="text-sm font-semibold text-foreground mb-3">{STAR_GROUP_LABELS[stars]}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {breeds.map((breed) => {
                  const photoUrl = photos[breed.breed];
                  const isUploading = uploadingBreed === breed.breed;
                  const isDeleting = deletingBreed === breed.breed;
                  const isToggling = togglingBreed === breed.breed;
                  const isSavingNote = savingNoteBreed === breed.breed;
                  const inv = inventory[breed.breed];
                  const isActive = inv ? inv.active : true;
                  const isCopied = copiedBreed === breed.breed;
                  const scanUrl = getScanUrl(breed.breed);
                  const noteVal = getNoteValue(breed.breed);
                  const noteDirty = editingNote[breed.breed] !== undefined && editingNote[breed.breed] !== (notes[breed.breed] ?? "");

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

                        <div className="flex items-center gap-1 bg-slate-50 rounded border border-slate-200 px-1.5 py-1">
                          <Icon name="QrCode" size={11} className="text-slate-400 shrink-0" />
                          <span className="text-[10px] text-slate-500 truncate flex-1 min-w-0" title={scanUrl}>
                            {scanUrl}
                          </span>
                          <button
                            onClick={() => handleCopy(breed.breed)}
                            className="shrink-0 text-slate-400 hover:text-orange-500 transition-colors"
                            title="Скопировать ссылку"
                          >
                            <Icon name={isCopied ? "Check" : "Copy"} size={11} />
                          </button>
                        </div>

                        {/* Заметки енота */}
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Icon name="NotebookPen" size={10} />
                            Заметки енота (каждый абзац — отдельная)
                          </label>
                          <textarea
                            className="w-full text-[11px] border border-slate-200 rounded px-1.5 py-1 resize-none focus:outline-none focus:border-orange-300 bg-orange-50/30 leading-relaxed"
                            rows={3}
                            placeholder={"Первая заметка\n\nВторая заметка"}
                            value={noteVal}
                            onChange={(e) => handleNoteChange(breed.breed, e.target.value)}
                          />
                          {noteDirty && (
                            <button
                              className="w-full text-[11px] flex items-center justify-center gap-1 py-1 rounded bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
                              disabled={isSavingNote}
                              onClick={() => handleNoteSave(breed.breed)}
                            >
                              {isSavingNote
                                ? <><Icon name="Loader2" size={11} className="animate-spin" />Сохранение...</>
                                : <><Icon name="Check" size={11} />Сохранить</>}
                            </button>
                          )}
                          {!noteDirty && notes[breed.breed] && (
                            <p className="text-[10px] text-green-600 flex items-center gap-0.5">
                              <Icon name="CheckCircle" size={10} />
                              {notes[breed.breed].split(/\n\s*\n/).filter(Boolean).length} заметок сохранено
                            </p>
                          )}
                        </div>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MagnetsPhotos;
