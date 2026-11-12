import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { eventSchemas } from "@/config/event-catalog";
import { canUseOwnerProvider } from "./provider-access";

const Input = z.object({ tenantId: z.string().uuid(), event: z.enum(["service.broadcast", "prayer.points_sent"]), payload: z.unknown() });

/** No user-controlled endpoint, credential reference, or tenant fallback. */
export const sendPrivateChurchSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase.from("user_roles").select("role").eq("tenant_id", data.tenantId).eq("user_id", context.userId);
    if (!canUseOwnerProvider(data.tenantId, (rows ?? []).map((row) => row.role))) return { handled: false, ok: false, error: "This private SMS connection is not available to your church or role." };
    const parsed = eventSchemas[data.event].safeParse(data.payload);
    if (!parsed.success) return { handled: true, ok: false, error: "Invalid SMS broadcast." };
    const payload = parsed.data;
    if (!payload.channels.includes("sms")) return { handled: false, ok: false };
    const { data: records, error } = await context.supabase.from("records").select("id, collection, data").eq("tenant_id", data.tenantId).in("collection", ["members", "integrations"]);
    if (error) return { handled: true, ok: false, error: "Could not read your church’s SMS settings." };
    const sms = records?.find((row) => row.collection === "integrations" && (row.data as { kind?: string }).kind === "sms");
    const config = sms?.data as { settings?: { smsSender?: string }; enabled?: boolean } | undefined;
    const sender = config?.settings?.smsSender?.trim();
    if (!sender || config?.enabled !== true) return { handled: true, ok: false, error: "Enable SMS and add your approved Yournotify Sender ID in the Integration Hub." };
    const recipients = new Map<string, { name: string; telephone: string }>();
    for (const row of records ?? []) {
      if (row.collection !== "members" || !payload.member_ids.includes(row.id)) continue;
      const member = row.data as { name?: string; phone?: string; consent?: boolean };
      if (member.consent && member.phone && /^\+?[1-9]\d{7,14}$/.test(member.phone)) recipients.set(member.phone, { name: member.name ?? "Member", telephone: member.phone });
    }
    if ("external_recipients" in payload) for (const recipient of payload.external_recipients) recipients.set(recipient.phone, { name: recipient.name, telephone: recipient.phone });
    if (!recipients.size || recipients.size > 100) return { handled: true, ok: false, error: "Select between 1 and 100 consenting SMS recipients." };
    const key = process.env["UDC_YOURNOTIFY_2_API_KEY"], auth = process.env["LOVABLE_API_KEY"];
    if (!key || !auth) return { handled: true, ok: false, error: "Yournotify is not connected." };
    try {
      const response = await fetch("https://connector-gateway.lovable.dev/udc_yournotify_2/campaigns/sms", {
        method: "POST", signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${auth}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.event === "service.broadcast" ? "Mobiliza service broadcast" : "Mobiliza prayer points", from: sender, text: payload.message, status: "running", lists: [...recipients.values()] }),
      });
      if (!response.ok) return { handled: true, ok: false, error: `Yournotify rejected the request (${response.status}). Check your Sender ID, account balance and recipients.` };
      const result = await response.json() as { status?: string };
      if (result.status !== "success") return { handled: true, ok: false, error: "Yournotify did not accept the SMS campaign." };
      return { handled: true, ok: true, count: recipients.size };
    } catch { return { handled: true, ok: false, error: "Could not reach Yournotify. Check its campaign history before trying again." }; }
  });