import type { GenerationInput } from "./schemas";
import { getCpnsQuestionJsonSchemaDescription } from "./schema-to-prompt";
import { buildContentLanguageRules } from "./language-rules";

const CPNS_TIU_TOPICS = [
  "Sinonim dan Antonim (Padanan Kata)",
  "Analogi Verbal",
  "Pengelompokan Kata",
  "Deret Angka dan Huruf",
  "Operasi Aritmatika",
  "Perbandingan Kuantitatif",
  "Soal Cerita Matematika",
  "Silogisme (Logika Berantai)",
  "Logika Posisi / Urutan",
  "Diagram Venn dan Relasi",
  "Bangun Ruang dan Geometri Dasar",
  "Probabilitas Sederhana",
];

const CPNS_TWK_TOPICS = [
  "Pancasila (Nilai, Sejarah, Pengamalan)",
  "Undang-Undang Dasar 1945 (Pasal-pasal, Amandemen)",
  "Bhinneka Tunggal Ika (Keberagaman NKRI)",
  "Negara Kesatuan Republik Indonesia",
  "Sejarah Indonesia (Kemerdekaan, Pergerakan Nasional)",
  "Sistem Pemerintahan Indonesia",
  "Hak Asasi Manusia",
  "Bendera, Bahasa, dan Lambang Negara",
  "Hubungan Internasional dan Politik Luar Negeri",
  "Wawasan Nusantara",
];

const CPNS_TKP_RULES = `- Setiap soal adalah skenario singkat situasi kerja/kedinasan/kehidupan sehari-hari.
- Setiap soal WAJIB memiliki 5 opsi jawaban (A, B, C, D, E).
- Setiap opsi memiliki bobot nilai 1-5 (optionWeights), di mana:
  * 5 = Jawaban paling tepat / paling sesuai dengan nilai ASN
  * 4 = Jawaban tepat, namun kurang optimal
  * 3 = Jawaban netral / cukup tepat
  * 2 = Jawaban kurang tepat
  * 1 = Jawaban tidak tepat
- correctAnswer diisi dengan key opsi yang memiliki weight tertinggi (5).
- optionWeights adalah array 5 angka sesuai urutan opsi A-E.
- Skenario harus realistis dan relevan dengan situasi kedinasan Indonesia.`;

export function buildCpnsQuickModePrompt(input: GenerationInput): string {
  const { examType, section, formats, difficulty, topics, questionCount } = input;

  const questionSchemaJson = getCpnsQuestionJsonSchemaDescription();

  const sectionHeader = getSectionHeader(section);
  const sectionRules = getSectionRules(section, topics);
  const formatSection = getFormatInstructions(section, formats);

  return `Anda adalah ahli pembuat soal CPNS SKD (Seleksi Kompetensi Dasar).

${sectionHeader}

Jumlah soal: ${questionCount}
TINGKAT KESULITAN: ${difficulty}/5
SECTION: ${section}

${buildContentLanguageRules(examType)}

${sectionRules}

INSTRUKSI FORMAT SOAL:
${formatSection}

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure (no markdown code blocks, no extra text):

{
  "questions": [
    // array of question objects. Schema:
${questionSchemaJson.split("\n").map((l) => "    " + l).join("\n")}
  ]
}

Pastikan semua konten dalam Bahasa Indonesia yang baik dan benar.
Jangan gunakan bahasa Inggris untuk soal atau opsi.
`;
}

function getSectionHeader(section: string): string {
  switch (section) {
    case "TIU":
      return "Buatlah soal Tes Intelegensi Umum (TIU) — mengukur kemampuan verbal, numerik, dan logika peserta.";
    case "TWK":
      return "Buatlah soal Tes Wawasan Kebangsaan (TWK) — mengukur pengetahuan kebangsaan, Pancasila, UUD 1945, dan sejarah Indonesia.";
    case "TKP":
      return "Buatlah soal Tes Karakteristik Pribadi (TKP) — mengukur karakter, integritas, dan perilaku dalam situasi kedinasan. Setiap opsi memiliki bobot nilai berbeda.";
    default:
      return `Buatlah soal untuk section ${section}.`;
  }
}

