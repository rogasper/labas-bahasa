import { OpenAICompatibleClient } from "./client";
import { GenerationError } from "./errors";
import { buildQuickModePrompt } from "./prompts";
import { repairAndParseQuestions } from "./repair";
import { regenerateQuestions, buildRegenerationContext } from "./regenerate-questions";
import {
  type GenerationInput,
  type GenerationResult,
} from "./schemas";

const MAX_QUICK_REGEN_ATTEMPTS = 2;

export interface QuickModeCallbacks {
  onToken?: (token: string) => void;
}

function log(level: "info" | "error" | "warn", message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  // eslint-disable-next-line no-console
  console[level](`[${timestamp}] [PIPELINE] ${level.toUpperCase()}: ${message}${metaStr}`);
}

export async function generateQuestionsQuick(
  input: GenerationInput,
  callbacks?: QuickModeCallbacks,
): Promise<GenerationResult> {
  const start = Date.now();
  log("info", "Quick mode generation started", {
    model: input.apiKeyConfig.model,
    baseUrl: input.apiKeyConfig.baseUrl,
    examType: input.examType,
    section: input.section,
    questionCount: input.questionCount,
    formats: input.formats,
    maxTokens: input.apiKeyConfig.maxTokens,
  });

  const client = new OpenAICompatibleClient(
    input.apiKeyConfig.baseUrl,
    input.apiKeyConfig.apiKey,
  );

  const prompt = buildQuickModePrompt(input);
  log("info", "Prompt built", { promptLength: prompt.length });

  let result;
  try {
    result = await client.chatCompletion(
      {
        model: input.apiKeyConfig.model,
        messages: [
          {
            role: "system",
            content:
              "You are a precise exam question generator. You always return valid JSON. You never include markdown formatting around the JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: input.apiKeyConfig.maxTokens,
        response_format: { type: "json_object" },
      },
      callbacks?.onToken
        ? { onToken: callbacks.onToken }
        : undefined,
    );
  } catch (err: any) {
    log("error", "chatCompletion failed in quick mode", { error: err.message });
    throw err;
  }

  const content = result.content;
  const tokensUsed = result.usage?.total_tokens;
  log("info", "Raw response received", { contentLength: content.length, preview: content.slice(0, 200) });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
    log("info", "JSON parsed successfully (direct)");
  } catch (parseErr: any) {
    log("warn", "Direct JSON parse failed, trying markdown strip", { error: parseErr.message });
    const cleaned = content
      .replace(/^```json\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    try {
      parsed = JSON.parse(cleaned);
      log("info", "JSON parsed successfully after markdown strip");
    } catch (stripErr: any) {
      log("error", "JSON parse failed even after markdown strip", {
        error: stripErr.message,
        cleanedPreview: cleaned.slice(0, 500),
        originalPreview: content.slice(0, 500),
      });
      throw new GenerationError(
        `Failed to parse AI response as JSON: ${stripErr.message}. Preview: ${content.slice(0, 200)}`,
        { tokensUsed },
      );
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new GenerationError("Invalid JSON response from AI", { tokensUsed });
  }

  const raw = parsed as Record<string, unknown>;
  if (!Array.isArray(raw.questions)) {
    log("error", "Missing questions array in parsed JSON", { keys: Object.keys(raw) });
    throw new GenerationError("Missing 'questions' array in AI response", { tokensUsed });
  }

  log("info", "Validating & repairing questions", { rawCount: raw.questions.length });

  // Extract a representative passage text for repair fallback
  const firstWithPassage = raw.questions.find(
    (q: any) => q && typeof q === "object" && typeof q.passageText === "string" && q.passageText.length >= 50,
  ) as any;
  const fallbackPassage = firstWithPassage?.passageText ?? "No passage available.";

  let { valid: validQuestions, invalid: pendingInvalid, repairLog } = repairAndParseQuestions(
    raw.questions,
    fallbackPassage,
    { examType: input.examType },
  );

  let accumulatedTokens = tokensUsed ?? 0;

  for (let attempt = 0; attempt < MAX_QUICK_REGEN_ATTEMPTS && pendingInvalid.length > 0; attempt++) {
    log("warn", "Regenerating invalid questions in quick mode", {
      attempt: attempt + 1,
      count: pendingInvalid.length,
    });

    const context = buildRegenerationContext(pendingInvalid);
    const regen = await regenerateQuestions(
      client,
      input,
      fallbackPassage,
      pendingInvalid.length,
      context,
      callbacks?.onToken,
    );
    accumulatedTokens += regen.tokensUsed ?? 0;

    const regenResult = repairAndParseQuestions(regen.questions, fallbackPassage, {
      examType: input.examType,
    });
    validQuestions = [...validQuestions, ...regenResult.valid];
    pendingInvalid = regenResult.invalid;
    if (regenResult.repairLog.length > 0) {
      repairLog = [...repairLog, ...regenResult.repairLog.map((l) => `[Regen ${attempt + 1}] ${l}`)];
    }
  }

  if (repairLog.length > 0) {
    log("warn", "Repairs applied", { count: repairLog.length, details: repairLog });
  }
  if (pendingInvalid.length > 0) {
    log("warn", "Invalid questions after repair and regeneration", {
      count: pendingInvalid.length,
      details: pendingInvalid.map((i) => ({ index: i.index, errors: i.errors })),
    });
  }

  if (validQuestions.length === 0) {
    log("error", "No valid questions after repair", { rawCount: raw.questions.length });
    throw new GenerationError("No valid questions generated", { tokensUsed: accumulatedTokens });
  }

  log("info", "Quick mode generation completed", {
    validCount: validQuestions.length,
    rawCount: raw.questions.length,
    durationMs: Date.now() - start,
  });

  const questions = validQuestions;

  return {
    questions,
    meta: {
      model: input.apiKeyConfig.model,
      tokensUsed: accumulatedTokens,
      durationMs: Date.now() - start,
      mode: "quick",
    },
  };
}
