import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";
import { STAR_LABELS, WOOD_BREEDS, BONUS_MILESTONES } from "@/lib/store";
import { toast } from "sonner";

const LOOKUP_URL = "https://functions.poehali.dev/58aabebd-4ca5-40ce-9188-288ec6f26ec4";

const TOTAL_BREEDS = WOOD_BREEDS.length;

interface Magnet {
  id: number;
  breed: string;
  stars: number;
  category: string;
  given_at: string;
}

interface CollectionData {
  client_name: string;
  phone: string;
  magnets: Magnet[];
  total_magnets: number;
  unique_breeds: number;
}

const categoryColors: Record<string, string> = {
  "Классика": "bg-amber-100 text-amber-800 border-amber-200",
  "Премиум": "bg-orange-100 text-orange-800 border-orange-200",
  "Экзотика": "bg-red-100 text-red-800 border-red-200",
};

const starBg: Record<number, string> = {
  1: "bg-amber-50 border-amber-200",
  2: "bg-orange-50 border-orange-300",
  3: "bg-red-50 border-red-300",
};

const MyCollection = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CollectionData | null>(null);
  const [notFound, setNotFound] = useState(false);

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setNotFound(false);
  };

  const phoneDigits = phone.replace(/\D/g, "");
  const isValid = phoneDigits.length >= 11;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(LOOKUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      if (res.status === 404) {
        setNotFound(true);
        setData(null);
        return;
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Ошибка загрузки");

      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось загрузить данные";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const collectedBreeds = data ? new Set(data.magnets.map((m) => m.breed)) : new Set<string>();

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-8">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-orange-500 text-white rounded-xl p-3 w-14 h-14 flex items-center justify-center mx-auto">
            <Icon name="TreeDeciduous" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Моя коллекция</h1>
          <p className="text-muted-foreground text-sm">
            Введите номер телефона, чтобы увидеть собранные магниты
          </p>
        </div>

        <Card className="shadow-lg border-orange-200">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Номер телефона</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={handlePhoneChange}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!isValid || loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Icon name="Loader2" size={18} className="animate-spin" />
                    Поиск...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon name="Search" size={18} />
                    Найти мои магниты
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {notFound && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6 text-center space-y-3">
              <Icon name="UserX" size={40} className="mx-auto text-yellow-500 opacity-60" />
              <p className="text-sm text-yellow-800">
                Участник с таким номером не найден.
              </p>
              <a
                href="/register"
                className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                <Icon name="UserPlus" size={16} />
                Зарегистрироваться в акции
              </a>
            </CardContent>
          </Card>
        )}

        {data && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-orange-100 rounded-full p-2">
                    <Icon name="User" size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold">{data.client_name}</div>
                    <div className="text-sm text-muted-foreground">{data.phone}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">{data.total_magnets}</div>
                    <div className="text-xs text-muted-foreground">Всего магнитов</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">{data.unique_breeds}</div>
                    <div className="text-xs text-muted-foreground">Уникальных пород</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">{TOTAL_BREEDS - data.unique_breeds}</div>
                    <div className="text-xs text-muted-foreground">Осталось собрать</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="Award" size={18} className="text-orange-500" />
                  Прогресс бонусов
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {BONUS_MILESTONES.map((milestone) => {
                  const current = milestone.type === "magnets" ? data.total_magnets : data.unique_breeds;
                  const pct = Math.min((current / milestone.count) * 100, 100);
                  const reached = current >= milestone.count;
                  return (
                    <div key={milestone.count + milestone.type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={reached ? "font-medium text-green-700" : "text-muted-foreground"}>
                          {milestone.icon} {milestone.reward}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {current}/{milestone.count}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {data.magnets.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon name="Magnet" size={18} className="text-orange-500" />
                    Собранные магниты ({data.magnets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {data.magnets.map((magnet) => (
                      <div
                        key={magnet.id}
                        className={`rounded-lg border p-3 text-center shadow-sm ${starBg[magnet.stars] || "bg-white"}`}
                      >
                        <div className="text-2xl mb-1">
                          {STAR_LABELS[magnet.stars] || "⭐"}
                        </div>
                        <div className="font-medium text-sm">{magnet.breed}</div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] mt-1 ${categoryColors[magnet.category] || ""}`}
                        >
                          {magnet.category}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(magnet.given_at).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="Map" size={18} className="text-orange-500" />
                  Атлас пород — {data.unique_breeds}/{TOTAL_BREEDS}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WOOD_BREEDS.map((breed) => {
                    const collected = collectedBreeds.has(breed.breed);
                    return (
                      <div
                        key={breed.breed}
                        className={`rounded-lg border p-2 text-center text-xs transition-all ${
                          collected
                            ? "bg-green-50 border-green-300 text-green-800"
                            : "bg-gray-50 border-gray-200 text-gray-400"
                        }`}
                      >
                        <div className="text-lg mb-0.5">
                          {collected ? STAR_LABELS[breed.stars] : "❓"}
                        </div>
                        <div className={`font-medium ${collected ? "" : "opacity-50"}`}>
                          {breed.breed}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCollection;
