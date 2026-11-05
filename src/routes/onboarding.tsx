import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/hooks/use-app";
import { starterRecords } from "@/lib/starter";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your church — Mobiliza" },
      { name: "description", content: "Create your church space in Mobiliza." },
      { property: "og:title", content: "Set up your church — Mobiliza" },
      { property: "og:description", content: "Create your church space in Mobiliza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { session, ready, reloadChurches, useDemo, setTenantId, signOut } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", city: "", pastor: "", timezone: "Africa/Lagos" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && !session) navigate({ to: "/auth", replace: true }); }, [ready, session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    const { data, error } = await supabase.rpc("create_church", {
      _name: form.name, _city: form.city, _timezone: form.timezone, _pastor: form.pastor,
      _starter: starterRecords() as unknown as Json,
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    await reloadChurches();
    setTenantId(data as string);
    useDemo(false);
    toast.success(`${form.name} is ready`);
    navigate({ to: "/app" });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg p-6 md:p-8">
        <h1 className="font-display text-2xl font-bold">Set up your church</h1>
        <p className="mt-1 text-sm text-muted-foreground">You'll be the admin. Invite your pastors, leaders and workers afterwards from Settings. Were you invited? Ask your admin to invite this email, then sign in again.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-1.5"><Label htmlFor="cn">Church name</Label><Input id="cn" required minLength={2} maxLength={120} value={form.name} onChange={set("name")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="cc">City</Label><Input id="cc" maxLength={120} value={form.city} onChange={set("city")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="cp">Lead pastor</Label><Input id="cp" maxLength={120} value={form.pastor} onChange={set("pastor")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="tz">Timezone</Label><Input id="tz" maxLength={64} value={form.timezone} onChange={set("timezone")} /></div>
          <Button type="submit" disabled={busy} className="bg-gradient-brand text-brand-foreground">{busy ? "Creating…" : "Create church"}</Button>
        </form>
        <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
          <Link to="/app" onClick={() => useDemo(true)} className="underline">Explore the demo instead</Link>
          <Button variant="link" className="h-auto p-0" onClick={async () => { await signOut(); navigate({ to: "/auth", replace: true }); }}>Sign out</Button>
        </div>
      </Card>
    </main>
  );
}
