import { useCallback } from "react";

const ACCENT_CHARS: Record<string, string[]> = {
  DELE:  ["á", "é", "í", "ó", "ú", "ñ", "¿", "¡"],
  GOETHE: ["ä", "ö", "ü", "ß"],
  TOAFL: ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي"],
};

interface AccentKeyboardProps {
  examType?: string;
  onInsert: (char: string) => void;
  disabled?: boolean;
}

export function AccentKeyboard({ examType, onInsert, disabled }: AccentKeyboardProps) {
  if (!examType) return null;
  const chars: string[] | undefined = ACCENT_CHARS[examType];
  if (!chars || chars.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 p-3 rounded-[var(--radius-lg)] bg-[var(--oat-light)] border border-[var(--oat-border)] ${disabled ? "opacity-50" : ""}`}>
      <span className="w-full text-[10px] font-medium text-[var(--warm-charcoal)] uppercase tracking-wider mb-0.5">
        Special Characters
      </span>
      {chars.map((char: string) => (
        <button
          key={char}
          type="button"
          onClick={() => onInsert(char)}
          disabled={disabled}
          className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-semibold bg-[var(--pure-white)] border border-[var(--oat-border)] hover:bg-[var(--matcha-300)] hover:border-[var(--matcha-600)] transition-all clay-hover disabled:cursor-not-allowed"
        >
          {char}
        </button>
      ))}
    </div>
  );
}
