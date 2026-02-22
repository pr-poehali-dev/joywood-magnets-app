import Icon from "@/components/ui/icon";

const BONUS_MILESTONES = [
  { count: 5, icon: "🎁", label: "5 магнитов" },
  { count: 10, icon: "🎁", label: "10 пород" },
  { count: 30, icon: "🏆", label: "30 пород" },
  { count: 50, icon: "👑", label: "50 пород" },
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
    examples: ["Бубинго", "Лайсвуд", "Амарант", "Палисандр"],
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
            <span className="font-semibold text-sm text-gold-500">Joywood</span>
          </div>
          <a
            href="https://joywood.store/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-gold-500 hover:bg-gold-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
          >
            <Icon name="ShoppingBag" size={15} />
            Купить
          </a>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-stone-900 to-stone-800">
        <video
          src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/videos/promo-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-400/30 text-gold-200 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur">
            <Icon name="Sparkles" size={13} />
            Уникальная программа лояльности Joywood
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Собери коллекцию<br />
            <span className="text-gold-300">образцов столярных пород древесины</span>
          </h1>
          <p className="text-stone-300 text-base leading-relaxed max-w-md mx-auto">
            С каждым заказом Joywood вы получаете магнит из настоящей, иногда даже очень редкой породы древесины. Десятки уникальных экземпляров — от привычного дуба до экзотического лайсвуда
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Как это работает</h2>
          <p className="text-muted-foreground text-sm">Всё просто — покупаете, получаете, коллекционируете</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: "ShoppingBag", step: "1", title: "Делаете заказ", desc: "Покупаете товары Joywood на Ozon или на сайте", color: "bg-blue-50 text-blue-600 border-blue-100" },
            { icon: "Gift", step: "2", title: "Получаете магнит", desc: "Вместе с заказом приходит магнит из настоящей ценной породы дерева", color: "bg-amber-50 text-amber-600 border-amber-100" },
            { icon: "QrCode", step: "3", title: "Сканируете QR-код", desc: "Отслеживаете прогресс в акции и узнаёте интересное о каждой породе", color: "bg-purple-50 text-purple-600 border-purple-100" },
            { icon: "Trophy", step: "4", title: "Копите подарки", desc: "Достигайте рубежей и получайте ценные подарки для мастера", color: "bg-green-50 text-green-600 border-green-100" },
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

      {/* Competition & social */}
      <div className="bg-gradient-to-r from-gold-50 to-amber-50 border-y border-gold-100 py-10">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Соревнуйтесь и делитесь</h2>
            <p className="text-muted-foreground text-sm">Кто соберёт больше — тот и в лидерах</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gold-200 p-5 space-y-2">
              <div className="text-2xl">🏅</div>
              <p className="font-semibold text-sm text-foreground">Рейтинг мастеров</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Смотрите, кто из мастеров впереди, и соревнуйтесь за первые места в таблице лидеров</p>
            </div>
            <div className="bg-white rounded-2xl border border-gold-200 p-5 space-y-2">
              <div className="text-2xl">🎁</div>
              <p className="font-semibold text-sm text-foreground">Бонус за репост</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Поделитесь своим прогрессом в соцсетях — получите дополнительный подарок от Joywood</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div className="bg-stone-50 py-12">
        <div className="max-w-2xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Породы трёх разных категорий</h2>
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
          <p className="text-muted-foreground text-sm">Чем больше пород — тем ценнее подарок. Всё пригодится в работе мастера</p>
        </div>
        <div className="space-y-3">
          {BONUS_MILESTONES.map((m, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 bg-white shadow-sm">
              <div className="text-2xl leading-none">{m.icon}</div>
              <div className="flex-1">
                <div className="h-3 w-32 bg-stone-200 rounded-full blur-sm" />
                <div className="h-2.5 w-20 bg-stone-100 rounded-full blur-sm mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1.5 italic">полезный инструмент для мастера</p>
              </div>
              <div className="bg-gold-50 border border-gold-200 rounded-full px-3 py-1 text-xs font-bold text-gold-700">
                {m.label}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">Конкретные призы узнаете после первого магнита 🎁</p>
      </div>

      {/* CTA bottom */}
      <div className="bg-gradient-to-b from-stone-800 to-stone-900 py-14">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-5">
          <h2 className="text-2xl font-bold text-white">Начните собирать коллекцию</h2>
          <p className="text-stone-300 text-sm leading-relaxed">
            Выбирайте удобную площадку — каждый заказ приближает вас к подарку
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://joywood.store/shop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold text-base px-8 py-3.5 rounded-full transition-colors shadow-lg"
            >
              <Icon name="ShoppingBag" size={18} />
              Товары на сайте Joywood
            </a>
            <a
              href="https://www.ozon.ru/seller/joywood/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#005BFF] hover:bg-[#0047CC] text-white font-bold text-base px-8 py-3.5 rounded-full transition-colors shadow-lg"
            >
              <Icon name="ExternalLink" size={18} />
              Товары Joywood на Ozon
            </a>
          </div>
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
            <span className="text-stone-500 text-xs">© Joywood — материалы для творчества и столярного дела</span>
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
