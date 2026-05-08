import { OpenAICompatibleClient } from "./client";
import { GenerationError } from "./errors";
import {
  getPassageJsonSchemaDescription,
  getValidationJsonSchemaDescription,
  getSelfValidationJsonSchemaDescription,
} from "./schema-to-prompt";
import {
  getGenericQuestionJsonSchemaDescription,
  repairAndParseQuestions,
} from "./repair";
import { type GenerationInput, type GenerationResult } from "./schemas";

interface AgenticStep {
  step: string;
  status: "running" | "done" | "error" | "pending";
  message?: string;
  output?: string;
}

export interface AgenticProgress {
  steps: AgenticStep[];
  currentStep: number;
}

export type AgenticGenerationStrategy = "full" | "lean";

export interface AgenticGenerationOptions {
  strategy?: AgenticGenerationStrategy;
  maxRegenerateAttempts?: number;
}

function getSystemPrompt(): string {
  return "You are a precise exam question generator. You always return valid JSON. You never include markdown formatting around the JSON.";
}

function getTargetLanguage(examType: string): string {
  if (examType === "JLPT") return "Japanese";
  if (examType === "HSK") return "Chinese";
  if (examType === "GOETHE") return "German";
  return "English";
}

/** Estimate max tokens needed per step to avoid truncation. */
function calculateMaxTokens(
  userMax: number,
  step: "passage" | "validate" | "questions" | "self_validate" | "regenerate",
  questionCount: number,
): number {
  const base = userMax > 0 ? userMax : 16_384;
  switch (step) {
    case "passage":
      return Math.min(base, 8_192);
    case "validate":
      return Math.min(base, 4_096);
    case "self_validate":
      return Math.min(base, 4_096);
    case "questions":
      // Rough estimate: ~500 tokens per question JSON + overhead
      return Math.min(Math.max(base, 2_000 + questionCount * 600), 64_000);
    case "regenerate":
      return Math.min(Math.max(base, 2_000 + questionCount * 600), 64_000);
    default:
      return base;
  }
}

