import { useEffect, useRef, useState } from "react";

interface Props {
  collectedBreeds: Set<string>;
  breedNotes: Record<string, string>;
}

// Собираем все абзацы только от собранных пород
function buildNotes(collectedBreeds: Set<string>, breedNotes: Record<string, string>) {
  return Object.entries(breedNotes)
    .filter(([breed]) => collectedBreeds.has(breed))
    .flatMap(([breed, text]) =>
      text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((para) => ({ breed, para }))
    );
}

// Анимация печатной машинки
const Typewriter = ({ text, onDone }: { text: string; onDone: () => void }) => {
  const [displayed, setDisplayed] = useState("");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    // Скорость: быстрее для длинных текстов
    const speed = text.length > 120 ? 18 : text.length > 60 ? 25 : 35;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        // Пауза перед сменой: 10–20с от длины
        const hold = Math.min(18000, 10000 + Math.floor(text.length / 40) * 1000);
        setTimeout(() => doneRef.current(), hold);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span
          className="inline-block w-0.5 h-3 bg-amber-600 ml-0.5 align-middle"
          style={{ animation: "blink 0.7s step-end infinite" }}
        />
      )}
    </span>
  );
};

const CollectionRaccoonNotes = ({ collectedBreeds, breedNotes }: Props) => {
  const allNotes = buildNotes(collectedBreeds, breedNotes);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "waiting" | "fade">("typing");

  const handleTypingDone = () => {
    setPhase("fade");
    setTimeout(() => {
      setIndex((i) => (i + 1) % allNotes.length);
      setPhase("typing");
    }, 500);
  };

  if (!allNotes.length) return null;

  const current = allNotes[index % allNotes.length];

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-3"
      style={{ opacity: phase === "fade" ? 0 : 1, transition: "opacity 0.4s ease" }}
    >
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      <div className="flex items-start gap-2.5">
        <span className="text-base leading-none mt-0.5 shrink-0">🦝</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-1">
            {current.breed}
          </p>
          <p className="text-[12px] text-amber-900 leading-relaxed">
            {phase !== "fade" && (
              <Typewriter
                key={`${index}-${current.para}`}
                text={current.para}
                onDone={handleTypingDone}
              />
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollectionRaccoonNotes;
