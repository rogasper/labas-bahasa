import { toJSONSchema } from "zod";
import { questionSchema } from "./schemas";

/**
 * Generate a concise JSON-schema description of the question schema
 * suitable for embedding into an LLM prompt.
 */
export function getQuestionJsonSchemaDescription(): string {
  const jsonSchema = toJSONSchema(questionSchema);
  return JSON.stringify(jsonSchema, null, 2);
}

/**
 * Generate a JSON schema description for a passage response.
 */
export function getPassageJsonSchemaDescription(): string {
  return JSON.stringify(
    {
      type: "object",
      properties: {
        title: { type: "string", description: "Brief title describing the passage topic" },
        passage: { type: "string", description: "The full reading passage text" },
      },
      required: ["title", "passage"],
    },
    null,
    2,
  );
}

/**
 * Generate a JSON schema description for a validation response.
 */
export function getValidationJsonSchemaDescription(): string {
  return JSON.stringify(
    {
      type: "object",
      properties: {
        isValid: { type: "boolean" },
        feedback: { type: "string", description: "Brief assessment. If invalid, explain why." },
        score: { type: "number", minimum: 1, maximum: 10 },
      },
      required: ["isValid", "feedback", "score"],
    },
    null,
    2,
  );
}

/**
 * Generate a JSON schema description for the questions array wrapper.
 */
export function getQuestionsArrayJsonSchemaDescription(): string {
  return JSON.stringify(
    {
      type: "object",
      properties: {
        questions: {
          type: "array",
          description: "Array of question objects",
          items: { $ref: "#/$defs/Question" },
        },
      },
      required: ["questions"],
    },
    null,
    2,
  );
}

/**
 * Generate a JSON schema description for the self-validation response.
 */
export function getSelfValidationJsonSchemaDescription(): string {
  return JSON.stringify(
    {
      type: "object",
      properties: {
        overallConfidence: { type: "number", minimum: 0, maximum: 100 },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              questionIndex: { type: "number" },
              issue: { type: "string" },
              suggestedFix: { type: "string" },
            },
            required: ["questionIndex", "issue", "suggestedFix"],
          },
        },
        needsRevision: { type: "boolean" },
      },
      required: ["overallConfidence", "issues", "needsRevision"],
    },
    null,
    2,
  );
}
