import { useEffect, useRef, useState, useLayoutEffect, useMemo } from "react";

interface Props {
  collectedBreeds: Set<string>;
  breedNotes: Record<string, string>;
  // Высота блока задаётся снаружи — чтобы не сдвигать енота
  height: number;
  // Новые породы — их заметки показываем первыми
  newBreeds?: string[];
}

function buildNotes(
  collectedBreeds: Set<string>,
  breedNotes: Record<string, string>,
  newBreeds: string[] = []
) {
  const newSet = new Set(newBreeds);
  const entries = Object.entries(breedNotes).filter(([breed]) => collectedBreeds.has(breed));
  const sorted = [
    ...entries.filter(([breed]) => newSet.has(breed)),
    ...entries.filter(([breed]) => !newSet.has(breed)),
  ];
  return sorted.flatMap(([breed, text]) =>
    text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((para) => ({ breed, para }))
  );
}

// Кэш скомпилированных regex по породе — не компилируем при каждом символе
const _regexCache = new Map<string, RegExp>();
function getBreedRegex(breed: string): RegExp {
  let re = _regexCache.get(breed);
  if (!re) {
    const escaped = breed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`(${escaped})`, "gi");
    _regexCache.set(breed, re);
  }
  return re;
}

function highlightBreed(text: string, breed: string) {
  const parts = text.split(getBreedRegex(breed));
  return parts.map((part, i) =>
    part.toLowerCase() === breed.toLowerCase()
      ? <strong key={i} className="font-bold text-amber-800">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

// Подбирает максимальный размер шрифта при котором текст помещается в контейнер
function fitFontSize(
  text: string,
  containerEl: HTMLElement,
  minPx = 8,
  maxPx = 13
): number {
  const probe = document.createElement("div");
  probe.style.cssText = `
    position:absolute;visibility:hidden;pointer-events:none;
    width:${containerEl.clientWidth}px;
    padding:0;margin:0;
    word-break:break-word;white-space:pre-wrap;line-height:1.35;
  `;
  document.body.appendChild(probe);

  let lo = minPx;
  let hi = maxPx;
  let result = minPx;
  while (lo <= hi) {
    const mid = (lo + hi) / 2;
    probe.style.fontSize = `${mid}px`;
    probe.textContent = text;
    if (probe.scrollHeight <= containerEl.clientHeight) {
      result = mid;
      lo = mid + 0.5;
    } else {
      hi = mid - 0.5;
    }
  }

  document.body.removeChild(probe);
  return result;
}

const Typewriter = ({
  text,
  breed,
  fontSize,
  onDone,
}: {
  text: string;
  breed: string;
  fontSize: number;
  onDone: () => void;
}) => {
  const [charCount, setCharCount] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setCharCount(0);
    let i = 0;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    const speed = text.length > 120 ? 15 : text.length > 60 ? 22 : 30;
    const interval = setInterval(() => {
      i++;
      setCharCount(i);
      if (i >= text.length) {
        clearInterval(interval);
        const hold = Math.min(18000, 10000 + Math.floor(text.length / 40) * 1000);
        holdTimer = setTimeout(() => doneRef.current(), hold);
      }
    }, speed);
    return () => {
      clearInterval(interval);
      if (holdTimer) clearTimeout(holdTimer);
    };
  }, [text]);

  const displayed = text.slice(0, charCount);
  const done = charCount >= text.length;

  return (
    <p
      className="text-amber-900 w-full"
      style={{ fontSize: `${fontSize}px`, lineHeight: 1.35, wordBreak: "break-word", whiteSpace: "pre-wrap" }}
    >
      {highlightBreed(displayed, breed)}
      {!done && (
        <span
          className="inline-block w-0.5 bg-amber-500 ml-0.5 align-middle"
          style={{ height: "1em", animation: "blink 0.7s step-end infinite" }}
        />
      )}
    </p>
  );
};

const CollectionRaccoonNotes = ({ collectedBreeds, breedNotes, height, newBreeds }: Props) => {
  const allNotes = useMemo(
    () => buildNotes(collectedBreeds, breedNotes, newBreeds),
    [collectedBreeds, breedNotes, newBreeds]
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "fade">("typing");

  const prevNewBreedsKey = useRef("");
  useEffect(() => {
    const key = (newBreeds ?? []).join(",");
    if (key && key !== prevNewBreedsKey.current) {
      prevNewBreedsKey.current = key;
      setPhase("fade");
      const t = setTimeout(() => { setIndex(0); setPhase("typing"); }, 500);
      return () => clearTimeout(t);
    }
  }, [newBreeds]);
  const [fontSize, setFontSize] = useState(10);
  const textAreaRef = useRef<HTMLDivElement>(null);

  const currentNote = allNotes.length > 0 ? allNotes[index % allNotes.length] : null;

  // Подбираем шрифт при смене текста или изменении размера контейнера
  useLayoutEffect(() => {
    if (!currentNote || !textAreaRef.current) return;
    const size = fitFontSize(currentNote.para, textAreaRef.current);
    setFontSize(size);
  }, [currentNote?.para, height]);

  const fadeSwitchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDone = () => {
    setPhase("fade");
    if (fadeSwitchRef.current) clearTimeout(fadeSwitchRef.current);
    fadeSwitchRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % allNotes.length);
      setPhase("typing");
    }, 500);
  };

  if (!allNotes.length || !currentNote) return null;

  // Заголовочная секция (фиксированная)
  const HEADER_H = 20;
  const textH = height - HEADER_H;

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50 overflow-hidden"
      style={{
        height,
        opacity: phase === "fade" ? 0 : 1,
        transition: "opacity 0.45s ease",
        flexShrink: 0,
      }}
    >
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      {/* Заголовок — фиксированная высота */}
      <div
        className="flex items-center gap-1 px-2"
        style={{ height: HEADER_H, paddingTop: 5 }}
      >
        <span className="text-[10px] leading-none">🦝</span>
        <span className="text-[9px] font-semibold text-amber-500 uppercase tracking-wider">Заметки</span>
      </div>

      {/* Текстовая область — фиксированная высота, шрифт подобран */}
      <div
        ref={textAreaRef}
        className="px-2 pb-2 overflow-hidden"
        style={{ height: textH }}
      >
        {phase !== "fade" && (
          <Typewriter
            key={index}
            text={currentNote.para}
            breed={currentNote.breed}
            fontSize={fontSize}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  );
};

export default CollectionRaccoonNotes;