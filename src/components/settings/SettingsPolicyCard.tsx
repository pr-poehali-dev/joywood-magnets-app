import { useRef, useCallback, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";

const UPLOAD_POLICY_URL = "https://functions.poehali.dev/a3dfac54-994c-4651-8b8f-e2191da2f608";
const GET_CONSENTS_URL = "https://functions.poehali.dev/4abcb4ec-79d8-4bfa-8e66-1285f23e5eac";

const CONSENTS_PAGE_SIZE = 50;

interface ConsentItem {
  id: number; phone: string; name: string; policy_version: string; ip: string; created_at: string;
}

interface SettingsPolicyCardProps {
  policyUrl: string;
  onPolicyUrlChange: (url: string) => void;
}

const SettingsPolicyCard = ({ policyUrl, onPolicyUrlChange }: SettingsPolicyCardProps) => {
  const [uploading, setUploading] = useState(false);
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const [consentsPage, setConsentsPage] = useState(1);
  const [consentsTotal, setConsentsTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadConsents = useCallback((page = 1) => {
    setConsentsLoading(true);
    fetch(`${GET_CONSENTS_URL}?page=${page}`)
      .then((r) => r.json())
      .then((d) => { setConsents(d.consents || []); setConsentsTotal(d.total ?? 0); setConsentsPage(page); })
      .catch(() => {})
      .finally(() => setConsentsLoading(false));
  }, []);

  useEffect(() => { if (policyUrl) loadConsents(1); }, [policyUrl, loadConsents]);

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
      onPolicyUrlChange(data.url);
      toast({ title: "Политика конфиденциальности загружена" });
    } catch (err) {
      toast({ title: "Ошибка", description: err instanceof Error ? err.message : "Не удалось загрузить файл", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
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
                <span className="text-xs text-muted-foreground font-normal">({consentsTotal.toLocaleString("ru-RU")})</span>
              </p>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => loadConsents(consentsPage)} disabled={consentsLoading}>
                <Icon name={consentsLoading ? "Loader2" : "RefreshCw"} size={12} className={consentsLoading ? "animate-spin" : ""} />
                Обновить
              </Button>
            </div>
            {consents.length === 0 && !consentsLoading ? (
              <p className="text-xs text-muted-foreground">Согласий пока нет</p>
            ) : (
              <div className="space-y-2">
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
                {consentsTotal > CONSENTS_PAGE_SIZE && (
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={consentsPage <= 1 || consentsLoading} onClick={() => loadConsents(consentsPage - 1)}>
                      <Icon name="ChevronLeft" size={14} />
                    </Button>
                    <span className="text-xs text-muted-foreground px-1">{consentsPage} / {Math.ceil(consentsTotal / CONSENTS_PAGE_SIZE)}</span>
                    <Button variant="outline" size="sm" disabled={consentsPage >= Math.ceil(consentsTotal / CONSENTS_PAGE_SIZE) || consentsLoading} onClick={() => loadConsents(consentsPage + 1)}>
                      <Icon name="ChevronRight" size={14} />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SettingsPolicyCard;
