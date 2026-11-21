import type { Lang } from './i18n.svelte.ts';
import { load, save } from './storage.ts';

const VOICE_KEY = 'bwf.voice';

/**
 * Narrator voice (Web Speech API). On macOS the Vietnamese voice "Linh" is preferred.
 * Browsers only allow speech after a user gesture, so `enable()` must be called from a click.
 */
export class Narrator {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  enabled = $state(false);
  voices = $state<SpeechSynthesisVoice[]>([]);
  voiceURI = $state<string | null>(load(VOICE_KEY));
  speaking = $state(false);
  lastText = $state('');
  #pending = 0;

  constructor() {
    if (!this.supported) return;
    const refresh = () => (this.voices = speechSynthesis.getVoices());
    refresh();
    speechSynthesis.addEventListener('voiceschanged', refresh);
  }

  enable(): void {
    if (!this.supported) return;
    this.enabled = true;
    // An empty utterance inside the click handler unlocks audio on Safari/iOS.
    speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  }

  disable(): void {
    this.enabled = false;
    if (this.supported) speechSynthesis.cancel();
  }

  setVoice(uri: string): void {
    this.voiceURI = uri;
    save(VOICE_KEY, uri);
  }

  /** Voices for a language, best first ("Linh" for Vietnamese). */
  voicesFor(lang: Lang): SpeechSynthesisVoice[] {
    const prefix = lang === 'vi' ? 'vi' : 'en';
    return this.voices
      .filter((v) => v.lang.toLowerCase().startsWith(prefix))
      .sort((a, b) => score(b, lang) - score(a, lang));
  }

  speak(text: string, lang: Lang): void {
    if (!text) return;
    this.lastText = text;
    if (!this.supported || !this.enabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
    const chosen =
      this.voices.find(
        (v) => v.voiceURI === this.voiceURI && v.lang.startsWith(utterance.lang.slice(0, 2)),
      ) ?? this.voicesFor(lang)[0];
    if (chosen) utterance.voice = chosen;
    utterance.rate = lang === 'vi' ? 0.95 : 1;
    utterance.onstart = () => (this.speaking = true);
    const done = () => {
      this.#pending = Math.max(0, this.#pending - 1);
      if (this.#pending === 0) this.speaking = false;
    };
    utterance.onend = done;
    utterance.onerror = done;
    this.#pending += 1;
    this.speaking = true;
    speechSynthesis.speak(utterance);
  }

  repeat(lang: Lang): void {
    this.speak(this.lastText, lang);
  }
}

function score(voice: SpeechSynthesisVoice, lang: Lang): number {
  let s = voice.localService ? 1 : 0;
  if (lang === 'vi' && /linh/i.test(voice.name)) s += 10;
  if (lang === 'en' && /samantha|daniel|karen/i.test(voice.name)) s += 5;
  return s;
}
