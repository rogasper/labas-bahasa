import { Input } from "@labas/ui/components/input";

const MCQ_FORMATS = [
  "multiple_choice",
  "synonym",
  "grammar_in_context",
  "sentence_completion",
  "reference",
  "kanji_reading",
  "particle_choice",
  "article_case",
  "matching_headings",
  "matching_information",
  "summary_completion",
  "cloze",
];

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
  "flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] cursor-pointer hover:border-[var(--matcha-300)] transition-colors";
const radioSelected = "border-[var(--matcha-600)] bg-[#e8f5ed]";
const radioDisabled = "opacity-60 cursor-not-allowed";

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
    return (
      <div className="space-y-2">
        {TRUE_FALSE_CHOICES.map((c) => (
          <label
            key={c.key}
            className={`${radioClass} ${value === c.key ? radioSelected : ""} ${disabled ? radioDisabled : ""}`}
          >
            <input
              type="radio"
              name={question.id}
              value={c.key}
              checked={value === c.key}
              onChange={() => onChange(c.key)}
              disabled={disabled}
              className="hidden"
            />
            <span className="text-sm font-semibold text-[var(--clay-black)]">{c.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (format === "author_view") {
    return (
      <div className="space-y-2">
        {AUTHOR_VIEW_CHOICES.map((c) => (
          <label
            key={c.key}
            className={`${radioClass} ${value === c.key ? radioSelected : ""} ${disabled ? radioDisabled : ""}`}
          >
            <input
              type="radio"
              name={question.id}
              value={c.key}
              checked={value === c.key}
              onChange={() => onChange(c.key)}
              disabled={disabled}
              className="hidden"
            />
            <span className="text-sm font-semibold text-[var(--clay-black)]">{c.label}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Ketik jawaban Anda..."
      className="bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[var(--radius-lg)]"
    />
  );
}
