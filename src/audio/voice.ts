import type { CharacterId, DialogueNode } from "../types";

type VoiceSpeaker = CharacterId | "narrator" | "result";

const voiceProfiles: Record<VoiceSpeaker, { frequency: number; type: OscillatorType }> = {
  rina: { frequency: 620, type: "sine" },
  misaki: { frequency: 760, type: "triangle" },
  mei: { frequency: 480, type: "sine" },
  narrator: { frequency: 340, type: "sawtooth" },
  result: { frequency: 690, type: "triangle" },
};

export class ProceduralVoice {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private volume = 0.16;

  async start() {
    if (this.context) {
      await this.context.resume();
      return;
    }

    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);
  }

  stop() {
    this.currentAudio?.pause();
    this.currentAudio = null;
    if (this.context) {
      void this.context.close();
      this.context = null;
      this.master = null;
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(0.5, volume));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.04);
    }
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  playLine(node: DialogueNode) {
    if (node.voiceCue === "silent") return;
    if (node.voice) {
      this.playAsset(node.voice);
      return;
    }
    const speaker = node.speaker === "内心独白" ? "narrator" : node.characterId;
    this.playBlip(speaker, node.voiceCue === "key" ? 5 : 3);
  }

  playResult() {
    this.playBlip("result", 4);
  }

  private playAsset(src: string) {
    this.currentAudio?.pause();
    const audio = new Audio(src);
    audio.volume = this.volume;
    this.currentAudio = audio;
    void audio.play().catch(() => {
      this.currentAudio = null;
    });
  }

  private playBlip(speaker: VoiceSpeaker, count: number) {
    if (!this.context || !this.master || this.volume <= 0) return;
    const profile = voiceProfiles[speaker];
    const now = this.context.currentTime;

    for (let index = 0; index < count; index += 1) {
      const start = now + index * 0.055;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = profile.type;
      osc.frequency.setValueAtTime(profile.frequency + index * 18, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.085, start + 0.012);
      gain.gain.setTargetAtTime(0, start + 0.045, 0.018);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 0.14);
    }
  }
}
