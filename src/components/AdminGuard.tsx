import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const CHECK_PASSWORD_URL = "https://functions.poehali.dev/bc5f0fde-e8e9-4666-9cdb-b19f49b506fe";
const SESSION_KEY = "jw_admin_auth";

interface Props {
  children: React.ReactNode;
}

const AdminGuard = ({ children }: Props) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token === "ok") setAuthenticated(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${CHECK_PASSWORD_URL}?action=check_password&password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(SESSION_KEY, "ok");
        sessionStorage.setItem("jw_admin_password", password);
        setAuthenticated(true);
      } else {
        setError("Неверный пароль");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  if (authenticated) return <>{children}</>;

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
          <p className="text-sm text-muted-foreground">Введите пароль для входа</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <Icon name="AlertCircle" size={14} />
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : "Войти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGuard;