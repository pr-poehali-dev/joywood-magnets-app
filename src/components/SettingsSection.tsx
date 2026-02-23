import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { toast as sonerToast } from "sonner";
import Icon from "@/components/ui/icon";
import { RACCOON_LEVELS } from "@/lib/raccoon";
import LevelUpModal from "@/components/LevelUpModal";

const SETTINGS_URL = "https://functions.poehali.dev/8d9bf70e-b9a7-466a-a2e0-7e510754dde1";
const UPLOAD_POLICY_URL = "https://functions.poehali.dev/a3dfac54-994c-4651-8b8f-e2191da2f608";
const GET_CONSENTS_URL = "https://functions.poehali.dev/4abcb4ec-79d8-4bfa-8e66-1285f23e5eac";
const RACCOON_ASSETS_URL = "https://functions.poehali.dev/81103f27-f9fd-48ca-87c2-027ad46a7df8";
const UPLOAD_VIDEO_URL = "https://functions.poehali.dev/23b79142-e8eb-4386-8362-4029358a7c25";

interface ConsentItem {
  id: number; phone: string; name: string; policy_version: string; ip: string; created_at: string;
}

interface SettingRowProps {
  label: string;
  description: string;
  descriptionOff?: string;
  checked: boolean;
  loading: boolean;
  fetching: boolean;
  onToggle: (v: boolean) => void;
}

const SettingRow = ({ label, description, descriptionOff, checked, loading, fetching, onToggle }: SettingRowProps) => (
  <div className="flex items-center justify-between py-3 border-b last:border-0">
    <div className="space-y-0.5">
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-muted-foreground">
        {checked ? description : (descriptionOff ?? description)}
      </div>
    </div>
    <div className="flex items-center gap-2 ml-4">
      {fetching ? (
        <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />
      ) : (
        <>
          <span className={`text-xs font-medium ${checked ? "text-green-600" : "text-slate-400"}`}>
            {checked ? "Включено" : "Выключено"}
          </span>
          <Switch checked={checked} onCheckedChange={onToggle} disabled={loading} />
        </>
      )}
    </div>
  </div>
);

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Сжимает фото до max 1200px по длинной стороне, сохраняя пропорции
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

