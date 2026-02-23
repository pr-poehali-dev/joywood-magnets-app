import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface Props {
  breed: string;
  photoUrl?: string;
  stars: number;
  category: string;
  onClose: () => void;
  onMagnetClick?: () => void;
}

const STAR_LABELS: Record<number, string> = { 1: "⭐", 2: "⭐⭐", 3: "⭐⭐⭐" };
const STAR_NAMES: Record<number, string> = { 1: "Обычный", 2: "Особенный", 3: "Элитный" };

const Particle = ({ index }: { index: number }) => {
  const colors = ["bg-amber-400", "bg-orange-400", "bg-yellow-300", "bg-green-400", "bg-emerald-400", "bg-red-400", "bg-pink-400"];
  const color = colors[index % colors.length];
  const left = 10 + (index * 13) % 80;
  const delay = (index * 120) % 800;
  const size = index % 3 === 0 ? "w-3 h-3" : index % 3 === 1 ? "w-2 h-4" : "w-4 h-2";
  return (
    <div
      className={`absolute ${size} ${color} rounded-sm`}
      style={{
        left: `${left}%`,
        top: `${5 + (index * 7) % 30}%`,
        animationDelay: `${delay}ms`,
        animationDuration: `${900 + (index * 150) % 600}ms`,
        transform: `rotate(${index * 43}deg)`,
        animation: `fall ${900 + (index * 150) % 600}ms ${delay}ms ease-in infinite`,
      }}
    />
  );
};

