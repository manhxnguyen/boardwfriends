import type { Lang } from './i18n.svelte.ts';
import { serverInfo } from './server-info.svelte.ts';
import { load, save } from './storage.ts';

const VOICE_KEY = 'bwf.voice';
/** Special voice id for the cloud voice (Google Cloud TTS through our server). */
export const CLOUD_VOICE = 'cloud:google';

/** Tiny silent MP3, played inside the "enable sound" click to unlock audio on Safari/iOS. */
const SILENT_MP3 =
  'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

interface QueueItem {
  text: string;
  lang: Lang;
}

/**
 * Narrator voice for the laptop in the middle of the circle.
 *
 * 1. Cloud voice (Google Cloud TTS, vi-VN-Neural2-A) when the server has it configured.
 * 2. Otherwise a voice installed on this device for the right language, best quality first.
 * 3. Never a voice of another language: that reads Vietnamese like a foreigner without tones.
 *    If no voice fits, `missingVoice` is set so the UI can explain how to install one.
 *
 * Browsers only allow audio after a user gesture, so `enable()` must be called from a click.
 */
export class Narrator {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  enabled = $state(false);
  voices = $state<SpeechSynthesisVoice[]>([]);
  voiceURI = $state<string | null>(load(VOICE_KEY));
  speaking = $state(false);
  lastText = $state('');
  /** Set when the last sentence could not be read in its language. */
  missingVoice = $state<Lang | null>(null);
  /** The cloud voice failed (network, quota); browser voices are used meanwhile. */
  cloudError = $state(false);

  #audio: HTMLAudioElement | null = null;
  #queue: QueueItem[] = [];
  #busy = false;
  #room: string;

  constructor(room: string) {
    this.#room = room;
    if (!this.supported) return;
    const refresh = () => (this.voices = speechSynthesis.getVoices());
    refresh();
    speechSynthesis.addEventListener('voiceschanged', refresh);
  }

  /** Cloud voice available on this server. */
  get cloudAvailable(): boolean {
    return serverInfo.tts;
  }

  get usingCloud(): boolean {
    return (
      this.cloudAvailable && !this.cloudError && (this.voiceURI ?? CLOUD_VOICE) === CLOUD_VOICE
    );
  }

  enable(): void {
    this.enabled = true;
    this.#audio ??= new Audio();
    // Unlock both audio paths inside the click handler.
    this.#audio.src = SILENT_MP3;
    void this.#audio.play().catch(() => undefined);
    if (this.supported) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  }

  disable(): void {
    this.enabled = false;
    this.#queue = [];
    this.#audio?.pause();
    if (this.supported) speechSynthesis.cancel();
    this.#busy = false;
    this.speaking = false;
  }

  setVoice(uri: string): void {
    this.voiceURI = uri;
    this.cloudError = false;
    save(VOICE_KEY, uri);
  }

  /** Installed voices for a language, best first. */
  voicesFor(lang: Lang): SpeechSynthesisVoice[] {
    const prefix = lang === 'vi' ? 'vi' : 'en';
    return this.voices
      .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix))
      .sort((a, b) => score(b, lang) - score(a, lang));
  }

  speak(text: string, lang: Lang): void {
    if (!text) return;
    this.lastText = text;
    if (!this.enabled) return;
    this.#queue.push({ text, lang });
    void this.#drain();
  }

  repeat(lang: Lang): void {
    this.speak(this.lastText, lang);
  }

  // ---------------------------------------------------------------------------

  /** Sentences are read one after another, whichever engine reads them. */
  async #drain(): Promise<void> {
    if (this.#busy) return;
    this.#busy = true;
    this.speaking = true;
    while (this.#queue.length && this.enabled) {
      const item = this.#queue.shift()!;
      const done = this.usingCloud && (await this.#playCloud(item));
      if (!done) await this.#speakBrowser(item);
    }
    this.#busy = false;
    this.speaking = false;
  }

  async #playCloud({ text, lang }: QueueItem): Promise<boolean> {
    const audio = (this.#audio ??= new Audio());
    const params = new URLSearchParams({ room: this.#room, lang, text });
    audio.src = `/api/tts?${params}`;
    try {
      await audio.play();
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('audio error'));
      });
      this.missingVoice = null;
      return true;
    } catch {
      this.cloudError = true; // fall back to the device voice for the rest of the session
      return false;
    }
  }

  #speakBrowser({ text, lang }: QueueItem): Promise<void> {
    if (!this.supported) return Promise.resolve();
    const voice =
      this.voicesFor(lang).find((v) => v.voiceURI === this.voiceURI) ?? this.voicesFor(lang)[0];
    if (!voice) {
      // Reading Vietnamese with an English voice is worse than silence + a clear message.
      this.missingVoice = lang;
      return Promise.resolve();
    }
    this.missingVoice = null;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = lang === 'vi' ? 0.95 : 1;
    return new Promise((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }
}

/** Higher = better: natural/neural/enhanced voices first, then known good names, local last. */
function score(voice: SpeechSynthesisVoice, lang: Lang): number {
  const name = voice.name;
  let s = 0;
  if (/natural|neural|online/i.test(name)) s += 20; // Microsoft Edge neural voices
  if (/premium|enhanced|nâng cao/i.test(name)) s += 15; // macOS downloaded high quality
  if (/google/i.test(name)) s += 10;
  if (lang === 'vi' && /hoaimy|linh|an\b/i.test(name)) s += 5;
  if (lang === 'en' && /samantha|daniel|karen|aria|jenny/i.test(name)) s += 5;
  if (voice.localService) s += 1;
  return s;
}
