import { useEffect, useRef, useState } from "react";
import { getRaccoonLevel } from "@/lib/raccoon";
import { RaccoonData } from "./types";

interface Props {
  raccoon: RaccoonData;
  animateXp?: boolean;
  playVideo?: boolean;
  onVideoEnd?: () => void;
}

const CollectionRaccoon = ({ raccoon, animateXp, playVideo, onVideoEnd }: Props) => {
  const raccoonLevel = getRaccoonLevel(raccoon.level);
  const targetPct = raccoon.is_max_level
    ? 100
    : Math.min(100, Math.round((raccoon.xp_for_level / raccoon.xp_needed) * 100));

  const prevTargetPctRef = useRef(targetPct);
  const [displayPct, setDisplayPct] = useState(targetPct);
  const [animating, setAnimating] = useState(false);
  const [xpGlow, setXpGlow] = useState(false);
  const prevXpRef = useRef(raccoon.xp);
  const cardRef = useRef<HTMLDivElement>(null);
  const pendingAnimRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerXpAnim = (fromPct: number) => {
    setAnimating(false);
    setDisplayPct(fromPct);
    setXpGlow(true);
    const t1 = setTimeout(() => {
      setAnimating(true);
      setDisplayPct(targetPct);
    }, 50);
    const t2 = setTimeout(() => setXpGlow(false), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  };

  useEffect(() => {
    const xpChanged = raccoon.xp !== prevXpRef.current;
    prevXpRef.current = raccoon.xp;
    const fromPct = prevTargetPctRef.current;
    prevTargetPctRef.current = targetPct;

    if (!xpChanged && !animateXp) {
      setAnimating(false);
      setDisplayPct(targetPct);
      return;
    }

    const card = cardRef.current;
    if (!card) { triggerXpAnim(fromPct); return; }

    const rect = card.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;

    if (inView) { triggerXpAnim(fromPct); return; }

    pendingAnimRef.current = true;
    const savedFrom = fromPct;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && pendingAnimRef.current) {
          pendingAnimRef.current = false;
          observer.disconnect();
          triggerXpAnim(savedFrom);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [raccoon.xp, targetPct, animateXp]);

  // Запуск/остановка видео
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (!playVideo) {
      vid.pause();
      vid.currentTime = 0;
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      return;
    }

    const finish = () => {
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      onVideoEnd?.();
    };

    vid.addEventListener("ended", finish, { once: true });
    fallbackRef.current = setTimeout(finish, 30000);

    const tryPlay = () => vid.play().catch(finish);
    if (vid.readyState >= 3) {
      tryPlay();
    } else {
      vid.addEventListener("canplay", tryPlay, { once: true });
    }

    return () => {
      vid.removeEventListener("ended", finish);
      vid.removeEventListener("canplay", tryPlay);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [playVideo]);

  const videoUrl = raccoonLevel.videoUrl || null;

  return (
    <div
      ref={cardRef}
      data-raccoon-card
      className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Фото 3:4 + видео поверх */}
      <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
        {raccoonLevel.photoUrl ? (
          <img
            src={raccoonLevel.photoUrl}
            alt={raccoonLevel.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-amber-100 flex items-center justify-center">
            <span className="text-7xl">🦝</span>
          </div>
        )}

        {/* Видео поверх фото — всегда в DOM для preload, видимо только при playVideo */}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            preload="auto"
            style={{
              opacity: playVideo ? 1 : 0,
              transition: "opacity 0.3s",
              pointerEvents: playVideo ? "auto" : "none",
            }}
          />
        )}

        {/* Бейдж уровня — скрываем во время видео */}
        {!playVideo && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
            Ур.{raccoon.level}
          </div>
        )}

        {/* Кнопка пропустить видео */}
        {playVideo && videoUrl && (
          <button
            className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full"
            onClick={onVideoEnd}
          >
            Пропустить
          </button>
        )}
      </div>

      {/* Информация */}
      <div className="px-3 py-3 space-y-2">
        <div className="font-bold text-amber-900 text-sm leading-tight">{raccoon.level_name}</div>
        <div>
          <div className="flex justify-between text-[11px] text-amber-700 mb-1">
            <span
              className="transition-all duration-300"
              style={xpGlow ? { color: "#d97706", fontWeight: 700 } : {}}
            >
              {raccoon.xp} XP
            </span>
            {raccoon.is_max_level ? (
              <span className="text-amber-500 font-semibold">Макс. уровень!</span>
            ) : (
              <span>{raccoon.xp_for_level}/{raccoon.xp_needed}</span>
            )}
          </div>
          <div
            className="h-1.5 bg-amber-200 rounded-full overflow-hidden"
            style={xpGlow ? { boxShadow: "0 0 8px 2px #fbbf24aa" } : {}}
          >
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{
                width: `${displayPct}%`,
                transition: animating ? "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionRaccoon;
