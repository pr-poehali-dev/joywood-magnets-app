export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  channels: string[];
  totalSpent: number;
  ordersCount: number;
  magnetsCollected: MagnetRecord[];
  uniqueBreeds: number;
  status: "active" | "paused" | "stopped";
  createdAt: string;
  notes: string;
}

export interface MagnetRecord {
  id: string;
  breed: string;
  stars: 1 | 2 | 3;
  givenAt: string;
  orderId: string;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  channel: string;
  date: string;
  magnetsGiven: MagnetRecord[];
  isFirstOrder: boolean;
  status: "completed" | "returned" | "pending";
}

export interface MagnetType {
  breed: string;
  stars: 1 | 2 | 3;
  inStock: number;
  totalGiven: number;
  category: string;
}

export const CHANNELS = ["Сайт Joywood", "Ozon", "Avito", "Очно", "Мессенджеры", "Телефон"];

export const STAR_LABELS: Record<number, string> = {
  1: "⭐",
  2: "⭐⭐",
  3: "⭐⭐⭐",
};

export const BONUS_MILESTONES = [
  { count: 5, type: "magnets", reward: "Кисть для клея Titebrush TM Titebond", icon: "🎁" },
  { count: 10, type: "breeds", reward: "Клей Titebond III 473 мл", icon: "🎁" },
  { count: 30, type: "breeds", reward: "Клей Titebond III 946 мл", icon: "🏆" },
  { count: 50, type: "breeds", reward: "Клей Titebond III 3,785 л", icon: "👑" },
];

export const WOOD_BREEDS: MagnetType[] = [
  { breed: "Падук", stars: 2, inStock: 45, totalGiven: 120, category: "Экзотика" },
  { breed: "Дуб", stars: 1, inStock: 80, totalGiven: 200, category: "Классика" },
  { breed: "Ясень", stars: 1, inStock: 65, totalGiven: 180, category: "Классика" },
  { breed: "Орех", stars: 2, inStock: 30, totalGiven: 95, category: "Премиум" },
  { breed: "Бук", stars: 1, inStock: 70, totalGiven: 150, category: "Классика" },
  { breed: "Венге", stars: 3, inStock: 12, totalGiven: 40, category: "Экзотика" },
  { breed: "Тик", stars: 3, inStock: 8, totalGiven: 25, category: "Экзотика" },
  { breed: "Клён", stars: 1, inStock: 90, totalGiven: 210, category: "Классика" },
  { breed: "Берёза", stars: 1, inStock: 100, totalGiven: 250, category: "Классика" },
  { breed: "Махагон", stars: 3, inStock: 5, totalGiven: 15, category: "Экзотика" },
  { breed: "Зебрано", stars: 2, inStock: 20, totalGiven: 55, category: "Экзотика" },
  { breed: "Палисандр", stars: 3, inStock: 6, totalGiven: 18, category: "Экзотика" },
  { breed: "Ольха", stars: 1, inStock: 75, totalGiven: 160, category: "Классика" },
  { breed: "Липа", stars: 1, inStock: 85, totalGiven: 190, category: "Классика" },
  { breed: "Сосна", stars: 1, inStock: 95, totalGiven: 220, category: "Классика" },
  { breed: "Вишня", stars: 2, inStock: 25, totalGiven: 70, category: "Премиум" },
  { breed: "Граб", stars: 1, inStock: 60, totalGiven: 130, category: "Классика" },
  { breed: "Ироко", stars: 2, inStock: 18, totalGiven: 45, category: "Экзотика" },
  { breed: "Амарант", stars: 3, inStock: 4, totalGiven: 10, category: "Экзотика" },
  { breed: "Бубинга", stars: 3, inStock: 7, totalGiven: 22, category: "Экзотика" },
];

