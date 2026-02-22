export interface RaccoonLevel {
  level: number;
  name: string;
  xpMin: number;
  emptySlots: number;
  photoUrl: string;
  videoUrl: string;
}

// URL фото и видео енотов — заменить на реальные после загрузки через /admin
export const RACCOON_LEVELS: RaccoonLevel[] = [
  {
    level: 1,
    name: "Сборщик щепы",
    xpMin: 0,
    emptySlots: 3,
    photoUrl: "",
    videoUrl: "",
  },
  {
    level: 2,
    name: "Сортировщик пород",
    xpMin: 50,
    emptySlots: 5,
    photoUrl: "",
    videoUrl: "",
  },
  {
    level: 3,
    name: "Шлифовщик",
    xpMin: 200,
    emptySlots: 7,
    photoUrl: "",
    videoUrl: "",
  },
  {
    level: 4,
    name: "Столяр на опыте",
    xpMin: 450,
    emptySlots: 10,
    photoUrl: "",
    videoUrl: "",
  },
  {
    level: 5,
    name: "Хранитель секретов",
    xpMin: 800,
    emptySlots: 12,
    photoUrl: "",
    videoUrl: "",
  },
  {
    level: 6,
    name: "Резчик по легендам",
    xpMin: 1000,
    emptySlots: 15,
    photoUrl: "",
    videoUrl: "",
  },
];

export const getRaccoonLevel = (level: number): RaccoonLevel =>
  RACCOON_LEVELS.find((l) => l.level === level) ?? RACCOON_LEVELS[0];

export const XP_BY_STARS: Record<number, number> = { 1: 10, 2: 25, 3: 50 };
