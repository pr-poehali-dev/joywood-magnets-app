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
  // Читаем ассеты в useEffect чтобы гарантированно получить актуальные данные
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [levelName, setLevelName] = useState<string>("");
  const [assetsReady, setAssetsReady] = useState(false);

  // phase: "loading" → "video" → "reveal" → "done"
  const [phase, setPhase] = useState<"loading" | "video" | "reveal" | "done">("loading");
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Шаг 1: загружаем ассеты, потом решаем фазу
  useEffect(() => {
    const data = getRaccoonLevel(newLevel);
    setVideoUrl(data.videoUrl || null);
    setPhotoUrl(data.photoUrl || "");
    setLevelName(data.name || "");
    setAssetsReady(true);
  }, [newLevel]);

  // Шаг 2: как только ассеты готовы — переходим в video или reveal
  useEffect(() => {
    if (!assetsReady) return;
    if (videoUrl) {
      setPhase("video");
    } else {
      setPhase("reveal");
    }
  }, [assetsReady, videoUrl]);

  // Шаг 3: когда phase стало "video" — ждём буферизации, потом запускаем
  useEffect(() => {
    if (phase !== "video") return;
    const vid = videoRef.current;
    if (!vid) return;

    const goReveal = () => {
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      setPhase("reveal");
    };

    const tryPlay = () => {
      vid.play().catch(goReveal);
    };

    vid.addEventListener("ended", goReveal);
    // Fallback если видео не загрузилось за 20 сек
    fallbackRef.current = setTimeout(goReveal, 20000);

    // Ждём достаточного буфера перед воспроизведением
    if (vid.readyState >= 3) {
      tryPlay();
    } else {
      vid.addEventListener("canplay", tryPlay, { once: true });
    }

    return () => {
      vid.removeEventListener("ended", goReveal);
      vid.removeEventListener("canplay", tryPlay);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [phase]);

  // Шаг 4: reveal → done через 600ms (анимация появления)
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(() => setPhase("done"), 600);
    return () => clearTimeout(t);
  }, [phase]);

  const handleClose = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={phase === "done" ? handleClose : undefined}
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

        {/* Загрузка ассетов */}
        {phase === "loading" && (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Видео — монтируется только когда phase=video */}
        {phase === "video" && videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full"
            playsInline
            preload="auto"
          />
        )}

        {/* Экран результата */}
        {(phase === "reveal" || phase === "done") && (
          <div
            className="p-6 flex flex-col items-center gap-4 text-center"
            style={{ animation: "lvlscale 0.5s ease both" }}
          >
            <div
              className="w-40 overflow-hidden rounded-xl border-4 border-amber-400 bg-amber-50"
              style={{
                aspectRatio: "3/4",
                animation: phase === "done" ? "lvlglow 2s ease infinite" : undefined,
              }}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={levelName}
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
                {newLevel === 1 ? "Добро пожаловать!" : "Новый уровень!"}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                Уровень {newLevel}
              </div>
              <div className="text-lg font-semibold text-amber-700">
                {levelName}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 w-full">
              <div className="text-sm font-medium text-amber-900">
                {newLevel === 1
                  ? "Коллекция началась — каждый новый магнит приносит опыт еноту"
                  : "Теперь доступны новые слоты под магниты"}
              </div>
            </div>

            {phase === "done" && (
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                onClick={handleClose}
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