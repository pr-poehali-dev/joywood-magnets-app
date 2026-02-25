import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { useAdmin } from "@/components/AdminGuard";

const ADMIN_AUTH_URL = "https://functions.poehali.dev/c2f29c51-6334-4758-a393-8c8b2e0553be";

interface Manager {
  id: number;
  email: string;
  role: "admin" | "manager";
  is_active: boolean;
  force_password_change: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface AuditEntry {
  id: number;
  ts: string;
  actor_email: string | null;
  action: string;
  target: string | null;
  ip: string | null;
}

const authFetch = (path: string, opts: RequestInit = {}, sid?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (sid) headers["X-Session-Id"] = sid;
  return fetch(`${ADMIN_AUTH_URL}${path}`, { ...opts, headers });
};

const ManagersSection = () => {
  const { sessionId } = useAdmin();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"manager" | "admin">("manager");
  const [creating, setCreating] = useState(false);
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/?action=users", {}, sessionId);
      const data = await res.json();
      if (data.users) setManagers(data.users);
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    const res = await authFetch("/?action=audit", {}, sessionId);
    const data = await res.json();
    if (data.log) setAudit(data.log);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showAudit) loadAudit(); }, [showAudit]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await authFetch("/?action=users", {
        method: "POST",
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      }, sessionId);
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Менеджер создан. При первом входе потребуется сменить пароль.");
        setNewEmail(""); setNewPassword(""); setNewRole("manager"); setShowCreate(false);
        load();
      } else {
        toast.error(data.error || "Ошибка");
      }
    } catch {
      toast.error("Ошибка соединения");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (m: Manager) => {
    const res = await authFetch(`/?action=users&id=${m.id}`, {
      method: "PUT",
      body: JSON.stringify({ is_active: !m.is_active }),
    }, sessionId);
    const data = await res.json();
    if (res.ok && data.ok) {
      toast.success(m.is_active ? "Аккаунт деактивирован" : "Аккаунт активирован");
      load();
    } else {
      toast.error(data.error || "Ошибка");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetId) return;
    setResetting(true);
    try {
      const res = await authFetch(`/?action=users&id=${resetId}`, {
        method: "PUT",
        body: JSON.stringify({ password: resetPw }),
      }, sessionId);
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Пароль сброшен. Менеджер должен будет сменить его при входе.");
        setResetId(null); setResetPw(""); load();
      } else {
        toast.error(data.error || "Ошибка");
      }
    } catch {
      toast.error("Ошибка");
    } finally {
      setResetting(false);
    }
  };

  const fmtDate = (s: string | null) => {
    if (!s) return "—";
    return new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const ACTION_LABELS: Record<string, string> = {
    login_success: "Вход",
    login_fail: "Неверный пароль",
    login_blocked: "Заблокирован",
    logout: "Выход",
    user_created: "Создан пользователь",
    user_updated: "Изменён пользователь",
    password_changed: "Смена пароля",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Менеджеры</h2>
          <p className="text-sm text-muted-foreground">Управление доступом в панель</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowAudit(!showAudit); }}>
            <Icon name="ScrollText" size={15} className="mr-1.5" />
            Лог действий
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Icon name="UserPlus" size={15} className="mr-1.5" />
            Добавить
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Новый менеджер</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                <Input placeholder="Пароль (мин. 10 символов)" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Роль:</label>
                <div className="flex gap-2">
                  {(["manager", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${newRole === r ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"}`}
                    >
                      {r === "admin" ? "Администратор" : "Менеджер"}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Менеджер получит временный пароль и при первом входе должен будет его сменить.</p>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? <Icon name="Loader2" size={14} className="animate-spin mr-1" /> : null}
                  Создать
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Отмена</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {resetId !== null && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Сброс пароля — {managers.find((m) => m.id === resetId)?.email}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="flex gap-2 items-end">
              <Input placeholder="Новый пароль (мин. 10 символов)" type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} required className="max-w-xs" />
              <Button type="submit" size="sm" disabled={resetting}>
                {resetting ? <Icon name="Loader2" size={14} className="animate-spin mr-1" /> : null}
                Сохранить
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setResetId(null); setResetPw(""); }}>Отмена</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Icon name="Loader2" size={18} className="animate-spin" />
          Загрузка...
        </div>
      ) : (
        <div className="grid gap-3">
          {managers.map((m) => (
            <Card key={m.id} className={`${!m.is_active ? "opacity-60" : ""}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${m.role === "admin" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                      {m.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{m.email}</span>
                        <Badge variant={m.role === "admin" ? "default" : "secondary"} className="text-[10px] py-0">
                          {m.role === "admin" ? "Администратор" : "Менеджер"}
                        </Badge>
                        {!m.is_active && <Badge variant="outline" className="text-[10px] py-0 text-slate-400">Деактивирован</Badge>}
                        {m.force_password_change && <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-300">Требуется смена пароля</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Создан: {fmtDate(m.created_at)} · Последний вход: {fmtDate(m.last_login_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setResetId(m.id); setResetPw(""); }}>
                      <Icon name="KeyRound" size={13} className="mr-1" />
                      Пароль
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-xs h-7 ${m.is_active ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"}`}
                      onClick={() => toggleActive(m)}
                    >
                      <Icon name={m.is_active ? "UserX" : "UserCheck"} size={13} className="mr-1" />
                      {m.is_active ? "Деактивировать" : "Активировать"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {managers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Нет менеджеров. Создайте первый аккаунт.</p>
          )}
        </div>
      )}

      {showAudit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon name="ScrollText" size={15} />
              Лог действий (последние 100)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Время</th>
                    <th className="text-left px-4 py-2 font-medium">Кто</th>
                    <th className="text-left px-4 py-2 font-medium">Действие</th>
                    <th className="text-left px-4 py-2 font-medium">Объект</th>
                    <th className="text-left px-4 py-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-slate-50/50">
                      <td className="px-4 py-1.5 whitespace-nowrap text-muted-foreground">{fmtDate(a.ts)}</td>
                      <td className="px-4 py-1.5">{a.actor_email || "—"}</td>
                      <td className="px-4 py-1.5">
                        <span className={`inline-flex items-center gap-1 ${a.action.includes("fail") || a.action.includes("blocked") ? "text-red-600" : a.action.includes("success") || a.action.includes("created") ? "text-green-700" : "text-slate-700"}`}>
                          {ACTION_LABELS[a.action] || a.action}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 text-muted-foreground">{a.target || "—"}</td>
                      <td className="px-4 py-1.5 text-muted-foreground">{a.ip || "—"}</td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Лог пуст</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManagersSection;