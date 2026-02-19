import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Icon from "@/components/ui/icon";
import { CHANNELS } from "@/lib/store";
import { toast } from "sonner";

const REGISTER_URL = "https://functions.poehali.dev/40f9e8db-184c-407c-ace9-d0877ed306b9";

const CLIENT_CHANNELS = CHANNELS.filter((ch) => ch !== "Телефон");

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("");
  const [ozonCode, setOzonCode] = useState("");
  const [loading, setLoading] = useState(false);

  const isOzon = channel === "Ozon";
  const isValid = name.trim().length >= 2 && phone.trim().length >= 6 && channel && (!isOzon || ozonCode.trim().length >= 3);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 1) return digits ? `+7` : "";
    const d = digits.startsWith("7") ? digits : "7" + digits;
    let result = `+7`;
    if (d.length > 1) result += ` (${d.slice(1, 4)}`;
    if (d.length > 4) result += `) ${d.slice(4, 7)}`;
    if (d.length > 7) result += `-${d.slice(7, 9)}`;
    if (d.length > 9) result += `-${d.slice(9, 11)}`;
    return result;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
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
          channel,
          ozon_order_code: isOzon ? ozonCode.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");

      navigate("/my-collection?phone=" + encodeURIComponent(phone.trim()));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось зарегистрироваться";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-orange-500 text-white rounded-xl p-3 w-14 h-14 flex items-center justify-center mx-auto">
            <Icon name="TreeDeciduous" size={28} />
          </div>
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
                  onChange={handlePhoneChange}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Как вы получили первый магнит?</Label>
                <RadioGroup value={channel} onValueChange={setChannel} className="grid gap-2">
                  {CLIENT_CHANNELS.map((ch) => (
                    <label
                      key={ch}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        channel === ch
                          ? "border-orange-400 bg-orange-50"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={ch} />
                      <span className="text-sm font-medium">{ch}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {isOzon && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label htmlFor="ozon-code">Код заказа Ozon</Label>
                  <Input
                    id="ozon-code"
                    placeholder="Например: 12345678-0001"
                    value={ozonCode}
                    onChange={(e) => setOzonCode(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Найдите код в разделе «Мои заказы» на Ozon
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
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