const SettingsSection = () => {
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [policyUrl, setPolicyUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Енот
  const [raccoonAssets, setRaccoonAssets] = useState<Record<string, { photo?: string; video?: string }>>({});
  const [raccoonLoading, setRaccoonLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ level: number; type: "photo" | "video" } | null>(null);

  useEffect(() => {
    fetch(SETTINGS_URL)
      .then((r) => r.json())
      .then((data) => {
        setVerificationEnabled(data.phone_verification_enabled !== "false");
        setShowRegister(data.show_register_page === "true");
        setPolicyUrl(data.privacy_policy_url || "");
      })
      .catch(() => {})
      .finally(() => setFetching(false));

    fetch(RACCOON_ASSETS_URL)
      .then((r) => r.json())
      .then((data) => setRaccoonAssets(data))
      .catch(() => {})
      .finally(() => setRaccoonLoading(false));
  }, []);

  const loadConsents = () => {
    setConsentsLoading(true);
    fetch(GET_CONSENTS_URL)
      .then((r) => r.json())
      .then((d) => setConsents(d.consents || []))
      .catch(() => {})
      .finally(() => setConsentsLoading(false));
  };

  useEffect(() => { if (policyUrl) loadConsents(); }, [policyUrl]);

  const saveSetting = async (key: string, value: boolean, onSuccess: (v: boolean) => void, labels: [string, string]) => {
    setLoadingKey(key);
    try {
      const res = await fetch(SETTINGS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: String(value) }),
      });
      if (res.ok) {
        onSuccess(value);
        toast({ title: value ? labels[0] : labels[1] });
      } else {
        toast({ title: "Ошибка", description: "Не удалось сохранить настройку", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет соединения", variant: "destructive" });
    } finally {
      setLoadingKey(null);
    }
  };

  const handleUploadPolicy = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const res = await fetch(UPLOAD_POLICY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, filename: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      setPolicyUrl(data.url);
      toast({ title: "Политика конфиденциальности загружена" });
    } catch (err) {
      toast({ title: "Ошибка", description: err instanceof Error ? err.message : "Не удалось загрузить файл", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRaccoonFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const pending = pendingUpload.current;
    if (!file || !pending) return;
    e.target.value = "";
    const uKey = `${pending.level}-${pending.type}`;
    setUploadingKey(uKey);
    try {
      if (pending.type === "photo") {
        // Фото — сжимаем без обрезки, грузим через base64
        const b64 = await compressPhoto(file);
        const ext = "jpg";
        const res = await fetch(RACCOON_ASSETS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "upload_photo", level: pending.level, data: b64, ext }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Ошибка загрузки");
        setRaccoonAssets((prev) => ({
          ...prev,
          [String(pending.level)]: { ...prev[String(pending.level)], photo: data.url + "?t=" + Date.now() },
        }));
        sonerToast.success(`Уровень ${pending.level}: фото загружено`);
      } else {
        // Видео — чанки по 3MB через /tmp на бэкенде, затем сборка и PUT в S3
        const CHUNK = 3 * 1024 * 1024;
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

        setRaccoonAssets((prev) => ({
          ...prev,
          [String(pending.level)]: { ...prev[String(pending.level)], video: finishData.url + "?t=" + Date.now() },
        }));
        sonerToast.success(`Уровень ${pending.level}: видео загружено`);
      }
    } catch (err) {
      sonerToast.error(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploadingKey(null);
      pendingUpload.current = null;
    }
  }, []);

  const triggerUpload = (level: number, type: "photo" | "video") => {
    pendingUpload.current = { level, type };
    if (type === "photo") photoInputRef.current?.click();
    else videoInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="ShieldCheck" size={18} className="text-orange-500" />
              Безопасность и доступ
            </CardTitle>
            <CardDescription>Управление входом и регистрацией клиентов</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="SMS-верификация телефона"
              description="Клиент подтверждает номер через SMS-код перед просмотром коллекции"
              descriptionOff="Клиент вводит телефон и сразу видит коллекцию без SMS"
              checked={verificationEnabled}
              loading={loadingKey === "phone_verification_enabled"}
              fetching={fetching}
              onToggle={(v) => saveSetting(
                "phone_verification_enabled", v,
                setVerificationEnabled,
                ["Верификация включена", "Верификация выключена"]
              )}
            />
            <SettingRow
              label="Страница самостоятельной регистрации"
              description="На странице входа видна ссылка на регистрацию (/register)"
              descriptionOff="Ссылка на регистрацию скрыта. Клиенты с Ozon регистрируются через форму на странице входа"
              checked={showRegister}
              loading={loadingKey === "show_register_page"}
              fetching={fetching}
              onToggle={(v) => saveSetting(
                "show_register_page", v,
                setShowRegister,
                ["Страница регистрации включена", "Страница регистрации скрыта"]
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="FileText" size={18} className="text-orange-500" />
              Политика конфиденциальности
            </CardTitle>
            <CardDescription>Документ, который клиент подтверждает при входе в коллекцию</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {policyUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <Icon name="FileCheck" size={18} className="text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">Документ загружен</p>
                  <a href={policyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline truncate block">
                    Открыть PDF
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Icon name="AlertCircle" size={18} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">Документ ещё не загружен. Клиенты не видят чекбокс согласия.</p>
              </div>
            )}
            <div>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUploadPolicy} />
              <Button variant="outline" size="sm" className="gap-2" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading
                  ? <><Icon name="Loader2" size={14} className="animate-spin" />Загрузка...</>
                  : <><Icon name="Upload" size={14} />{policyUrl ? "Заменить документ" : "Загрузить PDF"}</>}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">Только PDF-файл</p>
            </div>

            {policyUrl && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Icon name="Users" size={15} className="text-slate-500" />
                    Согласия клиентов
                    <span className="text-xs text-muted-foreground font-normal">({consents.length})</span>
                  </p>
                  <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={loadConsents} disabled={consentsLoading}>
                    <Icon name={consentsLoading ? "Loader2" : "RefreshCw"} size={12} className={consentsLoading ? "animate-spin" : ""} />
                    Обновить
                  </Button>
                </div>
                {consents.length === 0 && !consentsLoading ? (
                  <p className="text-xs text-muted-foreground">Согласий пока нет</p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Клиент</TableHead>
                          <TableHead className="text-xs">Версия политики</TableHead>
                          <TableHead className="text-xs">IP-адрес</TableHead>
                          <TableHead className="text-xs">Дата и время</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consentsLoading && (
                          <TableRow><TableCell colSpan={4} className="text-center py-6"><Icon name="Loader2" size={20} className="mx-auto animate-spin opacity-40" /></TableCell></TableRow>
                        )}
                        {!consentsLoading && consents.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-xs">
                              <p className="font-medium">{c.name}</p>
                              <p className="text-muted-foreground">{c.phone}</p>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{c.policy_version}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{c.ip}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(c.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Енот-мастер */}
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
                    {/* Фото */}
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

                      {/* Кнопка загрузки фото */}
                      <button
                        className="w-full text-xs flex items-center justify-center gap-1 py-1 rounded border border-dashed border-slate-300 hover:border-orange-400 hover:text-orange-600 text-slate-400 transition-colors disabled:opacity-50"
                        disabled={isUploadingPhoto}
                        onClick={() => triggerUpload(lvl.level, "photo")}
                      >
                        {isUploadingPhoto
                          ? <><Icon name="Loader2" size={12} className="animate-spin" />Загрузка...</>
                          : <><Icon name="Image" size={12} />{saved.photo ? "Фото" : "+ Фото"}</>}
                      </button>

                      {/* Видео — статус + загрузка */}
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

                      {/* Превью анимации */}
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
    </div>
  );
};

export default SettingsSection;