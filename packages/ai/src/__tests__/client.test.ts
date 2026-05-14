import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { OpenAICompatibleClient } from "../client";

const BASE_URL = "https://api.openai.com/v1";
const API_KEY = "sk-test-key-12345";
const MODEL = "gpt-4";

function makeMockStream(chunks: string[]): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function makeFetchMock(streamChunks: string[], status = 200) {
  return async () =>
    new Response(makeMockStream(streamChunks), {
      status,
      headers: { "content-type": "text/event-stream" },
    });
}

describe("OpenAICompatibleClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends correct request and parses SSE response", async () => {
    globalThis.fetch = makeFetchMock([
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Hello" } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: " World" } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: {} }], usage: { total_tokens: 10 } })}\n`,
      "data: [DONE]\n",
    ]);

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: "Test" }],
    });

    expect(result.content).toBe("Hello World");
  });

  it("calls onToken callback for each token", async () => {
    globalThis.fetch = makeFetchMock([
      `data: ${JSON.stringify({ choices: [{ delta: { content: "A" } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: "B" } }] })}\n`,
      "data: [DONE]\n",
    ]);

    const tokens: string[] = [];
    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    await client.chatCompletion(
      { model: MODEL, messages: [{ role: "user", content: "Test" }] },
      { onToken: (t) => tokens.push(t) },
    );

    expect(tokens).toEqual(["A", "B"]);
  });

  it("returns usage from the last chunk", async () => {
    globalThis.fetch = makeFetchMock([
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Hi" } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: {} }], usage: { total_tokens: 5 } })}\n`,
      "data: [DONE]\n",
    ]);

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: "Test" }],
    });

    expect(result.usage?.total_tokens).toBe(5);
  });

  it("throws on non-OK response", async () => {
    globalThis.fetch = async () =>
      new Response("Bad Request", { status: 400, headers: { "content-type": "text/plain" } });

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: "Test" }],
      }),
    ).rejects.toThrow("400");
  });

  it("throws on empty response body", async () => {
    globalThis.fetch = async () =>
      new Response(null, { status: 200 });

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: "Test" }],
      }),
    ).rejects.toThrow("Empty response body");
  });

  it("throws on invalid base URL", async () => {
    const client = new OpenAICompatibleClient("not-a-url", API_KEY);
    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: "Test" }],
      }),
    ).rejects.toThrow("Invalid base URL");
  });

  it("throws on metadata host (169.254.169.254)", async () => {
    const client = new OpenAICompatibleClient("https://169.254.169.254/v1", API_KEY);
    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: "Test" }],
      }),
    ).rejects.toThrow("metadata/private network");
  });

  it("retries without response_format on 400 with response_format error", async () => {
    let callCount = 0;
    globalThis.fetch = async (_url: string, opts: any) => {
      callCount++;
      if (callCount === 1) {
        const body = JSON.parse(opts.body);
        expect(body.response_format).toBeDefined();
        return new Response("response_format is not supported", {
          status: 400,
          headers: { "content-type": "text/plain" },
        });
      }
      const body = JSON.parse(opts.body);
      expect(body.response_format).toBeUndefined();
      return new Response(makeMockStream([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "retried" } }] })}\n`,
        "data: [DONE]\n",
      ]), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    };

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: "Test" }],
      response_format: { type: "json_object" },
    });

    expect(callCount).toBe(2);
    expect(result.content).toBe("retried");
  });

  it("retries with more tokens on truncated response", async () => {
    let callCount = 0;
    globalThis.fetch = async (_url: string, opts: any) => {
      callCount++;
      const responseContent = callCount === 1
        ? `data: ${JSON.stringify({ choices: [{ delta: { content: '{"incomplete":' } }] })}\n` + "data: [DONE]\n"
        : `data: ${JSON.stringify({ choices: [{ delta: { content: '{"complete": true}' } }] })}\n` + "data: [DONE]\n";

      return new Response(makeMockStream([responseContent]), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    };

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    const result = await client.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: "Test" }],
      max_tokens: 100,
    });

    expect(callCount).toBe(2);
    expect(result.content).toBe('{"complete": true}');
  });

  it("throws on HTML response in stream", async () => {
    globalThis.fetch = async () =>
      new Response(makeMockStream([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "<html>Not JSON</html>" } }] })}\n`,
        "data: [DONE]\n",
      ]), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });

    const client = new OpenAICompatibleClient(BASE_URL, API_KEY);
    expect(
      client.chatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: "Test" }],
      }),
    ).rejects.toThrow("HTML");
  });
});
