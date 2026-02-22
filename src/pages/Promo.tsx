import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const BONUS_MILESTONES = [
  { count: 5, reward: "Кисть Titebrush Titebond", icon: "🎁", label: "5 магнитов" },
  { count: 10, reward: "Клей Titebond III 473 мл", icon: "🎁", label: "10 пород" },
  { count: 30, reward: "Клей Titebond III 946 мл", icon: "🏆", label: "30 пород" },
  { count: 50, reward: "Клей Titebond III 3,785 л", icon: "👑", label: "50 пород" },
];

const STAR_TIERS = [
  {
    stars: 1,
    label: "Обычные",
    emoji: "⭐",
    color: "from-amber-50 to-yellow-50",
    border: "border-amber-200",
    text: "text-amber-800",
    desc: "Привычные породы, знакомые каждому мастеру",
    examples: ["Дуб", "Бук", "Ясень", "Лиственница", "Сосна"],
  },
  {
    stars: 2,
    label: "Особенные",
    emoji: "⭐⭐",
    color: "from-orange-50 to-amber-50",
    border: "border-orange-200",
    text: "text-orange-800",
    desc: "Редкие породы с выразительной текстурой и характером",
    examples: ["Венге", "Падук", "Сапели", "Зебрано", "Мербау"],
  },
  {
    stars: 3,
    label: "Элитные",
    emoji: "⭐⭐⭐",
    color: "from-red-50 to-orange-50",
    border: "border-red-200",
    text: "text-red-800",
    desc: "Экзотические породы — настоящая гордость коллекционера",
    examples: ["Бубинго", "Лайсвуд", "Амарант", "Кокоболо"],
  },
];

const Promo = () => {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gold-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg"
              alt="Joywood"
              className="w-8 h-8 object-contain rounded"
            />
            <span className="font-semibold text-sm text-foreground">Joywood</span>
          </div>
          <Link
            to="/my-collection"
            className="flex items-center gap-1.5 bg-gold-500 hover:bg-gold-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
          >
            <Icon name="Layers" size={15} />
            Уже собираю
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-stone-900 to-stone-800">
        <img
          src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/files/ecc2355c-5749-4a3d-9837-11fe5a429cbc.jpg"
          alt="Коллекция магнитов"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-400/30 text-gold-200 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur">
            <Icon name="Sparkles" size={13} />
            Программа лояльности Joywood
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Собери коллекцию<br />
            <span className="text-gold-300">ценных пород дерева</span>
          </h1>
          <p className="text-stone-300 text-base leading-relaxed max-w-md mx-auto">
            С каждым заказом Joywood вы получаете магнит из настоящей ценной породы дерева. 54 уникальных экземпляра — от привычного дуба до экзотического кокоболо
          </p>
          <Link
            to="/my-collection"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold text-base px-8 py-3.5 rounded-full transition-colors shadow-lg"
          >
            <Icon name="Layers" size={18} />
            Посмотреть мою коллекцию
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Как это работает</h2>
          <p className="text-muted-foreground text-sm">Всё просто — покупаете, получаете, коллекционируете</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "ShoppingBag", step: "1", title: "Делаете заказ", desc: "Покупаете изделия Joywood на Ozon или на сайте", color: "bg-blue-50 text-blue-600 border-blue-100" },
            { icon: "Gift", step: "2", title: "Получаете магнит", desc: "Вместе с заказом приходит магнит из ценной породы дерева", color: "bg-amber-50 text-amber-600 border-amber-100" },
            { icon: "Trophy", step: "3", title: "Копите подарки", desc: "Достигайте рубежей и получайте ценные подарки для мастера", color: "bg-green-50 text-green-600 border-green-100" },
          ].map((item) => (
            <div key={item.step} className={`rounded-2xl border p-5 space-y-3 ${item.color}`}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold">
                  {item.step}
                </div>
                <Icon name={item.icon} size={18} />
              </div>
              <div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tiers */}
      <div className="bg-stone-50 py-12">
        <div className="max-w-2xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">54 породы трёх категорий</h2>
            <p className="text-muted-foreground text-sm">Каждая порода уникальна — текстура, цвет, история</p>
          </div>
          <div className="space-y-3">
            {STAR_TIERS.map((tier) => (
              <div key={tier.stars} className={`rounded-2xl border bg-gradient-to-r ${tier.color} ${tier.border} p-5`}>
                <div className="flex items-start gap-4">
                  <div className="text-2xl leading-none mt-0.5">{tier.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold text-sm ${tier.text}`}>{tier.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{tier.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tier.examples.map((name) => (
                        <span key={name} className="text-xs bg-white/70 border border-white/50 rounded-full px-2.5 py-0.5 font-medium text-stone-700">
                          {name}
                        </span>
                      ))}
                      <span className="text-xs text-muted-foreground px-1 py-0.5">и другие...</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bonuses */}
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Призы за коллекцию</h2>
          <p className="text-muted-foreground text-sm">Чем больше пород в коллекции — тем ценнее подарок</p>
        </div>
        <div className="space-y-3">
          {BONUS_MILESTONES.map((m, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 bg-white shadow-sm">
              <div className="text-2xl leading-none">{m.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">{m.reward}</p>
                <p className="text-xs text-muted-foreground mt-0.5">За {m.label}</p>
              </div>
              <div className="bg-gold-50 border border-gold-200 rounded-full px-3 py-1 text-xs font-bold text-gold-700">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA bottom */}
      <div className="bg-gradient-to-b from-stone-800 to-stone-900 py-14">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-5">
          <h2 className="text-2xl font-bold text-white">Уже есть магниты?</h2>
          <p className="text-stone-300 text-sm leading-relaxed">
            Введите номер телефона и посмотрите свою коллекцию, прогресс и место в рейтинге
          </p>
          <Link
            to="/my-collection"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold text-base px-8 py-3.5 rounded-full transition-colors shadow-lg"
          >
            <Icon name="Layers" size={18} />
            Открыть мою коллекцию
          </Link>
          <p className="text-stone-500 text-xs">Бесплатно. Нужен только номер телефона</p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-stone-900 py-6">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <img
              src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg"
              alt="Joywood"
              className="w-6 h-6 object-contain rounded opacity-70"
            />
            <span className="text-stone-500 text-xs">© Joywood — изделия из ценных пород дерева</span>
          </div>
          <a href="https://joywood.store" target="_blank" rel="noopener noreferrer" className="text-stone-500 text-xs hover:text-stone-300 transition-colors">
            joywood.store
          </a>
        </div>
      </div>

    </div>
  );
};

export default Promo;