function getSectionRules(section: string, topics: string[]): string {
  switch (section) {
    case "TIU":
      return `ATURAN SOAL TIU:
- Soal terdiri dari tes verbal (sinonim, antonim, analogi, pengelompokan kata), tes numerik (deret angka, aritmatika, perbandingan, soal cerita), dan tes logika (silogisme, logika posisi, diagram).
- Setiap soal WAJIB memiliki 5 opsi pilihan ganda (A, B, C, D, E).
- Hanya satu jawaban yang benar.
- Topik yang dicakup: ${topics.join(", ") || CPNS_TIU_TOPICS.join(", ")}
- Soal matematika dapat menggunakan format \$...\$ untuk ekspresi inline dan \$\$...\$\$ untuk display.`;
    case "TWK":
      return `ATURAN SOAL TWK:
- Soal menguji pengetahuan tentang Pancasila, UUD 1945, NKRI, Bhinneka Tunggal Ika, sejarah Indonesia, sistem pemerintahan, dan HAM.
- Setiap soal WAJIB memiliki 5 opsi pilihan ganda (A, B, C, D, E).
- Hanya satu jawaban yang benar.
- Topik yang dicakup: ${topics.join(", ") || CPNS_TWK_TOPICS.join(", ")}
- Jawaban harus berdasarkan fakta dan aturan yang benar (UUD 1945, Pancasila yang otentik).`;
    case "TKP":
      return `${CPNS_TKP_RULES}
- Topik yang dicakup: ${topics.join(", ") || "Pelayanan Publik, Jejaring Kerja, Sosial Budaya, Profesionalisme, Anti-Radikalisme, Teknologi Informasi dan Komunikasi"}
- Skenario harus relate dengan kehidupan berorganisasi, bermasyarakat, dan bernegara di Indonesia.`;
    default:
      return "";
  }
}

function getFormatInstructions(_section: string, formats: string[]): string {
  const lines: string[] = [];
  for (const f of formats) {
    switch (f) {
      case "multiple_choice":
        lines.push(`- multiple_choice: 5 opsi (A, B, C, D, E). Satu jawaban benar.`);
        break;
      case "true_false_not_given":
        lines.push(`- true_false_not_given: Soal dengan opsi TRUE (Benar), FALSE (Salah), NOT_GIVEN (Tidak dapat disimpulkan).`);
        break;
      case "situational_judgment":
        lines.push(`- situational_judgment: Skenario singkat sebagai passageText. 5 opsi respons dengan optionWeights [5,4,3,2,1].`);
        break;
      default:
        break;
    }
  }
  return lines.join("\n") || "- multiple_choice: 5 opsi (A, B, C, D, E) dengan satu jawaban benar.";
}

export function buildCpnsAgenticPrompt(input: GenerationInput, passage?: string): string {
  const { examType, section, formats, difficulty, topics, questionCount } = input;

  const sectionRules = getSectionRules(section, topics);
  const formatSection = getFormatInstructions(section, formats);

  const passageBlock = passage
    ? `\n\nPASSAGE (gunakan ini sebagai referensi soal):\n"""\n${passage}\n"""`
    : "";

  return `Anda adalah ahli pembuat soal CPNS SKD.

${getSectionHeader(section)}

Jumlah soal: ${questionCount}
TINGKAT KESULITAN: ${difficulty}/5
SECTION: ${section}${passageBlock}

${buildContentLanguageRules(examType)}

${sectionRules}

INSTRUKSI FORMAT SOAL:
${formatSection}

Return ONLY valid JSON with schema:
{
  "questions": [
    {
      "format": "...",
      "passageText": "...",
      "questionText": "...",
      "options": [{"key": "A", "text": "..."}, ...],
      "correctAnswer": "...",
      "explanation": "...",
      "difficulty": ${difficulty},
      "skillTags": ["tag1", "tag2"],
      "optionWeights": null
    }
  ]
}`;
}
