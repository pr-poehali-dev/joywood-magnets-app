import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface Props {
  breed: string;
  photoUrl?: string;
  stars: number;
  category: string;
  onClose: () => void;
}

const STAR_LABELS: Record<number, string> = { 1: "⭐", 2: "⭐⭐", 3: "⭐⭐⭐" };
const STAR_NAMES: Record<number, string> = { 1: "Обычный", 2: "Особенный", 3: "Элитный" };

const Particle = ({ index }: { index: number }) => {
  const colors = ["bg-amber-400", "bg-orange-400", "bg-yellow-300", "bg-green-400", "bg-emerald-400", "bg-red-400", "bg-pink-400"];
  const color = colors[index % colors.length];
  const left = 20 + (index * 17) % 60;
  const delay = (index * 80) % 600;
  const size = index % 2 === 0 ? "w-2 h-2" : "w-3 h-1.5";
  return (
    <div
      className={`absolute ${size} ${color} rounded-sm animate-bounce`}
      style={{
        left: `${left}%`,
        top: "-10px",
        animationDelay: `${delay}ms`,
        animationDuration: `${600 + (index * 100) % 400}ms`,
        transform: `rotate(${index * 37}deg)`,
      }}
    />
  );
};

export default function MagnetRevealModal({ breed, photoUrl, stars, category, onClose }: Props) {
  const [phase, setPhase] = useState<"box" | "rising" | "revealed" | "done">("box");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("rising"), 400);
    const t2 = setTimeout(() => setPhase("revealed"), 1200);
    const t3 = setTimeout(() => setPhase("done"), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={phase === "done" ? onClose : undefined}
    >
      {/* Конфетти */}
      {phase !== "box" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => (
            <Particle key={i} index={i} />
          ))}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-6 px-6">
        {/* Сцена с коробкой и магнитом */}
        <div className="relative flex flex-col items-center" style={{ height: 280 }}>

          {/* Магнит — вылетает из коробки */}
          <div
            className="absolute transition-all"
            style={{
              bottom: phase === "box" ? 60 : phase === "rising" ? 160 : 180,
              opacity: phase === "box" ? 0 : 1,
              transform: phase === "box"
                ? "scale(0.5) rotate(-8deg)"
                : phase === "rising"
                ? "scale(1.05) rotate(2deg)"
                : "scale(1) rotate(0deg)",
              transitionDuration: phase === "rising" ? "700ms" : "400ms",
              transitionTimingFunction: phase === "rising" ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "ease-out",
              zIndex: 10,
            }}
          >
            <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/80 ring-4 ring-amber-300/60">
              {photoUrl ? (
                <img src={photoUrl} alt={breed} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-amber-100 flex items-center justify-center text-5xl">🪵</div>
              )}
            </div>
            {/* Блеск */}
            {phase !== "box" && (
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/90 animate-ping" />
            )}
          </div>

          {/* Крышка коробки */}
          <div
            className="absolute transition-all"
            style={{
              bottom: 68,
              zIndex: phase === "box" ? 20 : 5,
              transform: phase === "box"
                ? "rotateX(0deg) translateY(0px)"
                : "rotateX(-60deg) translateY(-40px)",
              transformOrigin: "bottom center",
              transitionDuration: "500ms",
              transitionTimingFunction: "ease-in-out",
            }}
          >
            <div className="w-36 h-12 bg-amber-600 rounded-t-lg shadow-lg flex items-center justify-center border-b-2 border-amber-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-400/40 to-transparent" />
              <span className="text-white text-xs font-bold tracking-widest z-10">JOYWOOD</span>
            </div>
          </div>

          {/* Тело коробки */}
          <div className="absolute bottom-0 w-36 h-20 bg-amber-500 rounded-b-lg shadow-xl border-t border-amber-600 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-400/30 to-amber-700/30" />
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
              <div className="w-8 h-1 bg-amber-700/40 rounded-full" />
            </div>
          </div>
        </div>

        {/* Текст результата */}
        <div
          className="text-center space-y-2 transition-all duration-500"
          style={{
            opacity: phase === "done" ? 1 : phase === "revealed" ? 0.8 : 0,
            transform: phase === "done" ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <p className="text-white/70 text-sm font-medium uppercase tracking-widest">Новая порода в коллекции!</p>
          <p className="text-white text-3xl font-bold drop-shadow-lg">{breed}</p>
          <p className="text-amber-300 text-lg">{STAR_LABELS[stars]} {STAR_NAMES[stars]}</p>
          <p className="text-white/60 text-sm">{category}</p>
        </div>

        {/* Кнопка */}
        {phase === "done" && (
          <Button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-white font-semibold px-8 animate-in fade-in duration-300 shadow-lg shadow-amber-500/30"
          >
            <Icon name="Sparkles" size={16} className="mr-2" />
            Посмотреть коллекцию
          </Button>
        )}
      </div>
    </div>
  );
}
