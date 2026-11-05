import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useApp } from "@/hooks/use-app";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Mobiliza" },
      { name: "description", content: "Sign in or create your church's Mobiliza account." },
      { property: "og:title", content: "Sign in — Mobiliza" },
      { property: "og:description", content: "Sign in or create your church's Mobiliza account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type View = "signin" | "signup" | "forgot";

function AuthPage() {
  const { session, ready, useDemo } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { if (ready && session) { useDemo(false); navigate({ to: "/app", replace: true }); } }, [ready, session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setNotice("");
    try {
      if (view === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (view === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name } } });
        if (error) throw error;
        if (!data.session) setNotice("Check your email and click the confirmation link, then come back to sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  async function oauth(provider: "google" | "lovable") {
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (res.error) toast.error(res.error.message ?? "Sign-in failed");
  }

  const title = view === "signin" ? "Sign in to your church" : view === "signup" ? "Create your account" : "Reset your password";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md p-6 shadow-card md:p-8">
        <Link to="/" className="font-display text-lg font-extrabold text-brand">Mobiliza</Link>
        <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your church's members, services, prayer chain and transport, saved securely.</p>

        {view !== "forgot" && (
          <div className="mt-6 grid gap-2">
            <Button type="button" variant="outline" onClick={() => oauth("google")}>Continue with Google</Button>
            <button type="button" className="lovable-auth-button" onClick={() => oauth("lovable")}>Continue with Lovable</button>
            <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
          </div>
        )}

        <form onSubmit={submit} className="grid gap-4">
          {view === "signup" && (
            <div className="grid gap-1.5"><Label htmlFor="name">Your name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" /></div>
          )}
          <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
          {view !== "forgot" && (
            <div className="grid gap-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={view === "signup" ? "new-password" : "current-password"} /></div>
          )}
          {notice && <p role="status" className="rounded-md bg-accent p-3 text-sm">{notice}</p>}
          <Button type="submit" disabled={busy} className="bg-gradient-brand text-brand-foreground">
            {busy ? "Please wait…" : view === "signin" ? "Sign in" : view === "signup" ? "Create account" : "Send reset link"}
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
          {view === "signin" ? (
            <>
              <Button variant="link" className="h-auto p-0" onClick={() => setView("signup")}>New here? Create an account</Button>
              <Button variant="link" className="h-auto p-0" onClick={() => setView("forgot")}>Forgot password?</Button>
            </>
          ) : (
            <Button variant="link" className="h-auto p-0" onClick={() => setView("signin")}>Back to sign in</Button>
          )}
        </div>
        <div className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground">
          Just looking? <Link to="/app" onClick={() => useDemo(true)} className="font-medium text-foreground underline">Explore the demo church</Link>
        </div>
      </Card>
    </main>
  );
}
