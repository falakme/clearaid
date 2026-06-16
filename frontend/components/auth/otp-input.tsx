"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Current value (the assembled code, up to `length` digits). */
  value: string;
  onChange: (value: string) => void;
  /** Fired when all boxes are filled. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * 6-box verification-code input.
 *  - one box per digit, auto-advances focus as you type,
 *  - Backspace moves to the previous box,
 *  - pasting a full code fills every box at once.
 * Digits only. Controlled via `value` (a plain string).
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
}: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function commit(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  }

  function focusBox(i: number) {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  }

  function handleChange(index: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (!d) {
      // Cleared this box.
      const arr = value.split("");
      arr[index] = "";
      commit(arr.join("").slice(0, length));
      return;
    }
    // Take the last typed char (handles overtype) and place it here.
    const arr = digits.slice();
    arr[index] = d[d.length - 1];
    const assembled = arr.join("").slice(0, length);
    commit(assembled);
    focusBox(index + 1);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const arr = digits.slice();
        arr[index] = "";
        commit(arr.join(""));
      } else {
        focusBox(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      focusBox(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    commit(pasted);
    focusBox(Math.min(pasted.length, length - 1));
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus && i === 0}
          maxLength={1}
          disabled={disabled}
          value={digit}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "h-14 w-full min-w-0 rounded-md bg-muted/60 text-center text-2xl font-extrabold",
            "shadow-clay-inset outline-none transition-all",
            "focus:bg-card focus:ring-2 focus:ring-ring",
            "disabled:opacity-50",
          )}
        />
      ))}
    </div>
  );
}
