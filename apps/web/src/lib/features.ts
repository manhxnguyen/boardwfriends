/**
 * Feature switches for the client.
 *
 * VOICE_COMMANDS: the narrator screen listening to players (speech recognition). Paused for now
 * (decided 2026-11-25); narration (the app reading aloud) is unaffected. The code stays in
 * listener.svelte.ts / voice-commands.ts and the server still accepts `voice` messages.
 */
export const VOICE_COMMANDS = false;
