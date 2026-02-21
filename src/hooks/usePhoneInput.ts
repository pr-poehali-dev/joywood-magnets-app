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
  // generic: groups of 3-3-3 or just raw
  let r = "";
  if (d.length > 0) r += d.slice(0, 3);
  if (d.length >= 3) r += ` `;
  if (d.length > 3) r += d.slice(3, 6);
  if (d.length >= 6) r += ` `;
  if (d.length > 6) r += d.slice(6, maxDigits);
  return r;
}

export function usePhoneInput(initial = "") {
  const [countryIdx, setCountryIdx] = useState(0);
  const country = COUNTRY_CODES[countryIdx];

  const getInitialDigits = () =>
    initial.replace(/\D/g, "").replace(/^7/, "").slice(0, country.digits);

  const [digits, setDigits] = useState<string>(getInitialDigits);
  const inputRef = useRef<HTMLInputElement>(null);

  const display = country.code + " " + applyMask(digits, country.digits);
  const prefixLen = country.code.length + 1; // "+7 " or "+375 "

  const isValid = digits.length === country.digits;
  const fullPhone = isValid ? `${country.code}${digits}` : "";

  // Given a masked string (without country code prefix), get only digits
  const extractDigits = (masked: string) =>
    masked.replace(/\D/g, "").slice(0, country.digits);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cursorPos = e.target.selectionStart ?? raw.length;

      // Strip prefix if present
      const withoutPrefix = raw.startsWith(country.code + " ")
        ? raw.slice(prefixLen)
        : raw.startsWith(country.code)
        ? raw.slice(country.code.length)
        : raw;

      const newDigits = extractDigits(withoutPrefix);
      setDigits(newDigits);

      // Restore cursor: count digits typed before cursor position in raw
      const rawBeforeCursor = raw.slice(0, cursorPos);
      const digitsBeforeCursor = rawBeforeCursor.replace(/\D/g, "").replace(
        new RegExp(`^${country.code.replace("+", "\\+")}\\d*`),
        (m) => m.slice(country.code.length)
      ).replace(/\D/g, "").length;

      // Find position in new masked string after digitsBeforeCursor digits
      setTimeout(() => {
        if (!inputRef.current) return;
        const newDisplay = country.code + " " + applyMask(newDigits, country.digits);
        let digitCount = 0;
        let newPos = prefixLen;
        for (let i = prefixLen; i < newDisplay.length; i++) {
          if (/\d/.test(newDisplay[i])) {
            if (digitCount >= digitsBeforeCursor) break;
            digitCount++;
          }
          newPos = i + 1;
        }
        inputRef.current.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [country, prefixLen]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (!input) return;
      const pos = input.selectionStart ?? 0;

      // Prevent deleting the country code prefix
      if (e.key === "Backspace" && pos <= prefixLen) {
        e.preventDefault();
        return;
      }
      if (e.key === "Delete" && pos < prefixLen) {
        e.preventDefault();
        return;
      }
    },
    [prefixLen]
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