export const DEMO_CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Алексей Петров",
    phone: "+7 (903) 123-45-67",
    email: "petrov@mail.ru",
    channels: ["Сайт Joywood", "Ozon"],
    totalSpent: 18500,
    ordersCount: 5,
    magnetsCollected: [
      { id: "m1", breed: "Падук", stars: 2, givenAt: "2025-12-15", orderId: "o1" },
      { id: "m2", breed: "Дуб", stars: 1, givenAt: "2026-01-10", orderId: "o2" },
      { id: "m3", breed: "Ясень", stars: 1, givenAt: "2026-01-10", orderId: "o2" },
      { id: "m4", breed: "Орех", stars: 2, givenAt: "2026-01-25", orderId: "o3" },
      { id: "m5", breed: "Венге", stars: 3, givenAt: "2026-02-05", orderId: "o4" },
      { id: "m6", breed: "Клён", stars: 1, givenAt: "2026-02-15", orderId: "o5" },
    ],
    uniqueBreeds: 6,
    status: "active",
    createdAt: "2025-12-15",
    notes: "Постоянный клиент, интересуется экзотикой",
  },
  {
    id: "c2",
    name: "Мария Сидорова",
    phone: "+7 (916) 987-65-43",
    email: "sidorova@gmail.com",
    channels: ["Avito"],
    totalSpent: 4200,
    ordersCount: 2,
    magnetsCollected: [
      { id: "m7", breed: "Падук", stars: 2, givenAt: "2026-01-20", orderId: "o6" },
      { id: "m8", breed: "Берёза", stars: 1, givenAt: "2026-02-01", orderId: "o7" },
      { id: "m9", breed: "Сосна", stars: 1, givenAt: "2026-02-01", orderId: "o7" },
    ],
    uniqueBreeds: 3,
    status: "active",
    createdAt: "2026-01-20",
    notes: "",
  },
  {
    id: "c3",
    name: "Дмитрий Козлов",
    phone: "+7 (926) 555-12-34",
    email: "kozlov@yandex.ru",
    channels: ["Сайт Joywood", "Очно"],
    totalSpent: 32000,
    ordersCount: 8,
    magnetsCollected: [
      { id: "m10", breed: "Падук", stars: 2, givenAt: "2025-11-01", orderId: "o8" },
      { id: "m11", breed: "Дуб", stars: 1, givenAt: "2025-11-20", orderId: "o9" },
      { id: "m12", breed: "Бук", stars: 1, givenAt: "2025-11-20", orderId: "o9" },
      { id: "m13", breed: "Тик", stars: 3, givenAt: "2025-12-10", orderId: "o10" },
      { id: "m14", breed: "Орех", stars: 2, givenAt: "2026-01-05", orderId: "o11" },
      { id: "m15", breed: "Зебрано", stars: 2, givenAt: "2026-01-05", orderId: "o11" },
      { id: "m16", breed: "Вишня", stars: 2, givenAt: "2026-01-15", orderId: "o12" },
      { id: "m17", breed: "Ироко", stars: 2, givenAt: "2026-02-01", orderId: "o13" },
      { id: "m18", breed: "Клён", stars: 1, givenAt: "2026-02-10", orderId: "o14" },
      { id: "m19", breed: "Липа", stars: 1, givenAt: "2026-02-10", orderId: "o14" },
    ],
    uniqueBreeds: 10,
    status: "active",
    createdAt: "2025-11-01",
    notes: "VIP-клиент, собирает полную коллекцию",
  },
  {
    id: "c4",
    name: "Елена Волкова",
    phone: "+7 (905) 222-33-44",
    email: "volkova@mail.ru",
    channels: ["Мессенджеры"],
    totalSpent: 1200,
    ordersCount: 1,
    magnetsCollected: [
      { id: "m20", breed: "Падук", stars: 2, givenAt: "2026-02-18", orderId: "o15" },
    ],
    uniqueBreeds: 1,
    status: "active",
    createdAt: "2026-02-18",
    notes: "Новый клиент",
  },
];

