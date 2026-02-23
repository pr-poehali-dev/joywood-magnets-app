import { useEffect, useRef, useState } from "react";
import { getRaccoonLevel } from "@/lib/raccoon";
import { RaccoonData } from "./types";

interface Props {
  raccoon: RaccoonData;
  animateXp?: boolean;
  // Уровень для которого показываем видео (null = не показывать)
  videoLevel?: number | null;
  onVideoEnd?: () => void;
}

const CollectionRaccoon = ({ raccoon, animateXp, videoLevel, onVideoEnd }: Props) => {
  // Пока видео играет — показываем фото уровня до повышения
  // После окончания видео переключаемся на текущий уровень raccoon.level
  const [photoLevel, setPhotoLevel] = useState<number>(raccoon.level);

  useEffect(() => {
    if (videoLevel != null) {
      setPhotoLevel(videoLevel > 1 ? videoLevel - 1 : videoLevel);
    } else {
      setPhotoLevel(raccoon.level);
    }
  }, [videoLevel, raccoon.level]);

  const raccoonLevel = getRaccoonLevel(photoLevel);
  // Видео читаем по videoLevel, а не по raccoon.level
  const videoLevelData = videoLevel != null ? getRaccoonLevel(videoLevel) : null;
  const videoUrl = videoLevelData?.videoUrl || null;

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
  const [videoReady, setVideoReady] = useState(false);

  // XP анимация
  const triggerXpAnim = (fromPct: number) => {
    setAnimating(false);
    setDisplayPct(fromPct);
    setXpGlow(true);
    const t1 = setTimeout(() => { setAnimating(true); setDisplayPct(targetPct); }, 50);
    const t2 = setTimeout(() => setXpGlow(false), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  };

  useEffect(() => {
    const xpChanged = raccoon.xp !== prevXpRef.current;
    prevXpRef.current = raccoon.xp;
    const fromPct = prevTargetPctRef.current;
    prevTargetPctRef.current = targetPct;

    if (!xpChanged && !animateXp) {
      setAnimating(false); setDisplayPct(targetPct); return;
    }
    const card = cardRef.current;
    if (!card) { triggerXpAnim(fromPct); return; }
    const rect = card.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;
    if (inView) { triggerXpAnim(fromPct); return; }
    pendingAnimRef.current = true;
    const savedFrom = fromPct;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && pendingAnimRef.current) {
        pendingAnimRef.current = false;
        observer.disconnect();
        triggerXpAnim(savedFrom);
      }
    }, { threshold: 0.5 });
    observer.observe(card);
    return () => observer.disconnect();
  }, [raccoon.xp, targetPct, animateXp]);

  // Управление видео
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;

    if (videoLevel == null) {
      vid.pause();
      vid.currentTime = 0;
      setVideoReady(false);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      return;
    }

    // Загружаем видео
    setVideoReady(false);
    vid.load();

    const finish = () => {
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      onVideoEnd?.();
    };

    const onCanPlay = () => {
      setVideoReady(true);
      vid.play().catch(finish);
      fallbackRef.current = setTimeout(finish, 60000);
    };

    vid.addEventListener("ended", finish, { once: true });
    vid.addEventListener("canplay", onCanPlay, { once: true });

    return () => {
      vid.removeEventListener("ended", finish);
      vid.removeEventListener("canplay", onCanPlay);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [videoLevel, videoUrl]);

  const showVideo = videoLevel != null && videoUrl;

  return (
    <div
      ref={cardRef}
      data-raccoon-card
      className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden flex flex-col"
    >
      <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
        {/* Фото текущего уровня */}
        {raccoonLevel.photoUrl ? (
          <img src={raccoonLevel.photoUrl} alt={raccoonLevel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-amber-100 flex items-center justify-center">
            <span className="text-7xl">🦝</span>
          </div>
        )}

        {/* Видео поверх — монтируется только когда есть URL */}
        {showVideo && (
          <>
            {/* Спиннер пока видео грузится */}
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <video
              ref={videoRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              style={{ opacity: videoReady ? 1 : 0, transition: "opacity 0.3s" }}
            />
          </>
        )}

        {/* Бейдж уровня */}
        {!showVideo && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
            Ур.{raccoon.level}
          </div>
        )}
      </div>

      <div className="px-3 py-3 space-y-2">
        <div className="font-bold text-amber-900 text-sm leading-tight">{raccoon.level_name}</div>
        <div>
          <div className="flex justify-between text-[11px] text-amber-700 mb-1">
            <span className="transition-all duration-300" style={xpGlow ? { color: "#d97706", fontWeight: 700 } : {}}>
              {raccoon.xp} XP
            </span>
            {raccoon.is_max_level ? (
              <span className="text-amber-500 font-semibold">Макс. уровень!</span>
            ) : (
              <span>{raccoon.xp_for_level}/{raccoon.xp_needed}</span>
            )}
          </div>
          <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden" style={xpGlow ? { boxShadow: "0 0 8px 2px #fbbf24aa" } : {}}>
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${displayPct}%`, transition: animating ? "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)" : "none" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionRaccoon;