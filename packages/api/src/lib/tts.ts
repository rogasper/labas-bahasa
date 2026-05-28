import { env } from "@labas/env/server";
import type { AudioConfig } from "@labas/ai";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const AUDIO_DIR = path.join(process.cwd(), "audio-cache");

const LANG_VOICE_MAP: Record<string, string> = {
  en: "af_heart",
  ja: "jf_alpha",
  zh: "zf_alpha",
  es: "ef_dora",
};

function ensureAudioDir(): string {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  return AUDIO_DIR;
}

export function getAudioFilePath(input: string, voice: string, speed: number): { filename: string; filePath: string } {
  const hash = crypto.createHash("md5").update(`${input}:${voice}:${speed}`).digest("hex");
  const filename = `${hash}.mp3`;
  const filePath = path.join(AUDIO_DIR, filename);
  return { filename, filePath };
}

export async function generateSpeech(
  input: string,
  options?: {
    voice?: string;
    speed?: number;
    langCode?: string;
  },
): Promise<{ audioUrl: string; durationMs: number; format: string }> {
  const voice = options?.voice ?? (options?.langCode ? LANG_VOICE_MAP[options.langCode] : undefined) ?? "af_heart";
  const speed = options?.speed ?? 1.0;

  ensureAudioDir();
  const { filename, filePath } = getAudioFilePath(input, voice, speed);

  // Check cache — only reuse if file is non-empty
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    return { audioUrl: `/api/audio/${filename}`, durationMs: 0, format: "mp3" };
  }

  // Delete any 0-byte corrupted cache file before regenerating
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const baseUrl = env.KOKORO_API_URL.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/v1/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "kokoro",
      input,
      voice,
      speed,
      response_format: "mp3",
      ...(options?.langCode ? { lang_code: options.langCode } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Kokoro TTS API error (${response.status}): ${errorText}`);
  }

  // Read response body
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("Kokoro returned empty audio response");
  }

  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filePath, buffer);

  return { audioUrl: `/api/audio/${filename}`, durationMs: 0, format: "mp3" };
}

export function buildAudioConfig(
  _passageText: string,
  options?: {
    voice?: string;
    speed?: number;
    langCode?: string;
  },
): AudioConfig {
  return {
    voice: options?.voice ?? "af_heart",
    speed: options?.speed ?? 1.0,
    langCode: options?.langCode,
    passageAudioUrl: null,
    questionAudioUrl: null,
    durationSeconds: null,
    generatedAt: new Date().toISOString(),
    expiresAt: null,
  };
}
