import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getRaccoonLevel } from "@/lib/raccoon";

interface Props {
  newLevel: number;
  onClose: () => void;
}

const Particle = ({ index }: { index: number }) => {
  const colors = [
    "bg-amber-400", "bg-orange-400", "bg-yellow-300",
    "bg-green-400", "bg-emerald-400", "bg-teal-400", "bg-lime-400",
  ];
  const color = colors[index % colors.length];
  const left = 5 + (index * 11) % 90;
  const delay = (index * 130) % 900;
  const size = index % 3 === 0 ? "w-3 h-3" : index % 3 === 1 ? "w-2 h-4" : "w-4 h-2";
  return (
    <div
      className={`absolute ${size} ${color} rounded-sm`}
      style={{
        left: `${left}%`,
        top: `${3 + (index * 9) % 25}%`,
        animationDelay: `${delay}ms`,
        animationDuration: `${1000 + (index * 130) % 700}ms`,
        transform: `rotate(${index * 47}deg)`,
        animation: `lvlfall ${1000 + (index * 130) % 700}ms ${delay}ms ease-in infinite`,
      }}
    />
  );
};

export default function LevelUpModal({ newLevel, onClose }: Props) {
  const levelData = getRaccoonLevel(newLevel);
  const prevLevelData = getRaccoonLevel(newLevel - 1);
  const [phase, setPhase] = useState<"video" | "reveal" | "done">("video");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (levelData.videoUrl) {
      // Видео есть — ждём его конца, потом переходим в reveal
      const vid = videoRef.current;
      if (!vid) return;
      const onEnd = () => setPhase("reveal");
      vid.addEventListener("ended", onEnd);
      vid.play().catch(() => setPhase("reveal"));
      const fallback = setTimeout(() => setPhase("reveal"), 8000);
      return () => {
        vid.removeEventListener("ended", onEnd);
        clearTimeout(fallback);
      };
    } else {
      // Видео нет — сразу показываем reveal
      setPhase("reveal");
    }
  }, [levelData.videoUrl]);

  useEffect(() => {
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("done"), 600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={phase === "done" ? onClose : undefined}
    >
      <style>{`
        @keyframes lvlfall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes lvlscale {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes lvlglow {
          0%, 100% { box-shadow: 0 0 20px 4px #fbbf24aa; }
          50%       { box-shadow: 0 0 40px 12px #fbbf24dd; }
        }
      `}</style>

      {/* Конфетти */}
      {phase === "done" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => <Particle key={i} index={i} />)}
        </div>
      )}

      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white overflow-hidden shadow-2xl">

        {/* Видео повышения уровня */}
        {phase === "video" && levelData.videoUrl && (
          <video
            ref={videoRef}
            src={levelData.videoUrl}
            className="w-full"
            autoPlay
            muted={false}
            playsInline
          />
        )}

        {/* Экран результата */}
        {(phase === "reveal" || phase === "done") && (
          <div
            className="p-6 flex flex-col items-center gap-4 text-center"
            style={{ animation: "lvlscale 0.5s ease both" }}
          >
            {/* Фото Енота нового уровня 3:4 */}
            <div
              className="w-40 overflow-hidden rounded-xl border-4 border-amber-400 bg-amber-50"
              style={{
                aspectRatio: "3/4",
                animation: phase === "done" ? "lvlglow 2s ease infinite" : undefined,
              }}
            >
              {levelData.photoUrl ? (
                <img
                  src={levelData.photoUrl}
                  alt={levelData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">🦝</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-amber-500 uppercase tracking-widest">
                Новый уровень!
              </div>
              <div className="text-2xl font-bold text-gray-900">
                Уровень {newLevel}
              </div>
              <div className="text-lg font-semibold text-amber-700">
                {levelData.name}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 w-full">
              <div className="text-sm font-medium text-amber-900">
                Открыто {levelData.emptySlots} новых слотов
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                Было {prevLevelData.emptySlots} → стало {levelData.emptySlots}
              </div>
            </div>

            {phase === "done" && (
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                onClick={onClose}
              >
                Отлично!
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}