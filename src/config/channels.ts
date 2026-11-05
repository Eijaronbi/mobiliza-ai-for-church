/** One list of channels used everywhere. Messages: WhatsApp, SMS, Email. Calls: phone call, WhatsApp call.
 * Providers are connected later in the Integration Hub; until then sends are simulated. */
export const MESSAGE_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" }, { id: "sms", label: "SMS" }, { id: "email", label: "Email" },
] as const;
export const CALL_CHANNELS = [
  { id: "call", label: "Phone call" }, { id: "whatsapp_call", label: "WhatsApp call" },
] as const;
export const CONTACT_CHANNELS = [...MESSAGE_CHANNELS, ...CALL_CHANNELS];
export const channelLabel = (id: string) => CONTACT_CHANNELS.find((c) => c.id === id)?.label ?? id;
