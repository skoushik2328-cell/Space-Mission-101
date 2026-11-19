/**
 * @file audioEngine.ts
 * @description Procedural Web Audio API synthesizer and Web Speech API countdown voice engine.
 * @ai-disclosure AI-assisted generation was used in designing the synthesized audio cues and countdown voice integration.
 */
class AerospaceAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private rumbleStarted = false;
  private volume = 0.65;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSettings(volume: number, muted: boolean) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.04
      );
    }
    if (muted) {
      this.stopSpeech();
    }
  }

  public stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore speech synthesis restrictions
      }
    }
  }

  private speakCountdown(text: string, rate = 1.05) {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.volume = Math.min(1, Math.max(0.15, this.volume));
      utter.rate = rate;
      utter.pitch = 0.95;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore speech synthesis errors
    }
  }

  public playUiClick() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playAttachPart() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playCountdownTick(countNum: number) {
    const isLiftoff = countNum <= 0;
    const ctx = this.ensureContext();
    if (ctx && this.masterGain && !this.muted) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isLiftoff) {
        osc.type = 'triangle';
        osc2.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(783.99, now + 0.12);
        osc2.frequency.setValueAtTime(1046.5, now);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.68);
        osc2.stop(now + 0.68);
      } else {
        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(countNum <= 2 ? 880 : 660, now);
        osc2.frequency.setValueAtTime(countNum <= 2 ? 1320 : 990, now);
        gain.gain.setValueAtTime(0.13, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.19);
        osc2.stop(now + 0.19);
      }
    }

    if (isLiftoff) {
      this.speakCountdown('Ignition, Liftoff!', 1.05);
    } else {
      this.speakCountdown(String(countNum), 1.15);
    }
  }

  public playStageSeparation() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.22);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playSuccessChord() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const freqs = [440, 554.37, 659.25, 880];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.11, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.55);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.58);
    });
  }

  public playFailureAlarm() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, now + i * 0.22);
      osc.frequency.linearRampToValueAtTime(220, now + i * 0.22 + 0.16);
      gain.gain.setValueAtTime(0.14, now + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.22 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.22);
      osc.stop(now + i * 0.22 + 0.2);
    }
  }

  public updateRocketRumble(thrustFraction: number, altitudeKm: number) {
    if (thrustFraction <= 0.01) {
      if (this.rumbleGain && this.ctx) {
        this.rumbleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (!this.rumbleStarted) {
      this.rumbleStarted = true;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      this.rumbleFilter = ctx.createBiquadFilter();
      this.rumbleFilter.type = 'lowpass';
      this.rumbleFilter.frequency.value = 260;

      this.rumbleGain = ctx.createGain();
      this.rumbleGain.gain.value = 0;

      noise.connect(this.rumbleFilter);
      this.rumbleFilter.connect(this.rumbleGain);
      this.rumbleGain.connect(this.masterGain);
      noise.start();
    }

    if (this.rumbleGain && this.rumbleFilter) {
      const atmoFactor = altitudeKm > 80 ? 0.22 : 1 - (altitudeKm / 80) * 0.78;
      const targetGain = Math.min(0.42, thrustFraction * 0.36 * atmoFactor);
      const targetFreq = 140 + thrustFraction * 360 * atmoFactor;
      this.rumbleGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.08);
      this.rumbleFilter.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.08);
    }
  }
}

export const audioEngine = new AerospaceAudioEngine();
