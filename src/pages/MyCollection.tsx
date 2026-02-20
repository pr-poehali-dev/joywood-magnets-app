import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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

interface BonusRecord {
  id: number;
  milestone_count: number;
  milestone_type: string;
  reward: string;
  given_at: string;
}

interface CollectionData {
  client_name: string;
  phone: string;
  magnets: Magnet[];
  total_magnets: number;
  unique_breeds: number;
  bonuses: BonusRecord[];
}


const MyCollection = () => {
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CollectionData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const autoSearched = useRef(false);

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

  const doSearch = useCallback(async (searchPhone: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(LOOKUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: searchPhone }),
      });
      if (res.status === 404) { setNotFound(true); setData(null); return; }
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Ошибка загрузки");
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось загрузить данные");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const urlPhone = searchParams.get("phone");
    if (urlPhone && !autoSearched.current) {
      autoSearched.current = true;
      setPhone(urlPhone);
      doSearch(urlPhone);
    }
  }, [searchParams, doSearch]);

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
  const collectedOrder = data ? data.magnets.map((m) => m.breed) : [];

  const sortedBreeds = data
    ? [
        ...WOOD_BREEDS.filter((b) => collectedBreeds.has(b.breed)).sort(
          (a, b) => collectedOrder.indexOf(a.breed) - collectedOrder.indexOf(b.breed)
        ),
        ...WOOD_BREEDS.filter((b) => !collectedBreeds.has(b.breed)),
      ]
    : WOOD_BREEDS;

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-3">
          <img
            src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg"
            alt="Joywood"
            className="w-20 h-20 mx-auto object-contain"
          />
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-foreground">Ваша коллекция уже началась</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              В ваших руках — образец настоящей ценной породы дерева. Joywood работает с более чем 50 породами, и каждая следующая покупка приближает вас к редким экземплярам и подаркам
            </p>
          </div>
        </div>

        {!data && (
          <Card className="shadow-lg border-gold-200">
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
                  className="w-full bg-gold-500 hover:bg-gold-600"
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

              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground mb-2">Ещё не участвуете в акции?</p>
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 text-sm font-medium text-gold-600 hover:text-gold-700"
                >
                  <Icon name="UserPlus" size={16} />
                  Зарегистрироваться
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {notFound && (
          <Card className="border-gold-200 bg-gold-50">
            <CardContent className="pt-6 text-center space-y-4">
              <Icon name="UserX" size={44} className="mx-auto text-gold-400" />
              <div>
                <p className="font-semibold text-gold-900">Номер не найден</p>
                <p className="text-sm text-gold-700 mt-1">
                  Возможно, вы ещё не зарегистрированы в акции или указали другой номер
                </p>
              </div>
              <a href="/register">
                <Button className="w-full bg-gold-500 hover:bg-gold-600 gap-2">
                  <Icon name="UserPlus" size={16} />
                  Зарегистрироваться в акции
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {data && (() => {
          const n = data.total_magnets;
          const nextMilestone = BONUS_MILESTONES.find((m) =>
            (m.type === "magnets" ? data.total_magnets : data.unique_breeds) < m.count
          );
          const motivation = n === 1
            ? { emoji: "🌱", title: "Коллекция началась!", text: "У вас первый магнит — Падук. Каждая новая покупка в Joywood приносит новый образец редкой породы дерева." }
            : n < 5
            ? { emoji: "🌿", title: "Коллекция растёт", text: `Уже ${n} породы в коллекции. Ещё ${5 - n} магнита — и получите первый подарок от Joywood.` }
            : nextMilestone
            ? { emoji: "🏅", title: "Вы на пути к награде", text: `До следующего приза — «${nextMilestone.reward}» — осталось совсем немного. Продолжайте покупать!` }
            : { emoji: "👑", title: "Невероятная коллекция!", text: "Вы собрали редчайшие породы дерева. Вы — настоящий знаток Joywood." };
          return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="border-gold-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gold-100 rounded-full p-2">
                    <Icon name="User" size={20} className="text-gold-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{data.client_name.replace(/^\d+\s+/, "")}</div>
                    <div className="text-xs text-muted-foreground/50 tracking-widest">
                      {data.phone.replace(/\d(?=\d{4})/g, "•")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground gap-1.5"
                    onClick={() => { setData(null); setPhone(""); setNotFound(false); }}
                  >
                    <Icon name="LogOut" size={15} />
                    Выйти
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gold-600">{data.total_magnets}</div>
                    <div className="text-xs text-muted-foreground">Всего магнитов</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gold-600">{data.unique_breeds}</div>
                    <div className="text-xs text-muted-foreground">Уникальных пород</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gold-600">{TOTAL_BREEDS - data.unique_breeds}</div>
                    <div className="text-xs text-muted-foreground">Осталось собрать</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-xl bg-gradient-to-r from-gold-50 to-amber-50 border border-gold-200 p-4 flex gap-3 items-start">
              <span className="text-2xl leading-none mt-0.5">{motivation.emoji}</span>
              <div>
                <div className="font-semibold text-gold-900 text-sm">{motivation.title}</div>
                <div className="text-sm text-gold-700 mt-0.5 leading-relaxed">{motivation.text}</div>
              </div>
            </div>

            {data.total_magnets > 0 && (data.bonuses || []).length === 0 && (() => {
              const anyReached = BONUS_MILESTONES.some((m) => {
                const cur = m.type === "magnets" ? data.total_magnets : data.unique_breeds;
                return cur >= m.count;
              });
              return anyReached ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
                  <span className="text-xl shrink-0">ℹ️</span>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Бонусы не выдавались</p>
                    <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                      До вашей регистрации в коллекции накопленные магниты не давали право на бонус. Теперь, когда вы зарегистрированы, при следующем заказе менеджер выдаст вам заработанные бонусы.
                    </p>
                  </div>
                </div>
              ) : null;
            })()}

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
                  const given = (data.bonuses || []).some(
                    (b) => b.milestone_count === milestone.count && b.milestone_type === milestone.type
                  );
                  return (
                    <div key={milestone.count + milestone.type} className="space-y-1">
                      <div className="flex justify-between items-center text-sm gap-2">
                        <span className={`flex items-center gap-1.5 ${reached ? "font-medium text-green-700" : "text-muted-foreground"}`}>
                          {milestone.icon} {milestone.reward}
                          {given && (
                            <Badge className="bg-green-100 text-green-800 border border-green-200 text-[10px] py-0 px-1.5">Получен</Badge>
                          )}
                          {reached && !given && (
                            <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] py-0 px-1.5 animate-pulse">Ожидает выдачи</Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {current}/{milestone.count}
                        </span>
                      </div>
                      <Progress value={pct} className={`h-2 ${reached ? "[&>div]:bg-green-500" : ""}`} />
                    </div>
                  );
                })}

                {(data.bonuses || []).length > 0 && (
                  <div className="pt-2 border-t space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Полученные бонусы:</p>
                    {(data.bonuses || []).map((b) => (
                      <div key={b.id} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <Icon name="Gift" size={14} className="text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-800 truncate">{b.reward}</p>
                          <p className="text-[11px] text-green-600">
                            {new Date(b.given_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                        <Icon name="CheckCircle" size={16} className="text-green-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="Map" size={18} className="text-orange-500" />
                  Атлас пород — {data.unique_breeds}/{TOTAL_BREEDS}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sortedBreeds.map((breed) => {
                    const collected = collectedBreeds.has(breed.breed);
                    const magnet = collected ? data.magnets.find((m) => m.breed === breed.breed) : null;
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
                        {magnet && (
                          <div className="text-[10px] text-green-600 mt-0.5">
                            {new Date(magnet.given_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          );
        })()}
      </div>
    </div>
  );
};

export default MyCollection;