/**
 * Sound effects made with the Web Audio API: no audio files to download or license, and they work
 * offline on the LAN server.
 */

/**
 * A wolf howl (about 3.5 s): a lead howl that rises, holds with a slight waver and falls away,
 * a second wolf answering further off, and an echo as if across a forest at night.
 */
export function playHowl(ctx: BaseAudioContext, volume = 0.3): Promise<void> {
  const t0 = ctx.currentTime + 0.05;
  // Master bus with a limiter, so the howl plus its echo never clips.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  limiter.connect(ctx.destination);
  const out = ctx.createGain();
  out.gain.value = volume;

  // Echo: a soft feedback delay through a low-pass filter (distant trees).
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.32;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 1800;
  out.connect(limiter);
  out.connect(delay);
  delay.connect(damp);
  damp.connect(feedback);
  feedback.connect(delay);
  damp.connect(limiter);

  howlVoice(ctx, out, t0, { base: 340, peak: 680, length: 2.8, level: 1 });
  howlVoice(ctx, out, t0 + 0.9, { base: 300, peak: 560, length: 2.4, level: 0.45 });

  const end = t0 + 0.9 + 2.4 + 0.6;
  return new Promise((resolve) => {
    setTimeout(
      () => {
        out.disconnect();
        delay.disconnect();
        feedback.disconnect();
        damp.disconnect();
        limiter.disconnect();
        resolve();
      },
      (end - ctx.currentTime) * 1000,
    );
  });
}

function howlVoice(
  ctx: BaseAudioContext,
  dest: AudioNode,
  start: number,
  { base, peak, length, level }: { base: number; peak: number; length: number; level: number },
) {
  const end = start + length;

  // Pitch: scoop up, hold with vibrato, sag at the end.
  const pitch = (osc: OscillatorNode, ratio: number) => {
    const f = osc.frequency;
    f.setValueAtTime(base * ratio, start);
    f.exponentialRampToValueAtTime(peak * ratio, start + length * 0.25);
    f.setValueAtTime(peak * ratio, start + length * 0.6);
    f.exponentialRampToValueAtTime(base * 0.8 * ratio, end);
  };

  const lead = ctx.createOscillator();
  lead.type = 'sawtooth';
  pitch(lead, 1);
  const body = ctx.createOscillator();
  body.type = 'triangle';
  pitch(body, 1.005); // slight detune: a fuller, more animal tone

  // Vibrato that grows while the note holds.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.setValueAtTime(0, start);
  lfoDepth.gain.linearRampToValueAtTime(peak * 0.018, start + length * 0.5);
  lfo.connect(lfoDepth);
  lfoDepth.connect(lead.frequency);
  lfoDepth.connect(body.frequency);

  // Vocal "oo" colour: band-pass around the howl, low-pass to remove the buzz.
  const formant = ctx.createBiquadFilter();
  formant.type = 'bandpass';
  formant.frequency.value = peak * 1.2;
  formant.Q.value = 1.2;
  const soften = ctx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 2200;

  const mixLead = ctx.createGain();
  mixLead.gain.value = 0.35;
  const mixBody = ctx.createGain();
  mixBody.gain.value = 0.9;

  // Loudness: breathy start, swell, long fade.
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(level, start + 0.35);
  amp.gain.setValueAtTime(level, start + length * 0.65);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);

  lead.connect(mixLead).connect(formant);
  body.connect(mixBody).connect(formant);
  formant.connect(soften).connect(amp).connect(dest);

  for (const osc of [lead, body, lfo]) {
    osc.start(start);
    osc.stop(end + 0.05);
  }
}
