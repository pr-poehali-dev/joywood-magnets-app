import { useEffect, useRef, useState } from "react";
import { getRaccoonLevel } from "@/lib/raccoon";
import { RaccoonData } from "./types";

interface Props {
  raccoon: RaccoonData;
  animateXp?: boolean;
  collectedBreeds?: Set<string>;
  breedNotes?: Record<string, string>;
}

// Блок заметок: показывает абзацы по очереди, каждый — 10-20с в зависимости от длины
const RaccoonNotes = ({
  collectedBreeds,
  breedNotes,
}: {
  collectedBreeds: Set<string>;
  breedNotes: Record<string, string>;
}) => {
  // Собираем все абзацы только от собранных пород
  const allNotes = Object.entries(breedNotes)
    .filter(([breed]) => collectedBreeds.has(breed))
    .flatMap(([breed, text]) =>
      text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((para) => ({ breed, para }))
    );

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!allNotes.length) return;
    const para = allNotes[index % allNotes.length].para;
    // 10s base + 1s per 40 chars, max 20s
    const duration = Math.min(20000, 10000 + Math.floor(para.length / 40) * 1000);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % allNotes.length);
        setVisible(true);
      }, 500);
    }, duration);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [index, allNotes.length]);

  if (!allNotes.length) return null;

  const current = allNotes[index % allNotes.length];

  return (
    <div className="px-3 pb-3">
      <div
        className="bg-white/70 rounded-xl px-3 py-2.5 border border-amber-100"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.5s ease",
          minHeight: "3.5rem",
        }}
      >
        <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-1">
          {current.breed}
        </p>
        <p className="text-[11px] text-amber-900 leading-relaxed">
          {current.para}
        </p>
      </div>
    </div>
  );
};

const CollectionRaccoon = ({ raccoon, animateXp, collectedBreeds, breedNotes }: Props) => {
  const raccoonLevel = getRaccoonLevel(raccoon.level);
  const targetPct = raccoon.is_max_level
    ? 100
    : Math.min(100, Math.round((raccoon.xp_for_level / raccoon.xp_needed) * 100));

  const prevTargetPctRef = useRef(targetPct);
  const [displayPct, setDisplayPct] = useState(targetPct);
  const [animating, setAnimating] = useState(false);
  const [xpGlow, setXpGlow] = useState(false);
  const prevXpRef = useRef(raccoon.xp);

  const hasNotes = !!(collectedBreeds && breedNotes && Object.entries(breedNotes).some(
    ([breed, text]) => collectedBreeds.has(breed) && text.trim()
  ));

  useEffect(() => {
    if (raccoon.xp !== prevXpRef.current || animateXp) {
      prevXpRef.current = raccoon.xp;
      const fromPct = prevTargetPctRef.current;
      prevTargetPctRef.current = targetPct;
      setAnimating(false);
      setDisplayPct(fromPct);
      setXpGlow(true);
      const t1 = setTimeout(() => {
        setAnimating(true);
        setDisplayPct(targetPct);
      }, 50);
      const t2 = setTimeout(() => setXpGlow(false), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      prevTargetPctRef.current = targetPct;
      setAnimating(false);
      setDisplayPct(targetPct);
    }
  }, [raccoon.xp, targetPct, animateXp]);

  return (
    <div className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden flex flex-col">
      {/* Заметки енота — показываются только когда есть заметки */}
      {hasNotes && collectedBreeds && breedNotes && (
        <RaccoonNotes collectedBreeds={collectedBreeds} breedNotes={breedNotes} />
      )}

      {/* Фото 3:4 */}
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
        {/* Бейдж уровня */}
        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
          Ур.{raccoon.level}
        </div>
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
