import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { RACCOON_LEVELS } from "@/lib/raccoon";
import LevelUpModal from "@/components/LevelUpModal";

const RACCOON_ASSETS_URL = "https://functions.poehali.dev/81103f27-f9fd-48ca-87c2-027ad46a7df8";
const UPLOAD_VIDEO_URL = "https://functions.poehali.dev/23b79142-e8eb-4386-8362-4029358a7c25";

const compressPhoto = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

interface SettingsRaccoonCardProps {
  raccoonAssets: Record<string, { photo?: string; video?: string }>;
  raccoonLoading: boolean;
  onAssetsChange: (updater: (prev: Record<string, { photo?: string; video?: string }>) => Record<string, { photo?: string; video?: string }>) => void;
}

const SettingsRaccoonCard = ({ raccoonAssets, raccoonLoading, onAssetsChange }: SettingsRaccoonCardProps) => {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ level: number; type: "photo" | "video" } | null>(null);

  const handleRaccoonFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const pending = pendingUpload.current;
    if (!file || !pending) return;
    e.target.value = "";
    const uKey = `${pending.level}-${pending.type}`;
    setUploadingKey(uKey);
    try {
      if (pending.type === "photo") {
        const b64 = await compressPhoto(file);
        const ext = "jpg";
        const res = await fetch(RACCOON_ASSETS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "upload_photo", level: pending.level, data: b64, ext }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Ошибка загрузки");
        onAssetsChange((prev) => ({
          ...prev,
          [String(pending.level)]: { ...prev[String(pending.level)], photo: data.url + "?t=" + Date.now() },
        }));
        toast.success(`Уровень ${pending.level}: фото загружено`);
      } else {
        // Видео — чанки по 700KB через /tmp на бэкенде, затем сборка и PUT в S3
        // base64 увеличивает размер на ~33%, поэтому бинарный чанк = 700KB → JSON ~950KB < 1MB лимита
        const CHUNK = 700 * 1024;
        const totalChunks = Math.ceil(file.size / CHUNK);

        // Грузим чанки последовательно
        for (let i = 0; i < totalChunks; i++) {
          const chunk = file.slice(i * CHUNK, (i + 1) * CHUNK);
          const arrayBuf = await chunk.arrayBuffer();
          // btoa безопасно для бинарных данных через Uint8Array
          const bytes = new Uint8Array(arrayBuf);
          let b64 = "";
          for (let j = 0; j < bytes.length; j += 8192) {
            b64 += String.fromCharCode(...bytes.subarray(j, j + 8192));
          }
          b64 = btoa(b64);
          const chunkRes = await fetch(UPLOAD_VIDEO_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "upload_raccoon_chunk", level: pending.level, chunk_index: i, total_chunks: totalChunks, data: b64 }),
          });
          const chunkData = await chunkRes.json();
          if (!chunkData.ok) throw new Error(`Ошибка загрузки части ${i + 1} из ${totalChunks}`);
        }

        // Финализируем — собираем и кладём в S3
        const finishRes = await fetch(UPLOAD_VIDEO_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "upload_raccoon_finish", level: pending.level, total_chunks: totalChunks }),
        });
        const finishData = await finishRes.json();
        if (!finishData.ok) throw new Error(finishData.error || "Ошибка сохранения видео");

        onAssetsChange((prev) => ({
          ...prev,
          [String(pending.level)]: { ...prev[String(pending.level)], video: finishData.url + "?t=" + Date.now() },
        }));
        toast.success(`Уровень ${pending.level}: видео загружено`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploadingKey(null);
      pendingUpload.current = null;
    }
  }, [onAssetsChange]);

  const triggerUpload = (level: number, type: "photo" | "video") => {
    pendingUpload.current = { level, type };
    if (type === "photo") photoInputRef.current?.click();
    else videoInputRef.current?.click();
  };

  return (
    <>
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handleRaccoonFile} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/*" className="hidden" onChange={handleRaccoonFile} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-lg leading-none">🦝</span>
            Енот-мастер — медиафайлы
          </CardTitle>
          <CardDescription>Фото показывается в профиле клиента. Видео воспроизводится при повышении уровня.</CardDescription>
        </CardHeader>
        <CardContent>
          {raccoonLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Icon name="Loader2" size={18} className="animate-spin" />
              Загрузка...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {RACCOON_LEVELS.map((lvl) => {
                const saved = raccoonAssets[String(lvl.level)] || {};
                const isUploadingPhoto = uploadingKey === `${lvl.level}-photo`;
                const isUploadingVideo = uploadingKey === `${lvl.level}-video`;

                return (
                  <div key={lvl.level} className="border rounded-lg overflow-hidden bg-white">
                    <div className="aspect-square relative bg-slate-100">
                      {saved.photo ? (
                        <img src={saved.photo} alt={`Ур.${lvl.level}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-3xl">🦝</div>
                      )}
                    </div>

                    <div className="p-2 space-y-1.5">
                      <div>
                        <p className="text-xs font-semibold truncate">Ур.{lvl.level} {lvl.name}</p>
                        <p className="text-[10px] text-muted-foreground">от {lvl.xpMin} XP</p>
                      </div>

                      <button
                        className="w-full text-xs flex items-center justify-center gap-1 py-1 rounded border border-dashed border-slate-300 hover:border-orange-400 hover:text-orange-600 text-slate-400 transition-colors disabled:opacity-50"
                        disabled={isUploadingPhoto}
                        onClick={() => triggerUpload(lvl.level, "photo")}
                      >
                        {isUploadingPhoto
                          ? <><Icon name="Loader2" size={12} className="animate-spin" />Загрузка...</>
                          : <><Icon name="Image" size={12} />{saved.photo ? "Фото" : "+ Фото"}</>}
                      </button>

                      <button
                        className={`w-full text-xs flex items-center justify-center gap-1 py-1 rounded border border-dashed transition-colors disabled:opacity-50 ${
                          saved.video
                            ? "border-green-300 text-green-600 hover:border-orange-400 hover:text-orange-600"
                            : "border-slate-300 text-slate-400 hover:border-orange-400 hover:text-orange-600"
                        }`}
                        disabled={isUploadingVideo}
                        onClick={() => triggerUpload(lvl.level, "video")}
                      >
                        {isUploadingVideo
                          ? <><Icon name="Loader2" size={12} className="animate-spin" />Загрузка...</>
                          : saved.video
                          ? <><Icon name="Video" size={12} />Видео ✓</>
                          : <><Icon name="Video" size={12} />+ Видео</>}
                      </button>

                      <button
                        className="w-full text-xs flex items-center justify-center gap-1 py-1 rounded border border-dashed border-amber-300 text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-colors"
                        onClick={() => setPreviewLevel(lvl.level)}
                      >
                        <Icon name="Play" size={12} />
                        Превью
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {previewLevel !== null && (
        <LevelUpModal newLevel={previewLevel} onClose={() => setPreviewLevel(null)} />
      )}
    </>
  );
};

export default SettingsRaccoonCard;
