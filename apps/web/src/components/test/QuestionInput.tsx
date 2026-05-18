import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Input } from "@labas/ui/components/input";

import { MCQ_FORMATS } from "@/lib/question-formats";

const TRUE_FALSE_CHOICES = [
  { key: "TRUE", label: "True" },
  { key: "FALSE", label: "False" },
  { key: "NOT_GIVEN", label: "Not Given" },
];

const AUTHOR_VIEW_CHOICES = [
  { key: "YES", label: "Yes" },
  { key: "NO", label: "No" },
  { key: "NOT_GIVEN", label: "Not Given" },
];

const radioClass =
  "flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] cursor-pointer hover:border-[var(--matcha-300)] transition-all";
const radioSelected =
  "border-[var(--matcha-600)] bg-[#e8f5ed] ring-2 ring-[var(--matcha-600)]/30 shadow-sm";
const radioDisabled = "opacity-60 cursor-not-allowed";

/** Normalize TF / NG style answers from API or loose model output */
function normalizeTriStateKey(
  value: string,
  choices: readonly { key: string }[],
): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const u = raw.toUpperCase().replace(/\s+/g, "_");
  if (choices.some((c) => c.key === u)) return u;
  const compact = u.replace(/_/g, "");
  const alias: Record<string, string> = {
    TRUE: "TRUE",
    FALSE: "FALSE",
    NOTGIVEN: "NOT_GIVEN",
    YES: "YES",
    NO: "NO",
  };
  return alias[compact] ?? u;
}

/** Debounced text input to avoid parent re-render on every keystroke */
function DebouncedTextInput({
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync when prop value changes from outside (e.g. restore from server)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(val);
      }, 400);
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    clearTimeout(debounceRef.current);
    onChange(localValue);
  }, [localValue, onChange]);

  return (
    <Input
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  );
}

export function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: any;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const format = question.format;
  const options = question.options as Array<{ key: string; text: string }> | undefined;

  if (format === "matching_pairs") {
    if (!options || options.length === 0) {
      return (
        <div className="text-sm text-[var(--warm-silver)] italic">
          Tidak ada opsi tersedia untuk soal ini.
        </div>
      );
    }
    const parseCurrentMapping = (val: string): Map<string, string> => {
      const map = new Map<string, string>();
      val.split(",").forEach((pair) => {
        const [k, v] = pair.split(":").map((s) => s.trim());
        if (k && v) map.set(k, v);
      });
      return map;
    };
    const currentMap = value ? parseCurrentMapping(value) : new Map();
    const updateMapping = (key: string, val: string) => {
      currentMap.set(key, val);
      const serialized = Array.from(currentMap.entries())
        .map(([k, v]) => `${k}:${v}`)
        .join(",");
      onChange(serialized);
    };
    return (
      <div className="space-y-3">
        {options.map((opt) => {
          const matched = currentMap.get(opt.key) || "";
          return (
            <div key={opt.key} className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0 bg-[var(--oat-light)] text-[var(--clay-black)]">
                {opt.key}
              </span>
              <span className="flex-1 text-sm text-[var(--clay-black)]">{opt.text}</span>
              <span className="text-[var(--warm-silver)]">→</span>
              <input
                type="text"
                value={matched}
                onChange={(e) => updateMapping(opt.key, e.target.value)}
                disabled={disabled}
                placeholder="Padanan..."
                className="w-24 px-3 py-2 text-sm rounded-[var(--radius-md)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] focus:outline-none focus:border-[var(--matcha-600)]"
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (MCQ_FORMATS.includes(format)) {
    if (!options || options.length === 0) {
      return (
        <div className="text-sm text-[var(--warm-silver)] italic">
          Tidak ada opsi tersedia untuk soal ini.
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={`${radioClass} ${value === opt.key ? radioSelected : ""} ${disabled ? radioDisabled : ""}`}
          >
            <input
              type="radio"
              name={question.id}
              value={opt.key}
              checked={value === opt.key}
              onChange={() => onChange(opt.key)}
              disabled={disabled}
              className="hidden"
            />
            <span className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0 transition-colors ${value === opt.key ? "bg-[var(--matcha-600)] text-[var(--pure-white)]" : "bg-[var(--oat-light)] text-[var(--clay-black)]"}`}>
              {opt.key}
            </span>
            <span className="text-sm text-[var(--clay-black)]">{opt.text}</span>
          </label>
        ))}
      </div>
    );
  }

  if (format === "true_false_not_given") {
    const normalizedValue = normalizeTriStateKey(value, TRUE_FALSE_CHOICES);
    return (
      <div className="space-y-2">
        {TRUE_FALSE_CHOICES.map((c) => {
          const selected = normalizedValue === c.key;
          return (
            <label
              key={c.key}
              className={`${radioClass} ${selected ? radioSelected : ""} ${disabled ? radioDisabled : ""}`}
            >
              <input
                type="radio"
                name={question.id}
                value={c.key}
                checked={selected}
                onChange={() => onChange(c.key)}
                disabled={disabled}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  selected
                    ? "border-[var(--matcha-600)] bg-[var(--matcha-600)]"
                    : "border-[var(--oat-border)] bg-[var(--pure-white)]"
                }`}
              >
                {selected ? <span className="w-2 h-2 rounded-full bg-[var(--pure-white)]" /> : null}
              </span>
              <span
                className={`text-sm font-semibold ${
                  selected ? "text-[var(--matcha-800)]" : "text-[var(--clay-black)]"
                }`}
              >
                {c.label}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (format === "author_view") {
    const normalizedValue = normalizeTriStateKey(value, AUTHOR_VIEW_CHOICES);
    return (
      <div className="space-y-2">
        {AUTHOR_VIEW_CHOICES.map((c) => {
          const selected = normalizedValue === c.key;
          return (
            <label
              key={c.key}
              className={`${radioClass} ${selected ? radioSelected : ""} ${disabled ? radioDisabled : ""}`}
            >
              <input
                type="radio"
                name={question.id}
                value={c.key}
                checked={selected}
                onChange={() => onChange(c.key)}
                disabled={disabled}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  selected
                    ? "border-[var(--matcha-600)] bg-[var(--matcha-600)]"
                    : "border-[var(--oat-border)] bg-[var(--pure-white)]"
                }`}
              >
                {selected ? <span className="w-2 h-2 rounded-full bg-[var(--pure-white)]" /> : null}
              </span>
              <span
                className={`text-sm font-semibold ${selected ? "text-[var(--matcha-800)]" : "text-[var(--clay-black)]"}`}
              >
                {c.label}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  // Fallback: debounced text input for fill_blank and other free-text formats
  return (
    <DebouncedTextInput
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="Ketik jawaban Anda..."
      className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)]"
    />
  );
}
