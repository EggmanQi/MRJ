export type VoiceId =
  | "ganying"
  | "lingshi"
  | "jianren"
  | "zhaogan"
  | "tuili"
  | "jiyi"
  | "biancai"
  | "shenmei"
  | "shenti"
  | "benneng"
  | "tonggan"
  | "rennai"
  | "guancha"
  | "jiqiao"
  | "chenzhuo"
  | "jingjue";

export type VoiceAttribute = "智识" | "神思" | "心体" | "应物";

export type VoiceVector = Partial<Record<VoiceId, number>>;

export type Card = {
  id: number;
  idiom: string;
  en: string;
  group: number;
  animal: string;
  keywords: string[];
  meaning: string;
  voiceVector: VoiceVector;
  arc: string;
  arcDesc: string;
};

export type Voice = {
  id: VoiceId;
  name: string;
  attribute: VoiceAttribute;
  tagline: string;
  monologue: string;
};

export type VoiceState = {
  awake: boolean;
  value: number;
  firstAwakenedAt?: string;
};

export type DrawRecord = {
  id: string;
  cardId: number;
  reversed: boolean;
  question: string;
  poem: string;
  interpretation: string;
  voiceDelta: VoiceVector;
  status: "pending" | "done";
  createdAt: string;
};

export type UserStore = {
  deviceId: string;
  lastFreeDrawDate: string | null;
  drawHistory: DrawRecord[];
  voices: Partial<Record<VoiceId, VoiceState>>;
};

export type AnalyticsEvent =
  | { name: "draw_start" }
  | { name: "draw_result"; cardId: number; isNew: boolean; reversed: boolean }
  | { name: "question_input"; length: number }
  | { name: "reading_generated"; cardId: number; latency_ms: number }
  | { name: "codex_open"; unlockedCount: number }
  | { name: "voice_awaken"; voiceId: VoiceId }
  | { name: "voices_open"; awakeCount: number };
