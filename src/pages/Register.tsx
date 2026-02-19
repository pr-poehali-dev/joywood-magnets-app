import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const REGISTER_URL = "https://functions.poehali.dev/40f9e8db-184c-407c-ace9-d0877ed306b9";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ozonCode, setOzonCode] = useState("");
  const [showOzon, setShowOzon] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    (!showOzon || ozonCode.trim().length >= 3);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 1) return digits ? "+7" : "";
    const d = digits.startsWith("7") ? digits : "7" + digits;
    let result = "+7";
    if (d.length > 1) result += ` (${d.slice(1, 4)}`;
    if (d.length > 4) result += `) ${d.slice(4, 7)}`;
    if (d.length > 7) result += `-${d.slice(7, 9)}`;
    if (d.length > 9) result += `-${d.slice(9, 11)}`;
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          ozon_order_code: showOzon && ozonCode.trim() ? ozonCode.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");

      navigate("/my-collection?phone=" + encodeURIComponent(phone.trim()));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <img src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg" alt="Joywood" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="text-2xl font-bold text-foreground">Атлас пород</h1>
          <p className="text-muted-foreground text-sm">
            Регистрация в акции Joywood — собирайте коллекцию магнитов из ценных пород дерева
          </p>
        </div>

        <Card className="shadow-lg border-orange-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Регистрация участника</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Ваше имя</Label>
                <Input
                  id="name"
                  placeholder="Как к вам обращаться?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  По номеру телефона вы сможете войти в коллекцию в любое время
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowOzon((v) => !v)}
                  className={`w-full flex items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                    showOzon
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Icon name="Package" size={16} />
                    Покупал(а) на Ozon
                  </span>
                  <Icon name={showOzon ? "ChevronUp" : "ChevronDown"} size={16} />
                </button>

                {showOzon && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="ozon-code">Номер заказа Ozon</Label>
                    <Input
                      id="ozon-code"
                      placeholder="Например: 12345678-0001"
                      value={ozonCode}
                      onChange={(e) => setOzonCode(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Найдите номер в разделе «Мои заказы» на Ozon
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600"
                disabled={!isValid || loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Icon name="Loader2" size={18} className="animate-spin" />
                    Регистрация...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon name="UserPlus" size={18} />
                    Зарегистрироваться
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xl mb-1">🧲</div>
            <div className="text-xs text-muted-foreground">20 пород в коллекции</div>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xl mb-1">🎁</div>
            <div className="text-xs text-muted-foreground">Бонусы за сбор</div>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xl mb-1">⭐</div>
            <div className="text-xs text-muted-foreground">Редкие магниты</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;