/**
 * Screen Wake Lock: keeps the phone screen on during a game. The browser drops the lock whenever
 * the page is hidden, so it is re-acquired when the page becomes visible again.
 * Only available in secure contexts (HTTPS or localhost).
 */
export class WakeLock {
  readonly supported = 'wakeLock' in navigator && window.isSecureContext;
  enabled = $state(false);
  #sentinel: WakeLockSentinel | null = null;

  constructor() {
    document.addEventListener('visibilitychange', this.#onVisibility);
  }

  async toggle(): Promise<void> {
    if (this.enabled) {
      this.enabled = false;
      await this.#release();
    } else {
      this.enabled = true;
      await this.#acquire();
    }
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.#onVisibility);
    void this.#release();
  }

  async #acquire(): Promise<void> {
    if (!this.supported || this.#sentinel) return;
    try {
      this.#sentinel = await navigator.wakeLock.request('screen');
      this.#sentinel.addEventListener('release', () => {
        this.#sentinel = null;
      });
    } catch {
      this.enabled = false; // e.g. battery saver mode
    }
  }

  async #release(): Promise<void> {
    const sentinel = this.#sentinel;
    this.#sentinel = null;
    await sentinel?.release().catch(() => undefined);
  }

  #onVisibility = (): void => {
    if (document.visibilityState === 'visible' && this.enabled) void this.#acquire();
  };
}
