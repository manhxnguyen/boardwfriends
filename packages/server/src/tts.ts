/**
 * Narration voices on the server, shared by the Worker and the LAN server:
 * - Google Cloud Text-to-Speech (cloud, MP3), and
 * - VieNeu-TTS (self-hosted OpenAI-compatible server on the local network, WAV), LAN server only.
 *
 * The API key stays on the server: phones/laptops request `/api/tts?room=ABCD&lang=vi&text=…`
 * and get MP3 back. Only rooms that exist may use it (so the free quota cannot be burned by
 * strangers), text length is capped, and identical sentences are cached by the caller.
 *
 * Voices: https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types
 */

export interface TtsConfig {
  apiKey: string;
  /** e.g. vi-VN-Neural2-A (female). */
  voiceVi?: string | undefined;
  voiceEn?: string | undefined;
}

export const TTS_MAX_CHARS = 400;
export const DEFAULT_VOICES = { vi: 'vi-VN-Neural2-A', en: 'en-US-Neural2-F' } as const;

export type TtsLang = keyof typeof DEFAULT_VOICES;

/** Voice ids sent by clients: `vieneu:<preset name>`; anything else means the Google voice. */
export const VIENEU_PREFIX = 'vieneu:';

export type TtsRequest =
  | { ok: true; room: string; lang: TtsLang; text: string; vieneuVoice: string | null }
  | { ok: false; status: number; error: string };

/** Validates the query string of a /api/tts request. */
export function parseTtsRequest(url: URL): TtsRequest {
  const room = (url.searchParams.get('room') ?? '').toUpperCase();
  const lang = url.searchParams.get('lang');
  const text = (url.searchParams.get('text') ?? '').trim();
  if (!/^[A-Z]{4}$/.test(room)) return { ok: false, status: 400, error: 'bad_room' };
  if (lang !== 'vi' && lang !== 'en') return { ok: false, status: 400, error: 'bad_lang' };
  if (!text || text.length > TTS_MAX_CHARS) return { ok: false, status: 400, error: 'bad_text' };
  const voice = url.searchParams.get('voice') ?? '';
  const vieneuVoice = voice.startsWith(VIENEU_PREFIX) ? voice.slice(VIENEU_PREFIX.length) : null;
  if (vieneuVoice !== null && (!vieneuVoice || vieneuVoice.length > 64)) {
    return { ok: false, status: 400, error: 'bad_voice' };
  }
  return { ok: true, room, lang, text, vieneuVoice };
}

/**
 * Emotion cues understood by VieNeu ([cười], [thở dài], [hắng giọng]). Other engines would read
 * them out loud, so they are removed for Google and for captions.
 */
const CUE_TAG = /\s*\[(?:cười|thở dài|hắng giọng)\]\s*/g;

export function stripEmotionCues(text: string): string {
  return text
    .replace(CUE_TAG, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Calls Google Cloud TTS and returns MP3 bytes. Throws on failure. */
export async function synthesize(
  config: TtsConfig,
  lang: TtsLang,
  rawText: string,
): Promise<ArrayBuffer> {
  const text = stripEmotionCues(rawText);
  const voice = (lang === 'vi' ? config.voiceVi : config.voiceEn) ?? DEFAULT_VOICES[lang];
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voice.slice(0, 5), name: voice },
        audioConfig: { audioEncoding: 'MP3', speakingRate: lang === 'vi' ? 0.95 : 1 },
      }),
    },
  );
  if (!res.ok) throw new Error(`tts_${res.status}`);
  const { audioContent } = (await res.json()) as { audioContent?: string };
  if (!audioContent) throw new Error('tts_empty');
  const binary = atob(audioContent);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export const TTS_HEADERS = {
  'Content-Type': 'audio/mpeg',
  // Same sentence → same audio; let browsers and the edge reuse it.
  'Cache-Control': 'public, max-age=604800',
};

// ---------------------------------------------------------------------------
// VieNeu-TTS (https://github.com/pnnbao97/VieNeu-TTS), OpenAI-compatible API

export interface VieneuConfig {
  /** e.g. http://192.168.1.50:8000 (no trailing /v1). */
  url: string;
  /** Matches VIENEU_API_KEY on the VieNeu server, if set. */
  apiKey?: string | undefined;
}

export interface VieneuVoice {
  id: string;
  name: string;
  description: string;
  featured: boolean;
}

export const VIENEU_HEADERS = {
  'Content-Type': 'audio/wav',
  'Cache-Control': 'public, max-age=604800',
};

function vieneuHeaders(config: VieneuConfig): Record<string, string> {
  return config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {};
}

/** Sample rate asked from VieNeu: half its native 48 kHz, plenty for speech and half the bytes. */
export const VIENEU_SAMPLE_RATE = 24_000;

/** Synthesizes one line (emotion cues kept) and returns WAV bytes (24 kHz, 16-bit mono). */
export async function synthesizeVieneu(
  config: VieneuConfig,
  voice: string,
  text: string,
  timeoutMs = 20_000,
): Promise<ArrayBuffer> {
  const res = await fetch(`${config.url.replace(/\/$/, '')}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...vieneuHeaders(config) },
    // Raw PCM so we can write a WAV header with the real length (VieNeu's streamed WAV has none).
    body: JSON.stringify({
      model: 'vieneu-v3-turbo',
      voice,
      input: text,
      response_format: 'pcm',
      sample_rate: VIENEU_SAMPLE_RATE,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`vieneu_${res.status}`);
  return pcmToWav(new Uint8Array(await res.arrayBuffer()), VIENEU_SAMPLE_RATE);
}

/** Wraps 16-bit little-endian mono PCM in a 44-byte WAV header. */
export function pcmToWav(pcm: Uint8Array, sampleRate: number): ArrayBuffer {
  const out = new ArrayBuffer(44 + pcm.byteLength);
  const v = new DataView(out);
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + pcm.byteLength, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  v.setUint32(40, pcm.byteLength, true);
  new Uint8Array(out, 44).set(pcm);
  return out;
}

/** Preset voices offered by the VieNeu server (featured first, as the server orders them). */
export async function listVieneuVoices(config: VieneuConfig): Promise<VieneuVoice[]> {
  const res = await fetch(`${config.url.replace(/\/$/, '')}/v1/voices`, {
    headers: vieneuHeaders(config),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`vieneu_${res.status}`);
  // OpenAI-style `{ object: 'list', data: [...] }`; also accept a bare array or `{ voices }`.
  const body = (await res.json()) as { data?: unknown; voices?: unknown } | unknown[];
  const list: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray(body.data)
      ? body.data
      : Array.isArray(body.voices)
        ? body.voices
        : [];
  return list
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      id: String(v.id ?? v.name ?? ''),
      name: String(v.name ?? v.id ?? ''),
      description: String(v.description ?? ''),
      featured: Boolean(v.featured), // a rank (1, 2, …) for featured voices, null otherwise
    }))
    .filter((v) => v.id);
}

export interface TtsVoicesResponse {
  /** Google Cloud voice available on this server. */
  google: boolean;
  /** VieNeu preset voices; empty when VieNeu is not configured or not reachable. */
  vieneu: VieneuVoice[];
}
