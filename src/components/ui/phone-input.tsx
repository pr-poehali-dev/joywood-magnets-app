import { useEffect, useRef, useState } from "react";
import { usePhoneInput } from "@/hooks/usePhoneInput";

interface PhoneInputProps {
  phoneHook: ReturnType<typeof usePhoneInput>;
  id?: string;
  autoFocus?: boolean;
}

export function PhoneInput({ phoneHook, id, autoFocus }: PhoneInputProps) {
  const { display, inputRef, handleChange, handleKeyDown, handleFocus, countryIdx, selectCountry, countries } = phoneHook;
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const shortLabel = countries[countryIdx].label.split(" ")[0];

  return (
    <div ref={wrapperRef} className="flex rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-visible relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-full px-3 flex items-center gap-1 text-sm bg-muted/40 hover:bg-muted/70 border-r border-input transition-colors whitespace-nowrap font-medium rounded-l-md shrink-0"
      >
        {shortLabel}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="opacity-50 ml-0.5">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-input rounded-md shadow-xl min-w-[200px] py-1 max-h-60 overflow-y-auto">
          {countries.map((c, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectCountry(i);
                setOpen(false);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${i === countryIdx ? "font-semibold bg-muted/20" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <input
        id={id}
        type="tel"
        inputMode="numeric"
        ref={inputRef}
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        autoComplete="tel"
        autoFocus={autoFocus}
        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0 rounded-r-md"
      />
    </div>
  );
}