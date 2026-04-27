export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
}

export interface ChatCompletionResult {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// Simple debug logger that works in both Node and Bun
function log(
  level: "info" | "error" | "warn",
  message: string,
  meta?: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  // eslint-disable-next-line no-console
  console[level](`[${timestamp}] [AI-CLIENT] ${level.toUpperCase()}: ${message}${metaStr}`);
}

function parseSSELine(line: string): { content?: string; usage?: ChatCompletionResult["usage"] } | null {
  if (!line.startsWith("data: ")) return null;
  const data = line.slice(6).trim();
  if (data === "[DONE]") return null;
  try {
    const chunk = JSON.parse(data);
    const content = chunk.choices?.[0]?.delta?.content;
    const usage = chunk.usage;
    return { content: typeof content === "string" ? content : undefined, usage };
  } catch {
    return null;
  }
}

async function readSSEStream(
  reader: any,
  callbacks: StreamCallbacks,
): Promise<{ content: string; usage?: ChatCompletionResult["usage"] }> {
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let lastUsage: ChatCompletionResult["usage"] | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const parsed = parseSSELine(line);
      if (!parsed) continue;
      if (parsed.content) {
        fullContent += parsed.content;
        callbacks.onToken(parsed.content);
      }
      if (parsed.usage) {
        lastUsage = parsed.usage;
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const parsed = parseSSELine(buffer.trim());
    if (parsed) {
      if (parsed.content) {
        fullContent += parsed.content;
        callbacks.onToken(parsed.content);
      }
      if (parsed.usage) {
        lastUsage = parsed.usage;
      }
    }
  }

  return { content: fullContent, usage: lastUsage };
}

export class OpenAICompatibleClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async chatCompletion(
    opts: ChatCompletionOptions,
    callbacks?: StreamCallbacks,
  ): Promise<ChatCompletionResult> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const stream = true;
    const body = {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      stream,
      ...(opts.max_tokens ? { max_tokens: opts.max_tokens } : {}),
      ...(opts.response_format ? { response_format: opts.response_format } : {}),
    };

    log("info", "Sending chat completion request", {
      url,
      model: opts.model,
      messageCount: opts.messages.length,
      maxTokens: opts.max_tokens,
      stream,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000),
    });

    log("info", "Received response", {
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get("content-type"),
    });

    if (!res.ok) {
      const text = await res.text();
      const preview = text.slice(0, 500);
      log("error", "API request failed", {
        status: res.status,
        statusText: res.statusText,
        preview,
        isHtml: preview.trim().startsWith("<"),
      });

      if (preview.trim().startsWith("<")) {
        throw new Error(
          `Provider returned HTML instead of JSON (status ${res.status}). ` +
            `This usually means the base URL or endpoint is wrong, or the provider does not support this API. ` +
            `Preview: ${preview.slice(0, 200)}`,
        );
      }

      throw new Error(`OpenAI-compatible API error ${res.status}: ${preview}`);
    }

    if (!res.body) {
      throw new Error("Empty response body from API");
    }

    const reader = res.body.getReader() as any;
    const result = await readSSEStream(
      reader,
      callbacks ?? { onToken: () => {} },
    );

    // Defense: if content looks like HTML, something went wrong with streaming
    if (result.content.trim().startsWith("<")) {
      const preview = result.content.slice(0, 500);
      log("error", "Stream returned HTML instead of JSON", {
        preview: preview.slice(0, 200),
      });
      throw new Error(
        `Provider returned HTML in stream instead of JSON. ` +
          `The provider may not support SSE streaming. ` +
          `Preview: ${preview.slice(0, 200)}`,
      );
    }

    if (!result.content) {
      throw new Error("Empty response from AI");
    }

    log("info", "Chat completion successful", {
      contentLength: result.content.length,
      usage: result.usage,
    });

    return result;
  }
}
