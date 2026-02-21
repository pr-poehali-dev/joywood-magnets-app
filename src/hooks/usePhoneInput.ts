import { useState, useCallback, useRef } from "react";

export interface CountryCode {
  code: string;
  label: string;
  digits: number;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "+7",   label: "🇷🇺 Россия +7",       digits: 10 },
  { code: "+374", label: "🇦🇲 Армения +374",     digits: 8  },
  { code: "+375", label: "🇧🇾 Беларусь +375",    digits: 9  },
  { code: "+7",   label: "🇰🇿 Казахстан +7",     digits: 10 },
  { code: "+996", label: "🇰🇬 Кыргызстан +996",  digits: 9  },
  { code: "+998", label: "🇺🇿 Узбекистан +998",  digits: 9  },
  { code: "+995", label: "🇬🇪 Грузия +995",      digits: 9  },
  { code: "+994", label: "🇦🇿 Азербайджан +994", digits: 9  },
];

function applyMask(digits: string, maxDigits: number): string {
  const d = digits.slice(0, maxDigits);
  if (maxDigits === 10) {
    // +7: (XXX) XXX-XX-XX
    let r = "";
    if (d.length > 0) r += `(${d.slice(0, 3)}`;
    if (d.length >= 3) r += `) `;
    if (d.length > 3) r += d.slice(3, 6);
    if (d.length >= 6) r += `-`;
    if (d.length > 6) r += d.slice(6, 8);
    if (d.length >= 8) r += `-`;
    if (d.length > 8) r += d.slice(8, 10);
    return r;
  }
  // generic: XXX XXX XXX
  let r = "";
  if (d.length > 0) r += d.slice(0, 3);
  if (d.length > 3) r += ` ${d.slice(3, 6)}`;
  if (d.length > 6) r += ` ${d.slice(6, maxDigits)}`;
  return r;
}

