/**
 * SoundManager - Procedural sound effects using Web Audio API
 * All sounds are synthesized in real-time, no audio files needed.
 */
export class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private muted: boolean = false;

    constructor() {
        // AudioContext is created lazily on first user interaction
    }

    private ensureContext() {
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.3;
        }
    }

    public isMuted() { return this.muted; }

    // ─── Player shoot: short noise burst ───
    public playShoot() {
        this.ensureContext();
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.08);
    }

    // ─── Explosion: noise with pitch drop ───
    public playExplosion() {
        this.ensureContext();
        if (!this.ctx || !this.masterGain) return;

        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(this.ctx.currentTime);
    }

    // ─── Hit steel: metallic ping ───
    public playHitSteel() {
        this.ensureContext();
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // ─── Hit brick: thud ───
    public playHitBrick() {
        this.ensureContext();
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.06);
    }

    // ─── Pick up power-up: cheerful ascending tone ───
    public playPowerUp() {
        this.ensureContext();
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.setValueAtTime(500, this.ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(700, this.ctx.currentTime + 0.16);
        osc.frequency.setValueAtTime(900, this.ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + 0.28);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.35);
    }

    // ─── Game Over: descending sad tone ───
    public playGameOver() {
        this.ensureContext();
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.setValueAtTime(350, this.ctx.currentTime + 0.3);
        osc.frequency.setValueAtTime(250, this.ctx.currentTime + 0.6);
        osc.frequency.setValueAtTime(150, this.ctx.currentTime + 0.9);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 1.2);
    }

    // ─── Stage start: fanfare ───
    public playStageStart() {
        this.ensureContext();
        if (!this.ctx || !this.masterGain) return;

        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.12, this.ctx!.currentTime + i * 0.12 + 0.02);
            gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + i * 0.12 + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.12 + 0.15);
            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(this.ctx!.currentTime + i * 0.12);
            osc.stop(this.ctx!.currentTime + i * 0.12 + 0.15);
        });
    }

    // ─── Movement tick: subtle engine hum (called sparingly) ───
    private moveOsc: OscillatorNode | null = null;
    private moveGain: GainNode | null = null;

    public startMoveSound() {
        this.ensureContext();
        if (!this.ctx || !this.masterGain || this.moveOsc) return;

        this.moveOsc = this.ctx.createOscillator();
        this.moveGain = this.ctx.createGain();
        this.moveOsc.type = 'sawtooth';
        this.moveOsc.frequency.value = 60;
        this.moveGain.gain.value = 0.04;
        this.moveOsc.connect(this.moveGain);
        this.moveGain.connect(this.masterGain);
        this.moveOsc.start();
    }

    public stopMoveSound() {
        if (this.moveOsc) {
            this.moveOsc.stop();
            this.moveOsc.disconnect();
            this.moveOsc = null;
        }
        if (this.moveGain) {
            this.moveGain.disconnect();
            this.moveGain = null;
        }
    }
}
