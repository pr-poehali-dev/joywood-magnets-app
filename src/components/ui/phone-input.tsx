import { useRef, useState } from "react";
import { usePhoneInput } from "@/hooks/usePhoneInput";

interface PhoneInputProps {
  phoneHook: ReturnType<typeof usePhoneInput>;
  id?: string;
  autoFocus?: boolean;
}

export function PhoneInput({ phoneHook, id, autoFocus }: PhoneInputProps) {
  const { display, inputRef, handleChange, handleKeyDown, handleFocus, countryIdx, selectCountry, countries } = phoneHook;
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onBlur={(e) => {
            if (!dropdownRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
          }}
          className="h-full px-3 flex items-center gap-1 text-sm bg-muted/40 hover:bg-muted/70 border-r border-input transition-colors whitespace-nowrap font-medium"
        >
          {countries[countryIdx].label}
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="opacity-50">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {open && (
          <div
            ref={dropdownRef}
            tabIndex={-1}
            className="absolute z-50 top-full left-0 mt-1 bg-white border border-input rounded-md shadow-lg min-w-[130px] py-1"
          >
            {countries.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { selectCountry(i); setOpen(false); inputRef.current?.focus(); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${i === countryIdx ? "font-semibold bg-muted/30" : ""}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
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
        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0"
      />
    </div>
  );
}
