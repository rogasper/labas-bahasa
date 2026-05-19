import { MaterialIcon } from "@/components/ui/MaterialIcon";

import { MCQ_FORMATS, McqFormat } from "@/lib/question-formats";

interface McqOptionItem {
  key: string;
  text: string;
}

interface MatchingOptionItem {
  left: string;
  right?: string;
}

interface OptionDisplayProps {
  format: string;
  options: unknown;
  correctAnswer: string;
  userAnswer: string;
}

export function OptionDisplay({ format, options, correctAnswer, userAnswer }: OptionDisplayProps) {
  if (!Array.isArray(options) || options.length === 0) return null;

  if (format === "matching_pairs") {
    return <MatchingPairsOptions options={options as MatchingOptionItem[]} correctAnswer={correctAnswer} userAnswer={userAnswer} />;
  }

  if (format === "true_false_not_given") {
    return <TriStateOptions choices={["TRUE", "FALSE", "NOT_GIVEN"]} labels={{ TRUE: "True", FALSE: "False", NOT_GIVEN: "Not Given" }} correctAnswer={correctAnswer} userAnswer={userAnswer} />;
  }

  if (format === "author_view") {
    return <TriStateOptions choices={["YES", "NO", "NOT_GIVEN"]} labels={{ YES: "Yes", NO: "No", NOT_GIVEN: "Not Given" }} correctAnswer={correctAnswer} userAnswer={userAnswer} />;
  }

  if ((MCQ_FORMATS as readonly string[]).includes(format)) {
    return <McqOptions options={options as McqOptionItem[]} correctAnswer={correctAnswer} userAnswer={userAnswer} />;
  }

  return null;
}

function McqOptions({ options, correctAnswer, userAnswer }: { options: { key: string; text: string }[]; correctAnswer: string; userAnswer: string }) {
  const normUser = userAnswer?.trim().toUpperCase() || "";
  const normCorrect = correctAnswer?.trim().toUpperCase() || "";
  const hasAnswer = !!userAnswer && userAnswer !== "Tidak dijawab";

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const key = opt.key.trim().toUpperCase();
        const isCorrectOption = key === normCorrect;
        const isChosen = key === normUser && hasAnswer;
        const isWrongChoice = isChosen && !isCorrectOption;

        let bg = "bg-[var(--oat-light)]";
        let keyBg = "bg-[var(--oat-light)] text-[var(--clay-black)]";
        let border = "border-[var(--oat-border)]";
        let icon = null;

        if (isWrongChoice) {
          bg = "bg-[var(--pomegranate-100)]";
          keyBg = "bg-[var(--pomegranate-400)] text-[var(--pure-white)]";
          border = "border-[var(--pomegranate-400)]";
          icon = <MaterialIcon name="cancel" className="text-sm text-[var(--pomegranate-400)] shrink-0" />;
        } else if (isCorrectOption) {
          bg = "bg-[var(--matcha-300)]/20";
          keyBg = "bg-[var(--matcha-600)] text-[var(--pure-white)]";
          border = "border-[var(--matcha-400)]";
          icon = <MaterialIcon name="check_circle" className="text-sm text-[var(--matcha-600)] shrink-0" />;
        }

        return (
          <div key={opt.key} className={`flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border-2 ${border} ${bg}`}>
            <span className={`w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full text-sm font-bold flex items-center justify-center shrink-0 ${keyBg}`}>
              {key || "?"}
            </span>
            <span className="flex-1 text-sm text-[var(--clay-black)]">{opt.text}</span>
            {icon}
          </div>
        );
      })}
    </div>
  );
}

function TriStateOptions({ choices, labels, correctAnswer, userAnswer }: { choices: string[]; labels: Record<string, string>; correctAnswer: string; userAnswer: string }) {
  const normUser = userAnswer?.trim().toUpperCase().replace(/\s+/g, "_") || "";
  const normCorrect = correctAnswer?.trim().toUpperCase() || "";
  const hasAnswer = !!userAnswer && userAnswer !== "Tidak dijawab";

  return (
    <div className="space-y-2">
      {choices.map((c) => {
        const isCorrectOption = c === normCorrect;
        const isChosen = c === normUser && hasAnswer;
        const isWrongChoice = isChosen && !isCorrectOption;

        let bg = "bg-[var(--oat-light)]";
        let dot = "border-[var(--oat-border)]";
        let textColor = "text-[var(--warm-charcoal)]";

        if (isWrongChoice) {
          bg = "bg-[var(--pomegranate-100)]";
          dot = "border-[var(--pomegranate-400)] bg-[var(--pomegranate-400)]";
          textColor = "text-[var(--pomegranate-600)]";
        } else if (isCorrectOption) {
          bg = "bg-[var(--matcha-300)]/20";
          dot = "border-[var(--matcha-600)] bg-[var(--matcha-600)]";
          textColor = "text-[var(--matcha-800)]";
        }

        return (
          <div key={c} className={`flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] ${bg}`}>
            <span className={`w-5 h-5 rounded-full border-2 ${dot} flex items-center justify-center shrink-0`}>
              {isChosen || isCorrectOption ? <span className="w-2 h-2 rounded-full bg-white" /> : null}
            </span>
            <span className={`text-sm font-semibold ${textColor}`}>{labels[c]}</span>
          </div>
        );
      })}
    </div>
  );
}

function MatchingPairsOptions({ options, correctAnswer, userAnswer }: { options: MatchingOptionItem[]; correctAnswer: string; userAnswer: string }) {
  const parseMapping = (s: string): Map<string, string> => {
    const map = new Map();
    if (!s) return map;
    s.split(",").forEach((pair) => {
      const [k, v] = pair.split(":").map((x) => x.trim());
      if (k && v) map.set(k, v);
    });
    return map;
  };

  const correctMap = parseMapping(correctAnswer);
  const userMap = parseMapping(userAnswer);

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const matchedCorrect = correctMap.get(opt.left) || "";
        const matchedUser = userMap.get(opt.left) || "";
        const isMatchCorrect = matchedUser === matchedCorrect;
        const hasUserAnswer = !!matchedUser;

        return (
          <div key={opt.left} className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--oat-light)]">
            <span className="w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0 bg-[var(--oat-light)] text-[var(--clay-black)] border-2 border-[var(--oat-border)]">
              {opt.left.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 text-sm text-[var(--clay-black)]">{opt.left}</span>
            <span className="text-[var(--warm-silver)]">→</span>
            {hasUserAnswer && (
              <span className={`text-sm font-medium px-3 py-1.5 rounded-[var(--radius-md)] ${isMatchCorrect ? "bg-[var(--matcha-300)]/20 text-[var(--matcha-700)]" : "bg-[var(--pomegranate-100)] text-[var(--pomegranate-600)] line-through"}`}>
                {matchedUser}
              </span>
            )}
            {!isMatchCorrect && matchedCorrect && (
              <span className="text-sm font-medium px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--matcha-300)]/20 text-[var(--matcha-700)]">
                {matchedCorrect}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
