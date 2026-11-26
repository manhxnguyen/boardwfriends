/** Secrets and optional vars (set with `wrangler secret put` / `.dev.vars`; not in wrangler.jsonc). */
interface Env {
  /** Google Cloud Text-to-Speech API key; enables the cloud narration voice. */
  GOOGLE_TTS_API_KEY?: string;
  /** Override the voices, e.g. vi-VN-Chirp3-HD-Aoede. */
  GOOGLE_TTS_VOICE_VI?: string;
  GOOGLE_TTS_VOICE_EN?: string;
  /** VieNeu-TTS reached through a Cloudflare Tunnel, e.g. https://xyz.trycloudflare.com (`pnpm tunnel`). */
  VIENEU_URL?: string;
  /** Same value as VIENEU_API_KEY on the VieNeu server; required with VIENEU_URL. */
  VIENEU_API_KEY?: string;
}