export default function MagnetRevealModal({ breed, photoUrl, stars, category, onClose, onMagnetClick }: Props) {
  const [phase, setPhase] = useState<"box" | "opening" | "rising" | "revealed" | "done">("box");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("opening"), 600);
    const t2 = setTimeout(() => setPhase("rising"), 1400);
    const t3 = setTimeout(() => setPhase("revealed"), 2400);
    const t4 = setTimeout(() => setPhase("done"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={phase === "done" ? onClose : undefined}
    >
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes lidFlip {
          0% { transform: perspective(400px) rotateX(0deg) translateY(0px); }
          100% { transform: perspective(400px) rotateX(-130deg) translateY(-10px); }
        }
        @keyframes magnetRise {
          0% { transform: translateY(0px) scale(0.8) rotate(-3deg); opacity: 0.3; }
          60% { transform: translateY(-130px) scale(1.08) rotate(2deg); opacity: 1; }
          80% { transform: translateY(-120px) scale(0.98) rotate(-1deg); }
          100% { transform: translateY(-125px) scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {/* Конфетти */}
      {(phase === "rising" || phase === "revealed" || phase === "done") && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 22 }).map((_, i) => <Particle key={i} index={i} />)}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-8 px-6">
        {/* Сцена */}
        <div className="relative flex flex-col items-center" style={{ height: 320, width: 200 }}>

          {/* Магнит */}
          <div
            className="absolute"
            style={{
              bottom: 88,
              left: "50%",
              marginLeft: -64,
              zIndex: 10,
              animation: phase === "rising" || phase === "revealed" || phase === "done"
                ? "magnetRise 1000ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards"
                : undefined,
              opacity: phase === "box" || phase === "opening" ? 0 : 1,
              transition: "opacity 0.3s",
              cursor: (phase === "revealed" || phase === "done") && onMagnetClick ? "pointer" : "default",
            }}
            onClick={(phase === "revealed" || phase === "done") ? () => { (onMagnetClick ?? onClose)(); } : undefined}
            title={undefined}
          >
            <div className={`w-32 h-32 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/90 ring-4 ring-amber-300/70 transition-transform ${(phase === "revealed" || phase === "done") && onMagnetClick ? "hover:scale-105 active:scale-95" : ""}`}>
              {photoUrl ? (
                <img src={photoUrl} alt={breed} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-amber-100 flex items-center justify-center text-5xl">🪵</div>
              )}
            </div>
            {(phase === "revealed" || phase === "done") && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white animate-ping opacity-75" />
            )}

          </div>

          {/* Крышка коробки */}
          <div
            className="absolute"
            style={{
              bottom: 168,
              left: "50%",
              marginLeft: -84,
              zIndex: phase === "box" || phase === "opening" ? 20 : 4,
              transformOrigin: "bottom center",
              animation: phase !== "box"
                ? "lidFlip 800ms cubic-bezier(0.4, 0, 0.2, 1) forwards"
                : undefined,
            }}
          >
            {/* Крышка — картонный вид */}
            <div className="relative w-[168px] h-[44px]">
              {/* Основа крышки */}
              <div className="absolute inset-0 rounded-t-md overflow-hidden"
                style={{ background: "linear-gradient(180deg, #c8853a 0%, #a0612a 60%, #8a5022 100%)" }}>
                {/* Текстура гофрокартона — горизонтальные линии */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="absolute w-full" style={{ top: i * 8 + 3, height: 1, background: "rgba(0,0,0,0.12)" }} />
                ))}
                {/* Логотип */}
                <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                  <span className="text-white/90 text-[11px] font-black tracking-[0.2em] drop-shadow">JOYWOOD</span>
                </div>
                {/* Боковые тени для объёма */}
                <div className="absolute inset-y-0 left-0 w-3" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.2), transparent)" }} />
                <div className="absolute inset-y-0 right-0 w-3" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.2), transparent)" }} />
              </div>
              {/* Клапан сверху */}
              <div className="absolute -top-3 left-6 right-6 h-4 rounded-t-sm"
                style={{ background: "linear-gradient(180deg, #b87530 0%, #a0612a 100%)" }} />
            </div>
          </div>

          {/* Тело коробки */}
          <div
            className="absolute bottom-0"
            style={{ left: "50%", marginLeft: -84, width: 168, height: 175 }}
          >
            {/* Передняя грань */}
            <div className="absolute inset-0 rounded-b-md overflow-hidden"
              style={{ background: "linear-gradient(180deg, #b87530 0%, #9a5f28 50%, #7a4a1e 100%)" }}>
              {/* Текстура — горизонтальные линии гофры */}
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="absolute w-full" style={{ top: i * 9 + 4, height: 1, background: "rgba(0,0,0,0.1)" }} />
              ))}
              {/* Вертикальные рёбра */}
              <div className="absolute inset-y-0 left-0 w-4" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.25), transparent)" }} />
              <div className="absolute inset-y-0 right-0 w-4" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.25), transparent)" }} />
              {/* Логотип на передней панели */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4">
                <div className="border border-amber-300/40 rounded px-3 py-1.5 flex flex-col items-center gap-0.5">
                  <span className="text-amber-100/90 text-[13px] font-black tracking-[0.18em]">JOYWOOD</span>
                  <span className="text-amber-200/60 text-[8px] tracking-widest font-medium">MAGNETS</span>
                </div>
              </div>
              {/* Низ чуть темнее */}
              <div className="absolute bottom-0 left-0 right-0 h-8"
                style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.2), transparent)" }} />
            </div>
          </div>
        </div>

        {/* Текст */}
        <div
          className="text-center space-y-2 transition-all duration-700"
          style={{
            opacity: phase === "done" ? 1 : phase === "revealed" ? 0.9 : 0,
            transform: phase === "done" ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <p className="text-amber-300/80 text-xs font-semibold uppercase tracking-widest">Новая порода в коллекции!</p>
          <p className="text-white text-3xl font-black drop-shadow-lg">{breed}</p>
          <p className="text-amber-300 text-base">{STAR_LABELS[stars]} {STAR_NAMES[stars]}</p>
          <p className="text-white/50 text-sm">{category}</p>
        </div>

        {phase === "done" && (
          <Button
            onClick={() => { (onMagnetClick ?? onClose)(); }}
            className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 animate-in fade-in duration-500 shadow-xl shadow-amber-600/40"
          >
            <Icon name="Sparkles" size={16} className="mr-2" />
            Посмотреть коллекцию
          </Button>
        )}
      </div>
    </div>
  );
}