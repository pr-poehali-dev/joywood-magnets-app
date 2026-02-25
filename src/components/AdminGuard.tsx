import { useState, useEffect, createContext, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const ADMIN_AUTH_URL = "https://functions.poehali.dev/c2f29c51-6334-4758-a393-8c8b2e0553be";
const SESSION_KEY = "jw_admin_sid";

export interface AdminUser {
  id: number;
  email: string;
  role: "admin" | "manager";
  force_password_change: boolean;
}

interface AdminContextValue {
  user: AdminUser | null;
  sessionId: string | null;
  logout: () => void;
}

export const AdminContext = createContext<AdminContextValue>({
  user: null,
  sessionId: null,
  logout: () => {},
});

export const useAdmin = () => useContext(AdminContext);

const authFetch = (path: string, opts: RequestInit = {}, sid?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (sid) headers["X-Session-Id"] = sid;
  return fetch(`${ADMIN_AUTH_URL}${path}`, { ...opts, headers, credentials: "include" });
};

interface Props {
  children: React.ReactNode;
}

const AdminGuard = ({ children }: Props) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY));
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forceChange, setForceChange] = useState(false);

  useEffect(() => {
    const sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) { setLoading(false); return; }
    authFetch("/?action=me", {}, sid)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setSessionId(sid);
          if (data.user.force_password_change) setForceChange(true);
        } else {
          sessionStorage.removeItem(SESSION_KEY);
          setSessionId(null);
        }
      })
      .catch(() => { sessionStorage.removeItem(SESSION_KEY); setSessionId(null); })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await authFetch("/?action=login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const sid = data.session_id;
        sessionStorage.setItem(SESSION_KEY, sid);
        setSessionId(sid);
        setUser({ id: 0, email, role: data.role, force_password_change: data.force_password_change });
        if (data.force_password_change) setForceChange(true);
        // обновляем данные пользователя
        authFetch("/?action=me", {}, sid).then((r) => r.json()).then((d) => {
          if (d.user) setUser(d.user);
        });
      } else {
        setError(data.error || "Ошибка входа");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError("Пароли не совпадают"); return; }
    if (newPassword.length < 10) { setError("Минимум 10 символов"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await authFetch("/?action=change_password", {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword }),
      }, sessionId);
      const data = await res.json();
      if (res.ok && data.ok) {
        setForceChange(false);
        if (user) setUser({ ...user, force_password_change: false });
      } else {
        setError(data.error || "Ошибка");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await authFetch("/?action=logout", { method: "POST" }, sessionId).catch(() => {});
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setSessionId(null);
    setEmail("");
    setPassword("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Icon name="Loader2" size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <img
                src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg"
                alt="Joywood"
                className="w-14 h-14 object-contain"
              />
            </div>
            <CardTitle className="text-lg">Панель управления</CardTitle>
            <p className="text-sm text-muted-foreground">Войдите в аккаунт</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
              />
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              {error && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <Icon name="AlertCircle" size={14} />
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting || !email || !password}>
                {submitting ? <Icon name="Loader2" size={16} className="animate-spin" /> : "Войти"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (forceChange) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Смена пароля</CardTitle>
            <p className="text-sm text-muted-foreground">
              Необходимо установить новый пароль перед входом
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <Input
                type="password"
                placeholder="Новый пароль (мин. 10 символов)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                autoComplete="new-password"
              />
              <Input
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {error && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <Icon name="AlertCircle" size={14} />
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting || !newPassword || !confirmPassword}>
                {submitting ? <Icon name="Loader2" size={16} className="animate-spin" /> : "Сохранить пароль"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ user, sessionId, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminGuard;
