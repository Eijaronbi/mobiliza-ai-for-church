import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Church, Megaphone, Bus, HeartHandshake, FileBarChart, ShieldAlert, Bot, Plug, Workflow, Phone, MapPin, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import worship from "@/assets/hero-worship.jpg";
import welcome from "@/assets/hero-welcome.jpg";
import prayer from "@/assets/hero-prayer.jpg";
import leaders from "@/assets/hero-leaders.jpg";
import outreach from "@/assets/hero-outreach.jpg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mobilizer — Your AI-Powered Church Operations Team" },
      { name: "description", content: "Coordinate attendance, transport, first-timer follow-up and leadership accountability in one connected church platform." },
      { property: "og:title", content: "Mobilizer — Your AI-Powered Church Operations Team" },
      { property: "og:description", content: "Mobilization without the chaos. Follow-up that never falls through." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const slides = [
  { img: worship, title: "Every Member Matters.", text: "Keep your church connected, engaged and supported.", cta: "Explore the Command Centre", to: "/app" },
  { img: leaders, title: "Mobilization Without the Chaos.", text: "Coordinate attendance, communication and transportation intelligently.", cta: "See mobilization", to: "/app/mobilization" },
  { img: welcome, title: "Follow-Up That Never Falls Through.", text: "Make sure every first timer and new convert receives attention.", cta: "View follow-up", to: "/app/followup" },
  { img: prayer, title: "Leadership With Complete Visibility.", text: "Know what is happening across your church and what needs attention.", cta: "Open leadership view", to: "/app/leadership" },
  { img: outreach, title: "One Connected Church.", text: "Bring members, departments, leaders and operations together.", cta: "Enter the demo", to: "/app" },
] as const;

const features = [
  { icon: Megaphone, title: "Mobilization", text: "Configurable contact stages confirm who is coming before every service." },
  { icon: Bus, title: "Transportation", text: "Requests, approvals, drivers and live vehicle tracking on Google Maps." },
  { icon: HeartHandshake, title: "Follow-up", text: "Every first timer gets a leader, a call and a next step." },
  { icon: FileBarChart, title: "Reporting", text: "Templates, deadlines, reminders and roll-ups for every cell and department." },
  { icon: ShieldAlert, title: "Accountability", text: "Escalations reach the right leader and stay visible until resolved." },
  { icon: Bot, title: "Specialised AI agents", text: "Six agents with clear duties, permissions and execution history." },
];

function Landing() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [paused]);
  const go = (d: number) => setI((x) => (x + d + slides.length) % slides.length);

  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-2 text-hero-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand shadow-elegant"><Church className="h-4.5 w-4.5" /></span>
            <span className="font-display text-lg font-bold">Mobilizer</span>
          </Link>
          <Button asChild variant="secondary" size="sm"><Link to="/app">Enter demo</Link></Button>
        </div>
      </header>

      <section className="relative h-[88vh] min-h-[560px] overflow-hidden bg-primary" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
        {slides.map((s, k) => (
          <div key={k} className={cn("absolute inset-0 transition-opacity duration-1000", k === i ? "opacity-100" : "opacity-0")} aria-hidden={k !== i}>
            <img src={s.img} alt="" width={1920} height={1088} loading={k === 0 ? "eager" : "lazy"} className={cn("h-full w-full object-cover", k === i && "animate-kenburns")} />
            <div className="absolute inset-0 bg-gradient-hero" />
          </div>
        ))}
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-5">
          <div key={i} className="max-w-xl text-hero-foreground animate-rise">
            <span className="mb-4 inline-block rounded-full border border-hero-foreground/25 bg-hero-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur">Your AI-powered church operations team</span>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">{slides[i].title}</h1>
            <p className="mt-4 text-lg text-hero-foreground/80">{slides[i].text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-brand text-brand-foreground shadow-elegant hover:opacity-90"><Link to={slides[i].to}>{slides[i].cta}<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-8 z-10 mx-auto flex max-w-7xl items-center justify-between px-5">
          <div className="flex gap-2">
            {slides.map((_, k) => (
              <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-8 bg-hero-foreground" : "w-3 bg-hero-foreground/40")} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="secondary" aria-label="Previous slide" onClick={() => go(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="icon" variant="secondary" aria-label="Next slide" onClick={() => go(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <h2 className="max-w-2xl text-3xl font-bold">Not another church database. An operations team that never sleeps.</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">Mobilizer identifies needs, assigns responsibilities and makes sure every important follow-up is done.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, k) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant animate-rise" style={{ animationDelay: `${k * 60}ms` }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><f.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary py-20 text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold">Plug-and-play by design.</h2>
            <p className="mt-3 text-primary-foreground/70">Connect n8n workflows, Voicebip voice agents, maps, messaging and your own APIs through configuration. No rebuilding the app.</p>
            <Button asChild className="mt-6 bg-gradient-brand text-brand-foreground"><Link to="/app/integrations">Open the Integration Hub</Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[[Workflow, "n8n"], [Phone, "Voicebip"], [MapPin, "Google Maps"], [Database, "Cloud database"], [Plug, "Webhooks"], [Bot, "AI models"]].map(([Icon, l]) => {
              const I = Icon as typeof Plug;
              return <div key={l as string} className="flex flex-col items-center gap-2 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 text-sm"><I className="h-6 w-6" />{l as string}</div>;
            })}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
        <span>© 2026 Mobilizer. Demonstration product with fictional data.</span>
        <Link to="/app" className="font-medium text-foreground hover:underline">Enter the demo →</Link>
      </footer>
    </div>
  );
}
