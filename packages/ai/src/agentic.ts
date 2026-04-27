import { OpenAICompatibleClient } from "./client";
import { questionSchema, type GenerationInput, type GenerationResult } from "./schemas";

interface AgenticStep {
  step: string;
  status: "running" | "done" | "error" | "pending";
  message?: string;
}

export interface AgenticProgress {
  steps: AgenticStep[];
  currentStep: number;
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
): Promise<{ passage: string; title: string }> {
  const prompt = `Generate an authentic, high-quality reading passage for ${input.examType} ${input.section.toLowerCase()} section at difficulty level ${input.difficulty}/5.

Requirements:
- Language: ${getTargetLanguage(input.examType)}
- Topics: ${input.topics.join(", ")}
- Difficulty: ${input.difficulty}/5
- The passage should be natural, well-structured, and appropriate for the exam level
- Length should be suitable for ${input.questionCount} comprehension questions

Return ONLY valid JSON:
{
  "title": "Brief title describing the passage topic",
  "passage": "The full reading passage text..."
}`;

  const result = await client.chatCompletion({
    model: input.apiKeyConfig.model,
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: input.apiKeyConfig.maxTokens,
  });

  const parsed = parseJsonResponse(result.content) as Record<string, unknown>;
  if (!parsed.passage || typeof parsed.passage !== "string") {
    throw new Error("Invalid passage generation response");
  }
  return {
    passage: parsed.passage,
    title: typeof parsed.title === "string" ? parsed.title : "Untitled Passage",
  };
}

