interface QuestionLanguageFields {
  questionText: string;
  options?: Array<{ key: string; text: string }>;
}

/** Target language for exam content (passage, question, options). */
export function getTargetLanguage(examType: string): string {
  if (examType === "JLPT") return "Japanese";
  if (examType === "HSK") return "Chinese";
  if (examType === "GOETHE") return "German";
  if (examType === "TOPIK") return "Korean";
  if (examType === "TOAFL") return "Arabic";
  if (examType === "DELE") return "Spanish";
  return "English";
}

const EXAMS_REQUIRING_NON_LATIN_SCRIPT = new Set(["JLPT", "HSK", "TOPIK"]);

const INDONESIAN_PROSE_MARKERS =
  /\b(yang|dari|pada|Apakah|Menurut|paragraf|bacaan|teks|judul|penulis|artikel|soal|pilihan|jawaban|berikut|manakah|bagian|kalimat|isinya|topik|gagasan|benar|karena|merujuk|sesuai|artinya|makna|kata|terdapat|disebutkan|dijelaskan|adalah|jadi|oleh|opsi|pilihan|jawabannya|penjelasan)\b/i;

/** Strip exam-script characters to analyze Indonesian prose separately. */
export function stripExamScriptForAnalysis(text: string): string {
  return text
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0600-\u06FF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Latin prose looks like Bahasa Indonesia (not English-only or empty). */
export function hasIndonesianProse(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (INDONESIAN_PROSE_MARKERS.test(t)) return true;
  if (/^(The|This|That|According|Because|Therefore|Option|Answer|It is|In the)\b/i.test(t)) {
    return false;
  }
  return t.length >= 15;
}

export function hasCJKScript(text: string): boolean {
  return /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(text);
}

export function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function hasTargetScript(text: string, examType: string): boolean {
  if (examType === "TOAFL") return hasArabicScript(text);
  if (EXAMS_REQUIRING_NON_LATIN_SCRIPT.has(examType)) return hasCJKScript(text);
  return true;
}

/** Heuristic: Latin text that looks like Indonesian exam instructions, not English. */
export function isLikelyIndonesianContent(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (hasCJKScript(t) || hasArabicScript(t)) return false;
  return INDONESIAN_PROSE_MARKERS.test(t);
}

export function buildContentLanguageRules(examType: string): string {
  const target = getTargetLanguage(examType);
  return `- LANGUAGE RULE (critical):
  * passageText, questionText, and every option "text" MUST be written in ${target} — the authentic exam language.
  * NEVER write questionText or options in Bahasa Indonesia for ${examType}.
  * explanation: tulis dalam Bahasa Indonesia; boleh sisipkan istilah/kanji/kata ${target} bila perlu (mis. 「環境」 atau kutipan singkat dari teks).`;
}

export function buildExplanationLanguageRule(examType?: string): string {
  const target = examType ? getTargetLanguage(examType) : "bahasa ujian";
  return `- explanation — WAJIB ditulis dalam Bahasa Indonesia sebagai penjelasan utama. Boleh menyertakan istilah, kanji, atau kutipan singkat dalam ${target} jika relevan (mis. arti kanji, padanan kata). Jangan tulis seluruh explanation hanya dalam ${target} atau Inggris.`;
}

export function getQuestionLanguageErrors(
  q: QuestionLanguageFields,
  examType: string,
): string[] {
  const errors: string[] = [];
  const target = getTargetLanguage(examType);

  if (isLikelyIndonesianContent(q.questionText)) {
    errors.push(`questionText must be ${target}, not Bahasa Indonesia`);
  }

  if (EXAMS_REQUIRING_NON_LATIN_SCRIPT.has(examType) && !hasTargetScript(q.questionText, examType)) {
    errors.push(`questionText must be written in ${target}`);
  }

  if (examType === "IELTS" || examType === "TOEFL") {
    if (isLikelyIndonesianContent(q.questionText)) {
      errors.push("questionText must be English for IELTS/TOEFL");
    }
  }

  for (const opt of q.options ?? []) {
    if (isLikelyIndonesianContent(opt.text)) {
      errors.push(`option ${opt.key} must be ${target}, not Bahasa Indonesia`);
    }
    if (EXAMS_REQUIRING_NON_LATIN_SCRIPT.has(examType) && !hasTargetScript(opt.text, examType)) {
      errors.push(`option ${opt.key} must be written in ${target}`);
    }
  }

  return errors;
}

export function getExplanationLanguageErrors(explanation: string): string[] {
  const t = explanation.trim();
  if (!t) return [];

  const latinPart = stripExamScriptForAnalysis(t);

  if (latinPart.length === 0) {
    return ["explanation must include Bahasa Indonesia prose, not only foreign script"];
  }

  if (!hasIndonesianProse(latinPart)) {
    return ["explanation prose must be in Bahasa Indonesia"];
  }

  return [];
}
