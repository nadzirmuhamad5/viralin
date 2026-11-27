/** Paket gaya voice-over (VO) untuk narasi motion-studio — 3 gaya.
 *  Satu gaya = 1 kalimat arahan naskah ke LLM + prosody edge-tts (rate/pitch).
 *  edge-tts 5.0+ TIDAK lagi menerima SSML custom, jadi rate/pitch/voice adalah
 *  satu-satunya tuas prosody (<lang> untuk campur English juga tidak bisa). */
export type VoStyleId = "netral" | "hype" | "mengejek";

export interface VoStyle {
  label: string;
  /** 1 kalimat arahan gaya bicara, disisipkan ke prompt LLM penyusun narasi. */
  prompt: string;
  /** prosody edge-tts: rate "-50%..+100%", pitch "-50Hz..+50Hz". */
  rate: string;
  pitch: string;
}

export const VO_STYLES: Record<VoStyleId, VoStyle> = {
  netral: {
    label: "Netral",
    prompt: "nada netral, jelas, dan santai seperti presenter berita ringan",
    rate: "+0%",
    pitch: "+0Hz",
  },
  hype: {
    label: "Hype",
    prompt: "nada bersemangat, cepat, dan penuh energi seperti kreator yang lagi excited",
    rate: "+12%",
    pitch: "+3Hz",
  },
  mengejek: {
    label: "Mengejek",
    prompt: "nada mengejek dan sarkastik seperti teman yang ngeledek — pakai sindiran ringan, jeda sinis, dan penekanan di kata yang paling nyebelin",
    rate: "-8%",
    pitch: "-2Hz",
  },
};

/** Gaya dari input form; id tak dikenal → netral. */
export function voStyle(id?: string): VoStyle {
  return VO_STYLES[(id as VoStyleId) || "netral"] ?? VO_STYLES.netral;
}