export const DEMO_ORDERS: Order[] = [
  { id: "o1", clientId: "c1", clientName: "Алексей Петров", amount: 2500, channel: "Сайт Joywood", date: "2025-12-15", magnetsGiven: [{ id: "m1", breed: "Падук", stars: 2, givenAt: "2025-12-15", orderId: "o1" }], isFirstOrder: true, status: "completed" },
  { id: "o2", clientId: "c1", clientName: "Алексей Петров", amount: 2800, channel: "Ozon", date: "2026-01-10", magnetsGiven: [{ id: "m2", breed: "Дуб", stars: 1, givenAt: "2026-01-10", orderId: "o2" }, { id: "m3", breed: "Ясень", stars: 1, givenAt: "2026-01-10", orderId: "o2" }], isFirstOrder: false, status: "completed" },
  { id: "o3", clientId: "c1", clientName: "Алексей Петров", amount: 3500, channel: "Сайт Joywood", date: "2026-01-25", magnetsGiven: [{ id: "m4", breed: "Орех", stars: 2, givenAt: "2026-01-25", orderId: "o3" }], isFirstOrder: false, status: "completed" },
  { id: "o4", clientId: "c1", clientName: "Алексей Петров", amount: 7500, channel: "Сайт Joywood", date: "2026-02-05", magnetsGiven: [{ id: "m5", breed: "Венге", stars: 3, givenAt: "2026-02-05", orderId: "o4" }], isFirstOrder: false, status: "completed" },
  { id: "o5", clientId: "c1", clientName: "Алексей Петров", amount: 2200, channel: "Ozon", date: "2026-02-15", magnetsGiven: [{ id: "m6", breed: "Клён", stars: 1, givenAt: "2026-02-15", orderId: "o5" }], isFirstOrder: false, status: "completed" },
  { id: "o6", clientId: "c2", clientName: "Мария Сидорова", amount: 1800, channel: "Avito", date: "2026-01-20", magnetsGiven: [{ id: "m7", breed: "Падук", stars: 2, givenAt: "2026-01-20", orderId: "o6" }], isFirstOrder: true, status: "completed" },
  { id: "o7", clientId: "c2", clientName: "Мария Сидорова", amount: 2400, channel: "Avito", date: "2026-02-01", magnetsGiven: [{ id: "m8", breed: "Берёза", stars: 1, givenAt: "2026-02-01", orderId: "o7" }, { id: "m9", breed: "Сосна", stars: 1, givenAt: "2026-02-01", orderId: "o7" }], isFirstOrder: false, status: "completed" },
  { id: "o8", clientId: "c3", clientName: "Дмитрий Козлов", amount: 5000, channel: "Сайт Joywood", date: "2025-11-01", magnetsGiven: [{ id: "m10", breed: "Падук", stars: 2, givenAt: "2025-11-01", orderId: "o8" }], isFirstOrder: true, status: "completed" },
  { id: "o9", clientId: "c3", clientName: "Дмитрий Козлов", amount: 2200, channel: "Очно", date: "2025-11-20", magnetsGiven: [{ id: "m11", breed: "Дуб", stars: 1, givenAt: "2025-11-20", orderId: "o9" }, { id: "m12", breed: "Бук", stars: 1, givenAt: "2025-11-20", orderId: "o9" }], isFirstOrder: false, status: "completed" },
  { id: "o10", clientId: "c3", clientName: "Дмитрий Козлов", amount: 8500, channel: "Сайт Joywood", date: "2025-12-10", magnetsGiven: [{ id: "m13", breed: "Тик", stars: 3, givenAt: "2025-12-10", orderId: "o10" }], isFirstOrder: false, status: "completed" },
  { id: "o11", clientId: "c3", clientName: "Дмитрий Козлов", amount: 4500, channel: "Очно", date: "2026-01-05", magnetsGiven: [{ id: "m14", breed: "Орех", stars: 2, givenAt: "2026-01-05", orderId: "o11" }, { id: "m15", breed: "Зебрано", stars: 2, givenAt: "2026-01-05", orderId: "o11" }], isFirstOrder: false, status: "completed" },
  { id: "o15", clientId: "c4", clientName: "Елена Волкова", amount: 1200, channel: "Мессенджеры", date: "2026-02-18", magnetsGiven: [{ id: "m20", breed: "Падук", stars: 2, givenAt: "2026-02-18", orderId: "o15" }], isFirstOrder: true, status: "completed" },
];

export function getMagnetRecommendation(
  amount: number,
  isFirstOrder: boolean,
  totalSpent: number
): string {
  if (isFirstOrder) {
    return "1× Падук ⭐⭐ (первый заказ)";
  }

  const has3StarAccess = totalSpent >= 10000;

  if (amount >= 10000 && has3StarAccess) {
    return "Гарантированно 1 магнит ⭐⭐⭐";
  }

  if (amount > 7000) {
    if (has3StarAccess) {
      return "На выбор: 1× ⭐⭐⭐ / 2× ⭐⭐ / 3× ⭐";
    }
    return "2× ⭐⭐ или 3× ⭐ (нет доступа к ⭐⭐⭐, сумма заказов < 10 000 ₽)";
  }

  if (amount > 3000) {
    return "На выбор: 2× ⭐ или 1× ⭐⭐";
  }

  if (amount >= 1500) {
    return "2× ⭐";
  }

  return "1× ⭐";
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