function parseJsonResponse(content: string): unknown {
  if (!content) throw new Error("Empty response from AI");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const cleaned = content
      .replace(/^```json\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  }
  return parsed;
}

async function step1GeneratePassage(
  client: OpenAICompatibleClient,
  input: GenerationInput,
  onToken?: (token: string) => void,
): Promise<{ passage: string; title: string; tokensUsed: number }> {
  const schema = getPassageJsonSchemaDescription();
  const prompt = `Generate an authentic, high-quality reading passage for ${input.examType} ${input.section.toLowerCase()} section at difficulty level ${input.difficulty}/5.

Requirements:
- Language: ${getTargetLanguage(input.examType)}
- Topics: ${input.topics.join(", ")}
- Difficulty: ${input.difficulty}/5
- The passage should be natural, well-structured, and appropriate for the exam level
- Length should be suitable for ${input.questionCount} comprehension questions

Return ONLY valid JSON conforming to this schema:
${schema}`;

  const result = await client.chatCompletion(
    {
      model: input.apiKeyConfig.model,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: calculateMaxTokens(input.apiKeyConfig.maxTokens, "passage", input.questionCount),
      response_format: { type: "json_object" },
    },
    onToken ? { onToken } : undefined,
  );

  const parsed = parseJsonResponse(result.content) as Record<string, unknown>;
  if (!parsed.passage || typeof parsed.passage !== "string") {
    throw new Error("Invalid passage generation response");
  }
  return {
    passage: parsed.passage,
    title: typeof parsed.title === "string" ? parsed.title : "Untitled Passage",
    tokensUsed: result.usage?.total_tokens ?? 0,
  };
}

async function step2ValidatePassage(
  client: OpenAICompatibleClient,
  input: GenerationInput,
  passage: string,
  onToken?: (token: string) => void,
): Promise<{ isValid: boolean; feedback: string; tokensUsed: number }> {
  const schema = getValidationJsonSchemaDescription();
  const prompt = `Validate this reading passage for a ${input.examType} exam at difficulty ${input.difficulty}/5.

Passage:
"""
${passage}
"""

Check:
1. Grammar and spelling correctness
2. Difficulty appropriateness (${input.difficulty}/5)
3. Length sufficiency for ${input.questionCount} questions
4. Topic relevance: ${input.topics.join(", ")}
5. Natural flow and coherence

Return ONLY valid JSON conforming to this schema:
${schema}`;

  const result = await client.chatCompletion(
    {
      model: input.apiKeyConfig.model,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: calculateMaxTokens(input.apiKeyConfig.maxTokens, "validate", input.questionCount),
      response_format: { type: "json_object" },
    },
    onToken ? { onToken } : undefined,
  );

  const parsed = parseJsonResponse(result.content) as Record<string, unknown>;
  return {
    isValid: !!parsed.isValid,
    feedback: typeof parsed.feedback === "string" ? parsed.feedback : "No feedback",
    tokensUsed: result.usage?.total_tokens ?? 0,
  };
}

async function step3GenerateQuestions(
  client: OpenAICompatibleClient,
  input: GenerationInput,
  passage: string,
  count: number,
  onToken?: (token: string) => void,
): Promise<{ questions: Array<Record<string, unknown>>; tokensUsed: number }> {
  const schema = getGenericQuestionJsonSchemaDescription();

  const prompt = `Using the following passage, generate ${count} reading comprehension questions for ${input.examType} exam.

Passage:
"""
${passage}
"""

Formats to generate: ${input.formats.join(", ")}

Rules:
- Each question must be directly answerable from the passage
- Use "passageText" field with the relevant excerpt from the passage (or full passage if needed)
- Questions should test real comprehension, not surface recall
- For multiple choice: always provide 4 options (A, B, C, D) with one clearly correct answer
- Options must be plausible distractors
- explanation — WAJIB ditulis dalam Bahasa Indonesia. DILARANG menggunakan bahasa asing.
- For true_false_not_given: correctAnswer must be exactly TRUE, FALSE, or NOT_GIVEN (uppercase)
- For author_view: correctAnswer must be exactly YES, NO, or NOT_GIVEN (uppercase)

Question schema:
${schema}

Return ONLY valid JSON conforming to this schema.`;

  const result = await client.chatCompletion(
    {
      model: input.apiKeyConfig.model,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: calculateMaxTokens(input.apiKeyConfig.maxTokens, "questions", count),
      response_format: { type: "json_object" },
    },
    onToken ? { onToken } : undefined,
  );

  const parsed = parseJsonResponse(result.content) as Record<string, unknown>;
  if (!Array.isArray(parsed.questions)) {
    throw new Error("Missing questions array in AI response");
  }
  return {
    questions: parsed.questions as Array<Record<string, unknown>>,
    tokensUsed: result.usage?.total_tokens ?? 0,
  };
}

async function step4SelfValidate(
  client: OpenAICompatibleClient,
  input: GenerationInput,
  passage: string,
  questions: Array<Record<string, unknown>>,
  onToken?: (token: string) => void,
): Promise<{ confidence: number; issues: any[]; tokensUsed: number }> {
  const qaPairs = questions
    .map((q, i) => `Q${i + 1}: ${q.questionText}\nA: ${q.correctAnswer}`)
    .join("\n\n");

  const schema = getSelfValidationJsonSchemaDescription();
  const prompt = `You are a strict exam validator. Review these questions against the passage and identify any errors.

Passage:
"""
${passage}
"""

Questions & Claimed Answers:
${qaPairs}

For each question, verify:
1. Is the claimed answer truly correct based on the passage?
2. Are there any ambiguous questions?
3. Are distractors plausible but clearly wrong?

Return ONLY valid JSON conforming to this schema:
${schema}`;

  const result = await client.chatCompletion(
    {
      model: input.apiKeyConfig.model,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: calculateMaxTokens(input.apiKeyConfig.maxTokens, "self_validate", input.questionCount),
      response_format: { type: "json_object" },
    },
    onToken ? { onToken } : undefined,
  );

  const parsed = parseJsonResponse(result.content) as Record<string, unknown>;
  const confidence = typeof parsed.overallConfidence === "number" ? parsed.overallConfidence : 75;
  const issues = Array.isArray(parsed.issues) ? parsed.issues : [];

  return { confidence, issues, tokensUsed: result.usage?.total_tokens ?? 0 };
}

async function stepRegenerateQuestions(
  client: OpenAICompatibleClient,
  input: GenerationInput,
  passage: string,
  count: number,
  context: string,
  onToken?: (token: string) => void,
): Promise<{ questions: Array<Record<string, unknown>>; tokensUsed: number }> {
  const schema = getGenericQuestionJsonSchemaDescription();

  const prompt = `You are an expert exam question writer. ${context}

Passage:
"""
${passage}
"""

Generate ${count} new reading comprehension questions for ${input.examType} exam.
Formats: ${input.formats.join(", ")}
Difficulty: ${input.difficulty}/5

Rules:
- Each question must be directly answerable from the passage
- Use "passageText" field with relevant excerpt (or full passage)
- For multiple choice: provide 4 options (A, B, C, D)
- explanation — WAJIB ditulis dalam Bahasa Indonesia. DILARANG menggunakan bahasa asing.
- For true_false_not_given: correctAnswer must be TRUE, FALSE, or NOT_GIVEN (uppercase)
- For author_view: correctAnswer must be YES, NO, or NOT_GIVEN (uppercase)

Question schema:
${schema}

Return ONLY valid JSON conforming to this schema.`;

  const result = await client.chatCompletion(
    {
      model: input.apiKeyConfig.model,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: calculateMaxTokens(input.apiKeyConfig.maxTokens, "regenerate", count),
      response_format: { type: "json_object" },
    },
    onToken ? { onToken } : undefined,
  );

  const parsed = parseJsonResponse(result.content) as Record<string, unknown>;
  if (!Array.isArray(parsed.questions)) {
    throw new Error("Missing questions array in regeneration response");
  }
  return {
    questions: parsed.questions as Array<Record<string, unknown>>,
    tokensUsed: result.usage?.total_tokens ?? 0,
  };
}

export async function generateQuestionsAgentic(
  input: GenerationInput,
  onProgress?: (progress: AgenticProgress) => void,
  onToken?: (token: string) => void,
  options?: AgenticGenerationOptions,
): Promise<GenerationResult> {
  const start = Date.now();
  const strategy = options?.strategy ?? "full";
  const maxRegenAttempts = Math.max(0, options?.maxRegenerateAttempts ?? (strategy === "lean" ? 1 : 2));
  const client = new OpenAICompatibleClient(
    input.apiKeyConfig.baseUrl,
    input.apiKeyConfig.apiKey,
  );

  const steps: [AgenticStep, AgenticStep, AgenticStep, AgenticStep] = [
    { step: "generate_passage", status: "running" },
    { step: "validate_passage", status: "pending" as any },
    { step: "generate_questions", status: "pending" as any },
    { step: "self_validate", status: "pending" as any },
  ];

  const report = (current: number, extraMsg?: string) => {
    if (extraMsg && steps[current]) {
      steps[current]!.message = extraMsg;
    }
    if (onProgress) {
      onProgress({ steps, currentStep: current });
    }
  };

  let accumulatedTokens = 0;

  // ── Step 1: Generate passage ────────────────────────────
  report(0);
  let passage: string;
  let title: string;
  try {
    const s1 = await step1GeneratePassage(client, input, onToken);
    passage = s1.passage;
    title = s1.title;
    accumulatedTokens += s1.tokensUsed;
    steps[0].status = "done";
    steps[0].message = `Generated: ${title}`;
    steps[0].output = passage;
  } catch (err: any) {
    steps[0].status = "error";
    steps[0].message = err.message ?? "Passage generation failed";
    throw new GenerationError(`Step 1 failed: ${err.message}`, { tokensUsed: accumulatedTokens });
  }

  // ── Step 2: Validate passage ────────────────────────────
  if (strategy === "full") {
    steps[1].status = "running";
    report(1);
    try {
      const s2 = await step2ValidatePassage(client, input, passage, onToken);
      accumulatedTokens += s2.tokensUsed;
      steps[1].status = s2.isValid ? "done" : "error";
      steps[1].message = s2.feedback;
      steps[1].output = JSON.stringify({ isValid: s2.isValid, feedback: s2.feedback }, null, 2);
    } catch (err: any) {
      steps[1].status = "error";
      steps[1].message = err.message ?? "Passage validation failed";
      throw new GenerationError(`Step 2 failed: ${err.message}`, { tokensUsed: accumulatedTokens });
    }
  } else {
    steps[1].status = "done";
    steps[1].message = "Skipped in lean strategy";
    report(1, steps[1].message);
  }

  // ── Step 3: Generate questions ──────────────────────────
  steps[2].status = "running";
  report(2, `Generating ${input.questionCount} questions...`);
  let rawQuestions: Array<Record<string, unknown>>;
  try {
    const s3 = await step3GenerateQuestions(client, input, passage, input.questionCount, onToken);
    rawQuestions = s3.questions;
    accumulatedTokens += s3.tokensUsed;
    steps[2].message = `Generated ${rawQuestions.length} questions`;
    steps[2].output = rawQuestions.map((q, i) => `${i + 1}. [${q.format}] ${q.questionText}`).join("\n");
  } catch (err: any) {
    steps[2].status = "error";
    steps[2].message = err.message ?? "Question generation failed";
    throw new GenerationError(`Step 3 failed: ${err.message}`, { tokensUsed: accumulatedTokens });
  }

  // ── Step 4: Self-validate + Repair + Regenerate loop ─────
  steps[3].status = "running";
  report(3, "Validating & repairing questions...");

  let validQuestions: any[] = [];
  let allRepairLogs: string[] = [];

  try {
    let selfValidationConfidence = 0;
    if (strategy === "full") {
      const s4 = await step4SelfValidate(client, input, passage, rawQuestions, onToken);
      accumulatedTokens += s4.tokensUsed;
      selfValidationConfidence = s4.confidence;
    }

    // Repair & parse
    let { valid, invalid, repairLog } = repairAndParseQuestions(rawQuestions, passage);

    // Move questions with non-Indonesian (CJK) explanations to invalid for regeneration
    const hasCJK = (text: string) => /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(text);
    const cjkInvalid: Array<{ index: number; raw: unknown; errors: string[] }> = [];
    const filteredValid: typeof valid = [];
    for (let vi = 0; vi < valid.length; vi++) {
      const q = valid[vi];
      if (!q) continue;
      if (q.explanation && hasCJK(q.explanation)) {
        cjkInvalid.push({
          index: vi,
          raw: q,
          errors: ["explanation contains CJK characters (should be Bahasa Indonesia)"],
        });
        repairLog.push(`Q${vi + 1}: explanation contains CJK characters, moved to regeneration queue`);
      } else {
        filteredValid.push(q);
      }
    }
    validQuestions = filteredValid;
    invalid = [...invalid, ...cjkInvalid];
    allRepairLogs.push(...repairLog);

    // Regenerate structural-invalid questions with bounded attempts
    let regenerationAttempts = 0;

    while (invalid.length > 0 && regenerationAttempts < maxRegenAttempts && validQuestions.length < input.questionCount) {
      regenerationAttempts++;
      const regenCount = Math.min(invalid.length, input.questionCount - validQuestions.length);
      const context = `The previous ${regenCount} question(s) had structural errors: ${invalid.map((i) => `Q${i.index + 1}: ${i.errors.join(", ")}`).join("; ")}.`;

      report(3, `Regenerating ${regenCount} invalid question(s) (attempt ${regenerationAttempts}/${maxRegenAttempts})...`);

      const regen = await stepRegenerateQuestions(client, input, passage, regenCount, context, onToken);
      accumulatedTokens += regen.tokensUsed;

      const regenResult = repairAndParseQuestions(regen.questions, passage);
      validQuestions.push(...regenResult.valid);
      allRepairLogs.push(...regenResult.repairLog.map((l) => `[Regen ${regenerationAttempts}] ${l}`));

      // If regeneration produced valid questions, remove corresponding invalid entries
      if (regenResult.valid.length > 0) {
        invalid = invalid.slice(regenResult.valid.length);
      } else {
        // No progress — break to avoid infinite loop
        break;
      }
    }

    // If still below target, generate additional questions
    if (validQuestions.length < input.questionCount) {
      const needMore = input.questionCount - validQuestions.length;
      report(3, `Generating ${needMore} additional question(s)...`);
      const extra = await stepRegenerateQuestions(
        client, input, passage, needMore,
        `Need ${needMore} more valid questions to reach target of ${input.questionCount}.`,
        onToken,
      );
      accumulatedTokens += extra.tokensUsed;
      const extraResult = repairAndParseQuestions(extra.questions, passage);
      validQuestions.push(...extraResult.valid);
      allRepairLogs.push(...extraResult.repairLog.map((l) => `[Extra] ${l}`));
    }

    steps[3].status = "done";
    steps[3].message =
      strategy === "full"
        ? `Validated ${validQuestions.length}/${input.questionCount} questions. Confidence: ${selfValidationConfidence}%`
        : `Lean validation completed: ${validQuestions.length}/${input.questionCount} valid`;
    steps[3].output = [
      `Strategy: ${strategy}`,
      ...(strategy === "full" ? [`Overall Confidence: ${selfValidationConfidence}%`] : []),
      `Valid Questions: ${validQuestions.length}/${input.questionCount}`,
      `Repair Log:`,
      ...allRepairLogs,
    ].join("\n");
  } catch (err: any) {
    steps[3].status = "error";
    steps[3].message = err.message ?? "Self-validation failed";
    throw new GenerationError(`Step 4 failed: ${err.message}`, { tokensUsed: accumulatedTokens });
  }

  // ── Final check ─────────────────────────────────────────
  if (validQuestions.length === 0) {
    throw new GenerationError("No valid questions generated after agentic validation", {
      tokensUsed: accumulatedTokens,
    });
  }

  // Trim to requested count (if we overshot)
  const finalQuestions = validQuestions.slice(0, input.questionCount);

  return {
    questions: finalQuestions,
    meta: {
      model: input.apiKeyConfig.model,
      durationMs: Date.now() - start,
      mode: "agentic",
      tokensUsed: accumulatedTokens,
    },
  };
}