async function step2ValidatePassage(
  client: OpenAICompatibleClient,
  input: GenerationInput,
  passage: string,
): Promise<{ isValid: boolean; feedback: string }> {
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

Return ONLY valid JSON:
{
  "isValid": true/false,
  "feedback": "Brief assessment. If invalid, explain why.",
  "score": number from 1-10
}`;

  const result = await client.chatCompletion({
    model: input.apiKeyConfig.model,
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: input.apiKeyConfig.maxTokens,
  });

  const parsed = parseJsonResponse(result.content) as Record<string, unknown>;
  return {
    isValid: !!parsed.isValid,
    feedback: typeof parsed.feedback === "string" ? parsed.feedback : "No feedback",
  };
}

async function step3GenerateQuestions(
  client: OpenAICompatibleClient,
  input: GenerationInput,
  passage: string,
): Promise<Array<Record<string, unknown>>> {
  const formats = input.formats;
  const formatInstructions = formats
    .map((f) => {
      const schemas: Record<string, string> = {
        multiple_choice: `{"format":"multiple_choice","questionText":"...","options":[{"key":"A","text":"..."},...],"correctAnswer":"A","explanation":"...","difficulty":${input.difficulty},"skillTags":["..."]`,
        true_false_not_given: `{"format":"true_false_not_given","questionText":"...","correctAnswer":"TRUE|FALSE|NOT_GIVEN","explanation":"...","difficulty":${input.difficulty},"skillTags":["..."]`,
        fill_blank: `{"format":"fill_blank","questionText":"...","correctAnswer":"exact text","explanation":"...","difficulty":${input.difficulty},"skillTags":["..."]`,
        synonym: `{"format":"synonym","questionText":"...","options":[{"key":"A","text":"..."},...],"correctAnswer":"A","explanation":"...","difficulty":${input.difficulty},"skillTags":["vocabulary","synonym"]`,
        grammar_in_context: `{"format":"grammar_in_context","questionText":"...","options":[{"key":"A","text":"..."},...],"correctAnswer":"A","explanation":"...","difficulty":${input.difficulty},"skillTags":["grammar"]`,
        sentence_completion: `{"format":"sentence_completion","questionText":"...","options":[{"key":"A","text":"..."},...],"correctAnswer":"A","explanation":"...","difficulty":${input.difficulty},"skillTags":["..."]`,
        cloze: `{"format":"cloze","questionText":"...","options":[{"key":"A","text":"..."},...],"correctAnswer":"serialized mapping","explanation":"...","difficulty":${input.difficulty},"skillTags":["grammar","vocabulary"]`,
        reference: `{"format":"reference","questionText":"...","options":[{"key":"A","text":"..."},...],"correctAnswer":"A","explanation":"...","difficulty":${input.difficulty},"skillTags":["reference","inference"]`,
        author_view: `{"format":"author_view","questionText":"...","correctAnswer":"YES|NO|NOT_GIVEN","explanation":"...","difficulty":${input.difficulty},"skillTags":["inference","author_view"]`,
        matching_headings: `{"format":"matching_headings","questionText":"Match each paragraph to a heading:","options":[{"key":"i","text":"..."},...],"correctAnswer":"serialized mapping","explanation":"...","difficulty":${input.difficulty},"skillTags":["main_idea","matching"]`,
        kanji_reading: `{"format":"kanji_reading","questionText":"...","options":[{"key":"A","text":"..."},...],"correctAnswer":"A","explanation":"...","difficulty":${input.difficulty},"skillTags":["kanji","reading"]`,
        particle_choice: `{"format":"particle_choice","questionText":"...","options":[{"key":"A","text":"..."},...],"correctAnswer":"A","explanation":"...","difficulty":${input.difficulty},"skillTags":["grammar","particle"]`,
        article_case: `{"format":"article_case","questionText":"...","options":[{"key":"A","text":"..."},...],"correctAnswer":"A","explanation":"...","difficulty":${input.difficulty},"skillTags":["grammar","article","case"]`,
      };
      return schemas[f] || schemas["multiple_choice"];
    })
    .join("\n---\n");

  const prompt = `Using the following passage, generate ${input.questionCount} reading comprehension questions for ${input.examType} exam.

Passage:
"""
${passage}
"""

Formats to generate:
${formatInstructions}

Rules:
- Each question must be directly answerable from the passage
- Use "passageText" field with the relevant excerpt from the passage (or full passage if needed)
- Questions should test real comprehension, not surface recall
- For multiple choice: always provide 4 options (A, B, C, D) with one clearly correct answer
- Options must be plausible distractors

Return ONLY valid JSON:
{
  "questions": [
    // array of question objects matching the format schemas above
  ]
}`;

  const result = await client.chatCompletion({
    model: input.apiKeyConfig.model,
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: input.apiKeyConfig.maxTokens,
  });

  const parsed = parseJsonResponse(result.content) as Record<string, unknown>;
  if (!Array.isArray(parsed.questions)) {
    throw new Error("Missing questions array in AI response");
  }
  return parsed.questions as Array<Record<string, unknown>>;
}

async function step4SelfValidate(
  client: OpenAICompatibleClient,
  input: GenerationInput,
  passage: string,
  questions: Array<Record<string, unknown>>,
): Promise<{ correctedQuestions: Array<Record<string, unknown>>; confidence: number }> {
  const qaPairs = questions
    .map((q, i) => `Q${i + 1}: ${q.questionText}\nA: ${q.correctAnswer}`)
    .join("\n\n");

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

Return ONLY valid JSON:
{
  "overallConfidence": number from 0-100,
  "issues": [
    {
      "questionIndex": 0-based index,
      "issue": "description of problem",
      "suggestedFix": "corrected answer or explanation"
    }
  ],
  "needsRevision": true/false
}`;

  const result = await client.chatCompletion({
    model: input.apiKeyConfig.model,
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: input.apiKeyConfig.maxTokens,
  });

  const parsed = parseJsonResponse(result.content) as Record<string, unknown>;
  const confidence = typeof parsed.overallConfidence === "number" ? parsed.overallConfidence : 75;
  const issues = Array.isArray(parsed.issues) ? parsed.issues : [];

  // Apply fixes if needed
  const corrected = questions.map((q, i) => {
    const issue = issues.find((iss: any) => iss?.questionIndex === i);
    if (issue && issue.suggestedFix) {
      return { ...q, explanation: `${q.explanation}\n[Validator note: ${issue.suggestedFix}]` };
    }
    return q;
  });

  return { correctedQuestions: corrected, confidence };
}

export async function generateQuestionsAgentic(
  input: GenerationInput,
  onProgress?: (progress: AgenticProgress) => void,
): Promise<GenerationResult> {
  const start = Date.now();
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

  const report = (current: number) => {
    if (onProgress) {
      onProgress({ steps, currentStep: current });
    }
  };

  // Step 1: Generate passage
  report(0);
  const { passage, title } = await step1GeneratePassage(client, input);
  steps[0].status = "done";
  steps[0].message = `Generated: ${title}`;

  // Step 2: Validate passage
  steps[1].status = "running";
  report(1);
  const validation = await step2ValidatePassage(client, input, passage);
  steps[1].status = validation.isValid ? "done" : "error";
  steps[1].message = validation.feedback;

  // Even if not perfect, continue (the feedback is logged)

  // Step 3: Generate questions
  steps[2].status = "running";
  report(2);
  const rawQuestions = await step3GenerateQuestions(client, input, passage);
  steps[2].status = "done";
  steps[2].message = `Generated ${rawQuestions.length} questions`;

  // Step 4: Self-validate
  steps[3].status = "running";
  report(3);
  const { correctedQuestions, confidence } = await step4SelfValidate(
    client,
    input,
    passage,
    rawQuestions,
  );
  steps[3].status = "done";
  steps[3].message = `Confidence score: ${confidence}%`;

  // Parse and validate final questions
  const questions = correctedQuestions
    .map((q) => {
      try {
        return questionSchema.parse({ ...q, passageText: passage });
      } catch (e) {
        console.warn("Question validation failed:", e);
        return null;
      }
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  if (questions.length === 0) {
    throw new Error("No valid questions generated after agentic validation");
  }

  return {
    questions,
    meta: {
      model: input.apiKeyConfig.model,
      durationMs: Date.now() - start,
      mode: "agentic",
    },
  };
}
