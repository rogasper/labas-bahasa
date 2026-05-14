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

function looksTruncated(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length === 0) return false;
  // JSON object/array should end with } or ]
  const lastChar = trimmed[trimmed.length - 1];
  if (lastChar === "}" || lastChar === "]") return false;
  // Check for common truncation signatures
  const unterminated = /Unterminated string|Unexpected end of JSON|Unexpected token/i;
  try {
    JSON.parse(trimmed);
    return false;
  } catch (err: any) {
    if (unterminated.test(err.message)) return true;
  }
  return false;
}

function isResponseFormatError(status: number, text: string): boolean {
  if (status !== 400 && status !== 422) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("response_format") ||
    lower.includes("json mode") ||
    lower.includes("json_object") ||
    lower.includes("unsupported parameter")
  );
}

const METADATA_HOSTS = new Set([
  "169.254.169.254",              // AWS / GCP / Azure metadata
  "metadata.google.internal",     // GCP metadata
  "metadata",                     // some cloud providers
  "100.100.100.200",              // Alibaba Cloud metadata
]);

const RFC1918_PATTERN = /^(?:10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)$/;

function isMetadataOrPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (METADATA_HOSTS.has(lower)) return true;
  // Allow loopback (localhost/127.0.0.1/::1) for local model backends
  // Block RFC1918 only in production — dev may have LAN model servers
  if (RFC1918_PATTERN.test(hostname) && process.env.NODE_ENV === "production") return true;
  return false;
}

function sanitizeForLog(text: string, maxLen = 300): string {
  return text
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
    .slice(0, maxLen);
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
    return this._doChatCompletion(opts, callbacks, { attempt: 1 });
  }

  private async _doChatCompletion(
    opts: ChatCompletionOptions,
    callbacks: StreamCallbacks | undefined,
    ctx: { attempt: number; retriedForTruncation?: boolean; retriedForResponseFormat?: boolean },
  ): Promise<ChatCompletionResult> {
    let hostname: string;
    try {
      hostname = new URL(this.baseUrl).hostname;
    } catch {
      throw new Error(`Invalid base URL: ${this.baseUrl}`);
    }

    if (isMetadataOrPrivateHost(hostname)) {
      throw new Error(`Requests to metadata/private network addresses are not allowed`);
    }

    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const stream = true;
    const body: Record<string, unknown> = {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      stream,
    };
    if (opts.max_tokens) body.max_tokens = opts.max_tokens;
    if (opts.response_format && !ctx.retriedForResponseFormat) {
      body.response_format = opts.response_format;
    }

    log("info", "Sending chat completion request", {
      url: sanitizeForLog(url, 200),
      model: opts.model,
      messageCount: opts.messages.length,
      maxTokens: opts.max_tokens,
      stream,
      attempt: ctx.attempt,
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
      const preview = sanitizeForLog(text, 500);
      log("error", "API request failed", {
        status: res.status,
        statusText: res.statusText,
        preview,
        isHtml: preview.trim().startsWith("<"),
      });

      // Retry without response_format if provider doesn't support it
      if (!ctx.retriedForResponseFormat && isResponseFormatError(res.status, preview)) {
        log("warn", "Provider rejected response_format, retrying without it");
        return this._doChatCompletion(opts, callbacks, {
          ...ctx,
          attempt: ctx.attempt + 1,
          retriedForResponseFormat: true,
        });
      }

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

    // Truncation detection + retry
    if (!ctx.retriedForTruncation && looksTruncated(result.content)) {
      const newMaxTokens = opts.max_tokens
        ? Math.min(Math.round(opts.max_tokens * 1.5), 128_000)
        : 16_384;
      log("warn", "Response looks truncated, retrying with more tokens", {
        originalLength: result.content.length,
        originalMaxTokens: opts.max_tokens,
        newMaxTokens,
      });
      return this._doChatCompletion(
        { ...opts, max_tokens: newMaxTokens },
        callbacks,
        { ...ctx, attempt: ctx.attempt + 1, retriedForTruncation: true },
      );
    }

    log("info", "Chat completion successful", {
      contentLength: result.content.length,
      usage: result.usage,
    });

    return result;
  }
}
