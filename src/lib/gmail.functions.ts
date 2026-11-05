import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Churches allowed to send from the connected Gmail. The Gmail belongs to the app owner, so other churches stay simulated. */
const GMAIL_CHURCHES = ["5c5910b2-afee-4b96-9b38-82eed1ed4cca"]; // Saints Community (Kuje Cell)
const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const Input = z.object({
  tenantId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(10000),
  recipients: z.array(z.object({ email: z.string().email().max(254), name: z.string().max(200).optional() })).min(1).max(100),
});

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const hdr = (v: string) => (/^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
const clean = (v: string) => v.replace(/[\r\n]+/g, " ");

export const sendChurchEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    if (!GMAIL_CHURCHES.includes(data.tenantId)) return { sent: 0, failed: 0, error: "Email sending isn't connected for this church." };
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("tenant_id", data.tenantId).eq("user_id", context.userId);
    if (!roleRows?.length || roleRows.every((r) => r.role === "member")) return { sent: 0, failed: 0, error: "Your role can't send church emails." };
    const lk = process.env["LOVABLE_API_KEY"], gk = process.env["GOOGLE_MAIL_API_KEY"];
    if (!lk || !gk) return { sent: 0, failed: 0, error: "Gmail is not connected." };
    const { data: church } = await context.supabase.from("tenants").select("name").eq("id", data.tenantId).single();
    let sent = 0, failed = 0, lastError = "";
    for (const r of data.recipients) {
      const msg = [
        `From: ${hdr(clean(church?.name ?? "Mobiliza"))} <me>`.replace(" <me>", ""),
        `To: ${r.name ? `${hdr(clean(r.name))} ` : ""}<${r.email}>`,
        `Subject: ${hdr(clean(data.subject))}`,
        "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "",
        b64(data.text),
      ].join("\r\n");
      const raw = b64(msg).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (res.ok) sent++;
      else { failed++; lastError = `Gmail answered ${res.status}`; console.error("gmail send failed", res.status, await res.text()); }
    }
    return { sent, failed, error: failed ? lastError : undefined };
  });
