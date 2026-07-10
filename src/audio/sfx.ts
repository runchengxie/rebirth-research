import type { CharacterId, DialogueNode } from "../types";

type ResultTone = "success" | "miss" | "neutral";

// ── Client-side TTS placeholder voices ──
// Fills the blank VO slot with zero assets / zero network, mirroring ProceduralBgm.
// Voices are OS-provided (Web Speech API). Profile is anchored to docs/CHARACTERS.md
// Voice Pillars: 林若宁 warm+moderate, 陈星禾 precise+fast, 周明昭 calm+slow.
type VoiceProfile = {
  lang: string; // BCP-47, e.g. "zh-CN"
  rate: number; // 0.1..10, 1 = normal
  pitch: number; // 0..2, 1 = normal
  voiceURI?: string; // preferred OS voice URI (optional; availability is OS-dependent)
};

const DEFAULT_VOICE_PROFILE: VoiceProfile = { lang: "zh-CN", rate: 1, pitch: 1 };

const VOICE_PROFILES: Record<CharacterId, VoiceProfile> = {
  lin_ruoning: { lang: "zh-CN", rate: 0.95, pitch: 1.05 },
  chen_xinghe: { lang: "zh-CN", rate: 1.08, pitch: 1.0 },
  zhou_mingzhao: { lang: "zh-CN", rate: 0.85, pitch: 0.9 },
};

const maxEffectVolume = 0.45;

export class NarrativeAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private currentVoice: HTMLAudioElement | null = null;
  private volume = 0.18;

  async start() {
    if (this.context) {
      await this.context.resume();
      return;
    }

    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);
    await this.context.resume();
  }

  stop() {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    synth?.cancel();
    this.currentVoice?.pause();
    this.currentVoice = null;
    if (this.context) {
      void this.context.close();
      this.context = null;
      this.master = null;
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(maxEffectVolume, volume));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.05);
    }
    if (this.currentVoice) {
      this.currentVoice.volume = this.volume;
    }
  }

  playPreview() {
    this.playToneSequence([440, 554, 659], 0.035, 0.08);
  }

  playAdvance() {
    this.playPageTurn();
  }

  playChoice() {
    this.playToneSequence([392, 494], 0.025, 0.075);
  }

  playResult(tone: ResultTone) {
    if (tone === "success") {
      this.playToneSequence([523, 659, 784], 0.04, 0.09);
      return;
    }
    if (tone === "miss") {
      this.playToneSequence([392, 330], 0.035, 0.12);
      return;
    }
    this.playToneSequence([440, 523], 0.03, 0.09);
  }

  playVoiceLine(node: DialogueNode) {
    if (node.voiceCue === "silent") return;
    if (node.voice) {
      this.playVoiceAsset(node.voice);
      return;
    }
    // No recorded asset → synthesize an in-character placeholder voice.
    if (node.voiceCue === "key") this.speakTTS(node.text, node.characterId);
  }

  private ensureReady() {
    if (!this.context || !this.master || this.volume <= 0) return null;
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
    return { context: this.context, master: this.master };
  }

  private playVoiceAsset(src: string) {
    this.currentVoice?.pause();
    const audio = new Audio(src);
    audio.volume = this.volume;
    this.currentVoice = audio;
    void audio.play().catch(() => {
      this.currentVoice = null;
    });
  }

  private speakTTS(text: string, characterId: CharacterId) {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth || !text) return;
    const profile = VOICE_PROFILES[characterId] ?? DEFAULT_VOICE_PROFILE;
    synth.cancel(); // stop any line still playing → no overlap on fast advance

    const speak = () => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = profile.lang;
      utter.rate = profile.rate;
      utter.pitch = profile.pitch;
      utter.volume = Math.max(0, Math.min(1, this.volume));
      const voice = this.pickVoice(profile.lang, profile.voiceURI);
      if (voice) utter.voice = voice;
      synth.speak(utter);
    };

    // Voices load asynchronously on first use; wait for them if needed.
    if (this.availableVoices().length === 0) {
      const onVoices = () => {
        synth.removeEventListener("voiceschanged", onVoices);
        speak();
      };
      synth.addEventListener("voiceschanged", onVoices);
    } else {
      speak();
    }
  }

  private availableVoices(): SpeechSynthesisVoice[] {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    return synth ? synth.getVoices() : [];
  }

  private pickVoice(lang: string, preferredURI?: string): SpeechSynthesisVoice | null {
    const voices = this.availableVoices();
    if (!voices.length) return null;
    if (preferredURI) {
      const exact = voices.find((v) => v.voiceURI === preferredURI);
      if (exact) return exact;
    }
    return voices.find((v) => v.lang?.toLowerCase().startsWith(lang.toLowerCase())) ?? null;
  }

  private playPageTurn() {
    const ready = this.ensureReady();
    if (!ready) return;

    const { context, master } = ready;
    const duration = 0.11;
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      const progress = index / sampleCount;
      const envelope = Math.pow(1 - progress, 2.4);
      data[index] = (Math.random() * 2 - 1) * envelope * 0.18;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, now);
    filter.Q.setValueAtTime(0.85, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(master);
    source.start(now);
    source.stop(now + duration);
  }

  private playToneSequence(frequencies: number[], peak: number, step: number) {
    const ready = this.ensureReady();
    if (!ready) return;

    const { context, master } = ready;
    const now = context.currentTime;
    frequencies.forEach((frequency, index) => {
      const start = now + index * step;
      const duration = 0.12;
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  }
}