export function usePhoneInput(initial = "") {
  const [countryIdx, setCountryIdx] = useState(0);
  const country = COUNTRY_CODES[countryIdx];

  const [digits, setDigits] = useState<string>(() => {
    const c = COUNTRY_CODES[0];
    return initial.replace(/\D/g, "").replace(/^7/, "").slice(0, c.digits);
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const prefix = country.code + " ";
  const display = prefix + applyMask(digits, country.digits);

  const isValid = digits.length === country.digits;
  const fullPhone = isValid ? `${country.code}${digits}` : "";

  // Move cursor to position after N digits in the masked display
  const setCursorAfterDigit = useCallback((n: number, newDigits: string) => {
    setTimeout(() => {
      if (!inputRef.current) return;
      const masked = applyMask(newDigits, country.digits);
      const full = prefix + masked;
      let count = 0;
      let pos = prefix.length;
      for (let i = prefix.length; i < full.length; i++) {
        if (/\d/.test(full[i])) {
          count++;
          if (count === n) { pos = i + 1; break; }
        }
        if (count < n) pos = i + 1;
      }
      inputRef.current.setSelectionRange(pos, pos);
    }, 0);
  }, [country, prefix]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const hasSelection = start !== end;

      if (e.key === "Backspace") {
        e.preventDefault();

        if (hasSelection) {
          // Remove all digits that fall within selection
          const sel = display.slice(start, end);
          const removedCount = (sel.match(/\d/g) ?? []).length;
          // Count digits before selection start
          const before = display.slice(0, start);
          const digitsBeforeCount = (before.slice(prefix.length).match(/\d/g) ?? []).length;
          const newDigits =
            digits.slice(0, digitsBeforeCount) +
            digits.slice(digitsBeforeCount + removedCount);
          setDigits(newDigits);
          setCursorAfterDigit(digitsBeforeCount, newDigits);
          return;
        }

        // No selection — delete digit before cursor
        if (start <= prefix.length) return; // protect prefix

        // Find which digit position the cursor is after
        const beforeCursor = display.slice(prefix.length, start);
        const digitsBeforeCursor = (beforeCursor.match(/\d/g) ?? []).length;

        if (digitsBeforeCursor === 0) return;

        // If cursor is right after a non-digit (separator), skip over it
        const charBeforeCursor = display[start - 1];
        if (!/\d/.test(charBeforeCursor)) {
          // Just move cursor back past the separator, don't delete
          input.setSelectionRange(start - 1, start - 1);
          return;
        }

        const newDigits = digits.slice(0, digitsBeforeCursor - 1) + digits.slice(digitsBeforeCursor);
        setDigits(newDigits);
        setCursorAfterDigit(digitsBeforeCursor - 1, newDigits);
        return;
      }

      if (e.key === "Delete") {
        e.preventDefault();

        if (start < prefix.length) return;

        if (hasSelection) {
          const sel = display.slice(start, end);
          const removedCount = (sel.match(/\d/g) ?? []).length;
          const before = display.slice(0, start);
          const digitsBeforeCount = (before.slice(prefix.length).match(/\d/g) ?? []).length;
          const newDigits =
            digits.slice(0, digitsBeforeCount) +
            digits.slice(digitsBeforeCount + removedCount);
          setDigits(newDigits);
          setCursorAfterDigit(digitsBeforeCount, newDigits);
          return;
        }

        const beforeCursor = display.slice(prefix.length, start);
        const digitsBeforeCursor = (beforeCursor.match(/\d/g) ?? []).length;

        // Delete digit after cursor
        const charAtCursor = display[start];
        if (!charAtCursor || start >= display.length) return;

        if (!/\d/.test(charAtCursor)) {
          // skip separator
          input.setSelectionRange(start + 1, start + 1);
          return;
        }

        const newDigits = digits.slice(0, digitsBeforeCursor) + digits.slice(digitsBeforeCursor + 1);
        setDigits(newDigits);
        setCursorAfterDigit(digitsBeforeCursor, newDigits);
        return;
      }
    },
    [display, digits, prefix, setCursorAfterDigit]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cursorPos = e.target.selectionStart ?? raw.length;

      // Extract only newly typed digits (ignore prefix)
      const withoutPrefix = raw.startsWith(prefix)
        ? raw.slice(prefix.length)
        : raw.startsWith(country.code)
        ? raw.slice(country.code.length)
        : raw;

      const newDigits = withoutPrefix.replace(/\D/g, "").slice(0, country.digits);

      // Only handle additions here (deletions handled in keyDown)
      if (newDigits.length < digits.length) {
        // Deletion via onChange (e.g. mobile) — find cursor digit position
        const digitsBeforeCursor = Math.max(
          0,
          (raw.slice(0, cursorPos).replace(/\D/g, "").length) - country.code.replace(/\D/g, "").length
        );
        setDigits(newDigits);
        setCursorAfterDigit(digitsBeforeCursor, newDigits);
        return;
      }

      if (newDigits === digits) return;

      setDigits(newDigits);

      // Place cursor after the last newly added digit
      const addedCount = newDigits.length - digits.length;
      const beforeCursor = raw.slice(0, cursorPos);
      const digitsBeforeCursor = Math.max(
        0,
        (beforeCursor.replace(/\D/g, "").length) - country.code.replace(/\D/g, "").length
      );
      setCursorAfterDigit(digitsBeforeCursor, newDigits);
    },
    [country, prefix, digits, setCursorAfterDigit]
  );

  const handleFocus = useCallback(() => {
    setTimeout(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 0);
  }, []);

  const selectCountry = useCallback((idx: number) => {
    setCountryIdx(idx);
    setDigits("");
  }, []);

  const reset = useCallback(() => setDigits(""), []);

  return {
    display,
    fullPhone,
    digits,
    isValid,
    inputRef,
    handleChange,
    handleKeyDown,
    handleFocus,
    reset,
    countryIdx,
    selectCountry,
    countries: COUNTRY_CODES,
    country,
  };
}
