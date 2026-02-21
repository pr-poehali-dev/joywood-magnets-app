import { useState, useCallback, useRef } from "react";

const PREFIX = "+7 ";

function applyMask(digits: string): string {
  const d = digits.slice(0, 10);
  let result = PREFIX;
  if (d.length > 0) result += `(${d.slice(0, 3)}`;
  if (d.length >= 3) result += `) `;
  if (d.length > 3) result += d.slice(3, 6);
  if (d.length >= 6) result += `-`;
  if (d.length > 6) result += d.slice(6, 8);
  if (d.length >= 8) result += `-`;
  if (d.length > 8) result += d.slice(8, 10);
  return result;
}

export function usePhoneInput(initial = "") {
  const getInitialDisplay = () => {
    const digits = initial.replace(/\D/g, "").replace(/^7/, "").slice(0, 10);
    return digits.length > 0 ? applyMask(digits) : PREFIX;
  };

  const [display, setDisplay] = useState<string>(getInitialDisplay);
  const inputRef = useRef<HTMLInputElement>(null);

  const digits = display.replace(/\D/g, "").replace(/^7/, "").slice(0, 10);
  const fullPhone = display.replace(/\D/g, "").length >= 11 ? `+7${digits}` : "";
  const isValid = digits.length === 10;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (raw.length < PREFIX.length) {
      setDisplay(PREFIX);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(PREFIX.length, PREFIX.length);
        }
      }, 0);
      return;
    }

    const afterPrefix = raw.slice(PREFIX.length);
    const newDigits = afterPrefix.replace(/\D/g, "").slice(0, 10);
    setDisplay(applyMask(newDigits));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;
    const pos = input.selectionStart ?? 0;

    if ((e.key === "Backspace" || e.key === "Delete") && pos <= PREFIX.length) {
      e.preventDefault();
    }
  }, []);

  const handleFocus = useCallback(() => {
    setTimeout(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 0);
  }, []);

  const reset = useCallback(() => setDisplay(PREFIX), []);

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
  };
}
