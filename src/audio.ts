// Audio manager for sound effects

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private lastPlayTime: Map<string, number> = new Map();
  private minInterval = 50; // ms between same sound
  private masterVolume = 0.3;

  constructor() {
    // Create AudioContext on first user interaction
    if (typeof window !== 'undefined') {
      // AudioContext is created lazily
    }
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private canPlay(soundId: string): boolean {
    const now = Date.now();
    const lastPlay = this.lastPlayTime.get(soundId) || 0;
    return now - lastPlay >= this.minInterval;
  }

  playHit(volume: number = 1.0): void {
    if (!this.canPlay('hit')) return;

    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      // Oscillator for tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

      gain.gain.setValueAtTime(this.masterVolume * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);

      this.lastPlayTime.set('hit', Date.now());
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  playExplosion(volume: number = 1.0): void {
    if (!this.canPlay('explosion')) return;

    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      // Noise-like explosion
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

      gain.gain.setValueAtTime(this.masterVolume * volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);

      this.lastPlayTime.set('explosion', Date.now());
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  playCollect(volume: number = 1.0): void {
    if (!this.canPlay('collect')) return;

    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      // Rising tone for collecting items
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

      gain.gain.setValueAtTime(this.masterVolume * volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);

      this.lastPlayTime.set('collect', Date.now());
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
}
