import type { Lang } from './i18n.svelte.ts';

/** Minimal typing for the (still prefixed) Web Speech recognition API. */
interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Continuous speech recognition for the narrator screen (experimental).
 *
 * Privacy: in Chrome, recognition is done by Google's servers; in Safari by Apple. Audio only
 * flows while "listening" is on, and only final sentences are handed to `onSentence`.
 * Recognition is suspended while the narrator speaks so it does not hear itself.
 */
export class Listener {
  readonly supported = typeof window !== 'undefined' && recognitionCtor() !== null;
  listening = $state(false);
  heard = $state('');
  error = $state<string | null>(null);

  #rec: Recognition | null = null;
  #wanted = false;
  #suspended = false;
  #lang: Lang = 'vi';
  #onSentence: (text: string) => void;

  constructor(onSentence: (text: string) => void) {
    this.#onSentence = onSentence;
  }

  start(lang: Lang): void {
    if (!this.supported) return;
    this.#wanted = true;
    this.#lang = lang;
    this.error = null;
    this.#run();
  }

  stop(): void {
    this.#wanted = false;
    this.#rec?.abort();
    this.#rec = null;
    this.listening = false;
  }

  /** Pause while the narrator talks; resume afterwards. */
  suspend(suspended: boolean): void {
    if (this.#suspended === suspended) return;
    this.#suspended = suspended;
    if (suspended) {
      this.#rec?.abort();
      this.#rec = null;
    } else if (this.#wanted) {
      this.#run();
    }
  }

  #run(): void {
    if (!this.#wanted || this.#suspended || this.#rec) return;
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = this.#lang === 'vi' ? 'vi-VN' : 'en-US';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        if (!result.isFinal) continue;
        const text = result[0].transcript.trim();
        if (!text) continue;
        this.heard = text;
        this.#onSentence(text);
      }
    };
    rec.onerror = (event) => {
      // 'no-speech' and 'aborted' are routine; anything else (e.g. 'not-allowed') stops listening.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.error = event.error;
        this.#wanted = false;
      }
    };
    rec.onend = () => {
      if (this.#rec === rec) this.#rec = null;
      this.listening = false;
      // Browsers end continuous recognition after a while; restart while wanted.
      if (this.#wanted && !this.#suspended) setTimeout(() => this.#run(), 300);
    };
    this.#rec = rec;
    try {
      rec.start();
      this.listening = true;
    } catch {
      this.#rec = null;
    }
  }
}
