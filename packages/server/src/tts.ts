/**
 * Cloud narration voice (Google Cloud Text-to-Speech), shared by the Worker and the LAN server.
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

export type TtsRequest =
  | { ok: true; room: string; lang: TtsLang; text: string }
  | { ok: false; status: number; error: string };

/** Validates the query string of a /api/tts request. */
export function parseTtsRequest(url: URL): TtsRequest {
  const room = (url.searchParams.get('room') ?? '').toUpperCase();
  const lang = url.searchParams.get('lang');
  const text = (url.searchParams.get('text') ?? '').trim();
  if (!/^[A-Z]{4}$/.test(room)) return { ok: false, status: 400, error: 'bad_room' };
  if (lang !== 'vi' && lang !== 'en') return { ok: false, status: 400, error: 'bad_lang' };
  if (!text || text.length > TTS_MAX_CHARS) return { ok: false, status: 400, error: 'bad_text' };
  return { ok: true, room, lang, text };
}

/** Calls Google Cloud TTS and returns MP3 bytes. Throws on failure. */
export async function synthesize(
  config: TtsConfig,
  lang: TtsLang,
  text: string,
): Promise<ArrayBuffer> {
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
