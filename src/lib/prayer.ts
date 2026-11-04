/** Prayer chain rules (pure, testable). Times are "HH:MM" in the church's local time. */
export type PrayerSignInMethod = "whatsapp" | "app" | "sms" | "phone";
export type PrayerCallChannel = "voice" | "whatsapp_call";
export type PrayerMessageChannel = "email" | "sms" | "whatsapp";
export type PrayerStatus = "upcoming" | "awaiting" | "praying" | "completed" | "missed";

export interface PrayerChainConfig {
  name: string;
  start: string; // e.g. "03:00"
  end: string; // e.g. "06:00"
  slotMinutes: number; // e.g. 60
  signInMethod: PrayerSignInMethod;
  graceMinutes: number; // wait this long after slot start before calling
  callOrder: PrayerCallChannel[]; // try in order; move to the next when one fails
  reminderMinutesBefore: number;
  reminderChannels: PrayerMessageChannel[];
  callMessage: string;
}

export const defaultPrayerConfig: PrayerChainConfig = {
  name: "Early Morning Prayer Chain",
  start: "03:00",
  end: "06:00",
  slotMinutes: 60,
  signInMethod: "whatsapp",
  graceMinutes: 10,
  callOrder: ["voice", "whatsapp_call"],
  reminderMinutesBefore: 15,
  reminderChannels: ["whatsapp", "sms"],
  callMessage: "Good morning {name}. It's time for prayer chain. Your hour is {slot}. Please sign in and start praying.",
};

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toHHMM = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Split the prayer window into slots. Handles windows that cross midnight (e.g. 23:00–02:00). */
export function buildSlots(cfg: Pick<PrayerChainConfig, "start" | "end" | "slotMinutes">) {
  const s = toMin(cfg.start);
  let e = toMin(cfg.end);
  if (e <= s) e += 24 * 60;
  const slots: { id: string; start: string; end: string; label: string }[] = [];
  if (cfg.slotMinutes < 5) return slots;
  for (let t = s; t + cfg.slotMinutes <= e; t += cfg.slotMinutes) {
    const a = toHHMM(t), b = toHHMM(t + cfg.slotMinutes);
    slots.push({ id: `slot_${a.replace(":", "")}`, start: a, end: b, label: `${a}–${b}` });
  }
  return slots;
}

/** Status of a slot member at a given minute-of-day. */
export function slotStatus(slot: { start: string; end: string }, signedInAt: string | undefined, nowHHMM: string, graceMinutes: number): PrayerStatus {
  const s = toMin(slot.start);
  let e = toMin(slot.end); if (e <= s) e += 1440;
  let n = toMin(nowHHMM); if (n < s && s - n > 720) n += 1440;
  if (signedInAt) return n >= e ? "completed" : "praying";
  if (n < s) return "upcoming";
  if (n < s + graceMinutes) return "awaiting";
  return "missed";
}

/** Next call channel to try after the given attempts failed; undefined when all channels are exhausted. */
export function nextCallChannel(order: PrayerCallChannel[], failed: PrayerCallChannel[]): PrayerCallChannel | undefined {
  return order.find((c) => !failed.includes(c));
}

export function renderCallMessage(tpl: string, name: string, slot: string) {
  return tpl.split("{name}").join(name).split("{slot}").join(slot);
}
