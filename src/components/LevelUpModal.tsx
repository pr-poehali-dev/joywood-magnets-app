import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getRaccoonLevel } from "@/lib/raccoon";

interface Props {
  newLevel: number;
  onClose: () => void;
}

export default function LevelUpModal({ newLevel, onClose }: Props) {
  const levelData = getRaccoonLevel(newLevel);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 pointer-events-none">
      <style>{`
        @keyframes lvlslide {
          0%   { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {ready && (
        <div
          className="relative mx-4 w-full max-w-sm bg-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4 pointer-events-auto"
          style={{ animation: "lvlslide 0.4s ease both" }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest">
              {newLevel === 1 ? "Добро пожаловать!" : "Новый уровень!"}
            </div>
            <div className="font-bold text-gray-900 text-base leading-tight">
              Уровень {newLevel} — {levelData.name}
            </div>
            <div className="text-xs text-amber-700 mt-0.5">
              {newLevel === 1
                ? "Каждый магнит приносит опыт еноту"
                : "Новые слоты под магниты открыты"}
            </div>
          </div>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shrink-0"
            onClick={onClose}
          >
            Отлично!
          </Button>
        </div>
      )}
    </div>
  );
}