import { SoundType } from '@snake-live/shared';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private soundCache = new Map<string, HTMLAudioElement>();
  private isMuted: boolean = false;
  private currentMusic: HTMLAudioElement | null = null;
  private currentMusicPhase: string = '';

  constructor() {
    // AudioContext will be initialized on first user interaction or call
  }

  private initContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playSound(sound: SoundType): void {
    if (this.isMuted) return;
    this.initContext();

    // Check if a local audio asset exists
    const filename = `/assets/audio/${sound.toLowerCase()}.wav`;
    const cached = this.soundCache.get(sound);

    if (cached) {
      cached.currentTime = 0;
      cached.play().catch(() => this.playSynthSound(sound));
      return;
    }

    const audio = new Audio(filename);
    audio
      .play()
      .then(() => {
        this.soundCache.set(sound, audio);
      })
      .catch(() => {
        // Fall back to Web Audio API procedural synthesizer
        this.playSynthSound(sound);
      });
  }

  /**
   * Procedural WebAudio sound synthesizer
   * Generates retro cyber SFX directly from code
   */
  private playSynthSound(sound: SoundType): void {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      switch (sound) {
        case 'EAT': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case 'GIFT': {
          // 3-note ascending cyber arpeggio
          [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.25, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.2);
          });
          break;
        }

        case 'OBSTACLE': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.18);
          break;
        }

        case 'BOMB': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1200, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }

        case 'EXPLOSION': {
          // White noise buffer burst + sub-bass drop
          const bufferSize = ctx.sampleRate * 0.4;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          break;
        }

        case 'LION': {
          // Low menacing sawtooth growl
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.linearRampToValueAtTime(85, now + 0.35);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }

        case 'UNIVERSE': {
          // Dual detuned cosmic synth sweep
          [-5, 5].forEach((detune) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.detune.setValueAtTime(detune, now);
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.7);
          });
          break;
        }

        case 'DEATH': {
          // Crushing descending death tone
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.6);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.65);
          break;
        }

        case 'SPEED_UP': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(750, now + 0.2);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
      }
    } catch (e) {
      // Audio autoplay policy or context error - safely ignored
    }
  }

  updatePhaseMusic(phase: string): void {
    if (this.currentMusicPhase === phase) return;
    this.currentMusicPhase = phase;
    // Attempt smooth crossfade if audio track files exist
    const phaseFile = `/assets/audio/${phase.toLowerCase()}.mp3`;
    const audio = new Audio(phaseFile);
    audio.loop = true;
    audio
      .play()
      .then(() => {
        if (this.currentMusic) {
          this.currentMusic.pause();
        }
        this.currentMusic = audio;
      })
      .catch(() => {
        // External MP3 not present; procedural sounds will handle SFX
      });
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.currentMusic) {
      this.currentMusic.pause();
    }
    return this.isMuted;
  }
}
