import type { TtsVoicesResponse, VieneuVoice } from '@bwf/server';
import { plainText } from './content/narration.ts';
import type { Lang } from './i18n.svelte.ts';
import { serverInfo } from './server-info.svelte.ts';
import { load, save } from './storage.ts';

const VOICE_KEY = 'bwf.voice';
/** Special voice id for the cloud voice (Google Cloud TTS through our server). */
export const CLOUD_VOICE = 'cloud:google';
/** Prefix of VieNeu-TTS voices (self-hosted on the local network, through the LAN server). */
export const VIENEU_PREFIX = 'vieneu:';

type Engine = { kind: 'vieneu'; voice: string } | { kind: 'google' } | { kind: 'browser' };

/** Tiny silent MP3, played inside the "enable sound" click to unlock audio on Safari/iOS. */
const SILENT_MP3 =
  'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

interface QueueItem {
  text: string;
  lang: Lang;
  /** Audio being fetched ahead of time, so the next sentence starts without a pause. */
  audio?: Promise<string | null> | undefined;
  engine?: Engine;
}

/**
 * Narrator voice for the laptop in the middle of the circle.
 *
 * 1. VieNeu-TTS (Vietnamese, with laughs and sighs) when the LAN server can reach it.
 * 2. Google Cloud TTS (vi-VN-Neural2-A) when the server has it configured; also for English.
 * 3. Otherwise a voice installed on this device for the right language, best quality first.
 * 4. Never a voice of another language: that reads Vietnamese like a foreigner without tones.
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
  /** VieNeu voices offered by the server (empty when it has none). */
  vieneuVoices = $state<VieneuVoice[]>([]);
  googleAvailable = $state(false);
  /** The VieNeu server stopped answering; Google or the device voice is used meanwhile. */
  vieneuError = $state(false);

  #audio: HTMLAudioElement | null = null;
  #queue: QueueItem[] = [];
  #busy = false;
  #room: string;

  constructor(room: string) {
    this.#room = room;
    void this.loadServerVoices();
    if (!this.supported) return;
    const refresh = () => (this.voices = speechSynthesis.getVoices());
    refresh();
    speechSynthesis.addEventListener('voiceschanged', refresh);
  }

  async loadServerVoices(): Promise<void> {
    try {
      const res = await fetch('/api/tts/voices');
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as TtsVoicesResponse;
      this.googleAvailable = data.google === true;
      this.vieneuVoices = Array.isArray(data.vieneu) ? data.vieneu : [];
      this.vieneuError = false;
    } catch {
      // Older server: only knows whether the Google voice exists.
      this.googleAvailable = serverInfo.tts;
    }
  }

  /** Google voice available on this server. */
  get cloudAvailable(): boolean {
    return this.googleAvailable;
  }

  /** Default when nothing was picked: VieNeu "Ngọc Linh" (or another featured voice), Google, device. */
  get defaultVoice(): string | null {
    const v = this.vieneuVoices;
    const pick =
      v.find((x) => /linh/i.test(x.name) && x.featured) ??
      v.find((x) => /linh/i.test(x.name)) ??
      v.find((x) => x.featured) ??
      v[0];
    if (pick) return VIENEU_PREFIX + pick.id;
    return this.googleAvailable ? CLOUD_VOICE : null;
  }

  /** What the voice picker shows: the saved choice if it still exists here, else the default. */
  get selected(): string | null {
    const uri = this.voiceURI;
    if (uri?.startsWith(VIENEU_PREFIX)) {
      const id = uri.slice(VIENEU_PREFIX.length);
      if (this.vieneuVoices.some((v) => v.id === id)) return uri;
    } else if (uri === CLOUD_VOICE) {
      if (this.googleAvailable) return uri;
    } else if (uri && this.voices.some((v) => v.voiceURI === uri)) {
      return uri;
    }
    return this.defaultVoice ?? uri;
  }

  /** Engine for one sentence, falling back VieNeu → Google → device voice. */
  #engineFor(lang: Lang): Engine {
    const sel = this.selected;
    const server = sel === CLOUD_VOICE || !!sel?.startsWith(VIENEU_PREFIX);
    // VieNeu only speaks Vietnamese.
    if (sel?.startsWith(VIENEU_PREFIX) && lang === 'vi' && !this.vieneuError) {
      return { kind: 'vieneu', voice: sel.slice(VIENEU_PREFIX.length) };
    }
    if (server && this.googleAvailable && !this.cloudError) return { kind: 'google' };
    return { kind: 'browser' };
  }

  get usingCloud(): boolean {
    return this.#engineFor('vi').kind !== 'browser';
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
    this.vieneuError = false;
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
      // Start generating the next sentence while this one plays (VieNeu takes ~0.5 s each).
      if (this.#queue[0]) this.#prefetch(this.#queue[0]);
      let done = false;
      while (!done) {
        this.#prefetch(item);
        if (item.engine!.kind === 'browser') break;
        done = await this.#playServer(item);
      }
      if (!done) await this.#speakBrowser(item);
    }
    this.#busy = false;
    this.speaking = false;
  }

  #prefetch(item: QueueItem): void {
    const engine = this.#engineFor(item.lang);
    if (item.engine && sameEngine(item.engine, engine)) return;
    item.engine = engine;
    item.audio = engine.kind === 'browser' ? undefined : this.#fetchAudio(item, engine);
  }

  async #fetchAudio({ text, lang }: QueueItem, engine: Engine): Promise<string | null> {
    const params = new URLSearchParams({ room: this.#room, lang });
    if (engine.kind === 'vieneu') {
      params.set('text', text);
      params.set('voice', VIENEU_PREFIX + engine.voice);
    } else {
      params.set('text', plainText(text));
    }
    try {
      const res = await fetch(`/api/tts?${params}`);
      if (!res.ok) return null;
      return URL.createObjectURL(await res.blob());
    } catch {
      return null;
    }
  }

  /** Plays the server audio; on failure marks that engine broken so the next try falls back. */
  async #playServer(item: QueueItem): Promise<boolean> {
    const engine = item.engine!;
    const src = await item.audio;
    const audio = (this.#audio ??= new Audio());
    try {
      if (!src) throw new Error('no audio');
      if (!this.enabled) return true;
      audio.src = src;
      await audio.play();
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('audio error'));
      });
      this.missingVoice = null;
      return true;
    } catch {
      // Fall back for the rest of the session (picking a voice again retries).
      if (engine.kind === 'vieneu') this.vieneuError = true;
      else this.cloudError = true;
      return false;
    } finally {
      if (src) URL.revokeObjectURL(src);
    }
  }

  #speakBrowser({ text: tagged, lang }: QueueItem): Promise<void> {
    const text = plainText(tagged);
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

function sameEngine(a: Engine, b: Engine): boolean {
  return a.kind === b.kind && (a.kind !== 'vieneu' || a.voice === (b as typeof a).voice);
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
