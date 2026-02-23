import { useEffect, useRef, useState } from "react";

interface Props {
  collectedBreeds: Set<string>;
  breedNotes: Record<string, string>;
  className?: string;
}

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

// Выделяет название породы жирным прямо в тексте
function highlightBreed(text: string, breed: string) {
  const escaped = breed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === breed.toLowerCase()
      ? <strong key={i} className="font-bold text-amber-800">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

// Анимация печатной машинки — посимвольно, без знания о тегах
const Typewriter = ({
  text,
  breed,
  onDone,
}: {
  text: string;
  breed: string;
  onDone: () => void;
}) => {
  const [charCount, setCharCount] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setCharCount(0);
    let i = 0;
    const speed = text.length > 120 ? 16 : text.length > 60 ? 22 : 30;
    const interval = setInterval(() => {
      i++;
      setCharCount(i);
      if (i >= text.length) {
        clearInterval(interval);
        const hold = Math.min(18000, 10000 + Math.floor(text.length / 40) * 1000);
        setTimeout(() => doneRef.current(), hold);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  const displayed = text.slice(0, charCount);
  const done = charCount >= text.length;

  return (
    <>
      {highlightBreed(displayed, breed)}
      {!done && (
        <span
          className="inline-block w-0.5 h-[1em] bg-amber-500 ml-0.5 align-middle"
          style={{ animation: "blink 0.7s step-end infinite" }}
        />
      )}
    </>
  );
};

const CollectionRaccoonNotes = ({ collectedBreeds, breedNotes, className = "" }: Props) => {
  const allNotes = buildNotes(collectedBreeds, breedNotes);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "fade">("typing");

  const handleDone = () => {
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
      className={`flex flex-col h-full rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50 overflow-hidden ${className}`}
      style={{ opacity: phase === "fade" ? 0 : 1, transition: "opacity 0.45s ease" }}
    >
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      {/* Иконка енота сверху */}
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-1.5 shrink-0">
        <span className="text-sm leading-none">🦝</span>
        <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Заметки</span>
      </div>

      {/* Текст заполняет всё оставшееся место, шрифт адаптивный */}
      <div className="flex-1 px-3 pb-3 overflow-hidden">
        <p
          className="text-amber-900 leading-snug w-full"
          style={{
            fontSize: "clamp(9px, 1.8vw, 11px)",
          }}
        >
          {phase !== "fade" && (
            <Typewriter
              key={`${index}`}
              text={current.para}
              breed={current.breed}
              onDone={handleDone}
            />
          )}
        </p>
      </div>
    </div>
  );
};

export default CollectionRaccoonNotes;