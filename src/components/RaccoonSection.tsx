import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { RACCOON_LEVELS } from "@/lib/raccoon";
import { toast } from "sonner";

const RACCOON_ASSETS_URL = "https://functions.poehali.dev/81103f27-f9fd-48ca-87c2-027ad46a7df8";

interface LevelAssets {
  photo?: string;
  video?: string;
}

type AssetsIndex = Record<string, LevelAssets>;

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const UploadButton = ({
  label,
  accept,
  loading,
  onFile,
}: {
  label: string;
  accept: string;
  loading: boolean;
  onFile: (file: File) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="gap-1.5"
      >
        {loading ? (
          <Icon name="Loader2" size={14} className="animate-spin" />
        ) : (
          <Icon name="Upload" size={14} />
        )}
        {label}
      </Button>
    </>
  );
};

const RaccoonSection = () => {
  const [assets, setAssets] = useState<AssetsIndex>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [loadingIndex, setLoadingIndex] = useState(true);

  useEffect(() => {
    fetch(RACCOON_ASSETS_URL)
      .then((r) => r.json())
      .then((data) => setAssets(data))
      .catch(() => toast.error("Не удалось загрузить индекс активов"))
      .finally(() => setLoadingIndex(false));
  }, []);

  const upload = async (level: number, type: "photo" | "video", file: File) => {
    const key = `${level}-${type}`;
    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const b64 = await toBase64(file);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const res = await fetch(RACCOON_ASSETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, type, data: b64, ext }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Ошибка загрузки");
      setAssets((prev) => ({
        ...prev,
        [String(level)]: { ...prev[String(level)], [type]: data.url },
      }));
      toast.success(`Уровень ${level}: ${type === "photo" ? "фото" : "видео"} загружено`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Енот-мастер — медиафайлы</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Загрузите фото и видео для каждого уровня Енота. Фото показывается в профиле клиента, видео воспроизводится при повышении уровня.
        </p>
      </div>

      {loadingIndex ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Icon name="Loader2" size={18} className="animate-spin" />
          Загрузка...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RACCOON_LEVELS.map((lvl) => {
            const saved = assets[String(lvl.level)] || {};
            return (
              <Card key={lvl.level} className="overflow-hidden">
                <CardHeader className="pb-2 bg-amber-50 border-b border-amber-100">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {lvl.level}
                    </span>
                    {lvl.name}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    от {lvl.xpMin} XP · {lvl.emptySlots} пустых слотов
                  </p>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Фото */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Фото Енота</p>
                    <div className="w-full aspect-square rounded-xl border border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                      {saved.photo ? (
                        <img
                          src={saved.photo}
                          alt={`Енот ур.${lvl.level}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl opacity-30">🦝</span>
                      )}
                    </div>
                    <UploadButton
                      label={saved.photo ? "Заменить фото" : "Загрузить фото"}
                      accept="image/*"
                      loading={!!uploading[`${lvl.level}-photo`]}
                      onFile={(f) => upload(lvl.level, "photo", f)}
                    />
                  </div>

                  {/* Видео */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Видео повышения уровня</p>
                    <div className="w-full rounded-xl border border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center" style={{ minHeight: 80 }}>
                      {saved.video ? (
                        <video
                          src={saved.video}
                          controls
                          className="w-full max-h-40 object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 py-4 text-muted-foreground/50">
                          <Icon name="Video" size={24} />
                          <span className="text-xs">Видео не загружено</span>
                        </div>
                      )}
                    </div>
                    <UploadButton
                      label={saved.video ? "Заменить видео" : "Загрузить видео"}
                      accept="video/mp4,video/*"
                      loading={!!uploading[`${lvl.level}-video`]}
                      onFile={(f) => upload(lvl.level, "video", f)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RaccoonSection;
