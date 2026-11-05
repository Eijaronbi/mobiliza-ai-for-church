import { useServerFn } from "@tanstack/react-start";
import { sendChurchEmails } from "@/lib/gmail.functions";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/use-app";
import { roles } from "@/config/roles";
import type { RoleId } from "@/types";

const invitable: RoleId[] = ["church_admin", "pastor", "department_leader", "cell_leader", "member"];

/** Live mode only: who belongs to this church and pending email invites. */
export function TeamPanel() {
  const { tenantId, session, role } = useApp();
  const qc = useQueryClient();
  const canInvite = ["church_admin", "super_admin", "pastor"].includes(role);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<RoleId>("member");

  const team = useQuery({
    queryKey: ["team", tenantId],
    queryFn: async () => {
      const [{ data: r, error: e1 }, { data: inv, error: e2 }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").eq("tenant_id", tenantId),
        canInvite ? supabase.from("tenant_invites").select("id, email, role, accepted_at").eq("tenant_id", tenantId) : Promise.resolve({ data: [], error: null }),
      ]);
      if (e1 || e2) throw new Error((e1 ?? e2)!.message);
      return { members: r ?? [], invites: inv ?? [] };
    },
  });

  const sendEmails = useServerFn(sendChurchEmails);
  const invite = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenant_invites").insert({ tenant_id: tenantId, email: email.trim().toLowerCase(), role: newRole, invited_by: session!.user.id });
      if (error) throw new Error(error.message);
      const link = `${window.location.origin}/auth`;
      const r = await sendEmails({ data: { tenantId, subject: "You're invited to join your church on Mobiliza", recipients: [{ email: email.trim() }],
        text: `Hello,\n\nYou've been invited to join your church on Mobiliza.\n\nSign up here with this email address: ${link}\n\nAfter confirming your email you'll join the church automatically.` } }).catch(() => null);
      return r?.sent ? "emailed" : "saved";
    },
    onSuccess: (how) => { toast.success(how === "emailed" ? "Invite emailed" : "Invite saved", { description: how === "emailed" ? `Sent to ${email} from your Gmail.` : `Ask ${email} to sign up at ${window.location.origin}/auth with this email.` }); setEmail(""); qc.invalidateQueries({ queryKey: ["team"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  function submit(e: FormEvent) { e.preventDefault(); invite.mutate(); }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">People in this church</h3>
        <ul className="mt-2 divide-y rounded-lg border text-sm">
          {(team.data?.members ?? []).map((m) => (
            <li key={m.user_id} className="flex justify-between p-2.5"><span>{m.user_id === session?.user.id ? "You" : `Team member ${m.user_id.slice(0, 6)}`}</span><span className="text-muted-foreground">{roles[m.role as RoleId]?.label ?? m.role}</span></li>
          ))}
        </ul>
      </div>
      {canInvite && (
        <>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
            <div className="grid gap-1.5"><Label htmlFor="inv-email">Invite by email</Label><Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="inv-role">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as RoleId)}>
                <SelectTrigger id="inv-role" aria-label="Invite role"><SelectValue /></SelectTrigger>
                <SelectContent>{invitable.map((r) => <SelectItem key={r} value={r}>{roles[r].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={invite.isPending}>Invite</Button>
          </form>
          {(team.data?.invites.length ?? 0) > 0 && (
            <ul className="divide-y rounded-lg border text-sm">
              {team.data!.invites.map((i) => (
                <li key={i.id} className="flex justify-between p-2.5"><span>{i.email}</span><span className="text-muted-foreground">{roles[i.role as RoleId]?.label ?? i.role} · {i.accepted_at ? "joined" : "waiting"}</span></li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">Invited people join automatically the first time they sign in with that email.</p>
        </>
      )}
    </div>
  );
}
