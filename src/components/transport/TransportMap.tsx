import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimBadge } from "@/components/app/kit";
import { CHURCH, toLatLng, type MapPoint } from "./geo";

/** Google Maps view for pickups and vehicles. Swappable: everything else talks to MapPoint[] only. */
declare global {
  interface Window { __mobilizerMapsReady?: () => void; gm_authFailure?: () => void; google?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
}

let loader: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (loader) return loader;
  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] ?? "";
  if (!key) return Promise.reject(new Error("no key"));
  loader = new Promise((resolve, reject) => {
    window.__mobilizerMapsReady = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__mobilizerMapsReady&channel=${channel}&region=NG`;
    s.async = true;
    s.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(s);
  });
  return loader;
}

export function TransportMap({ points, selectedId, onSelect }: { points: MapPoint[]; selectedId?: string; onSelect?: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const markers = useRef<Map<string, any>>(new Map()); // eslint-disable-line @typescript-eslint/no-explicit-any
  const gpsMarker = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [mode, setMode] = useState<"loading" | "google" | "fallback">("loading");
  const [gps, setGps] = useState<string | null>(null);

  useEffect(() => {
    window.gm_authFailure = () => setMode("fallback");
    loadMaps().then(() => {
      if (!el.current) return;
      const g = window.google.maps;
      map.current = new g.Map(el.current, { center: CHURCH, zoom: 11, clickableIcons: false, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
      new g.Marker({ position: CHURCH, map: map.current, title: "Church", label: { text: "⛪", fontSize: "18px" } });
      setMode("google");
    }).catch(() => setMode("fallback"));
  }, []);

  useEffect(() => {
    if (mode !== "google") return;
    const g = window.google.maps;
    const seen = new Set<string>();
    for (const p of points) {
      seen.add(p.id);
      const pos = toLatLng(p);
      let m = markers.current.get(p.id);
      const icon = { path: g.SymbolPath.CIRCLE, scale: p.kind === "vehicle" ? 9 : 6, fillColor: p.kind === "vehicle" ? (p.moving ? "#6d4aff" : "#3b82f6") : "#f59e0b", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 };
      if (!m) {
        m = new g.Marker({ position: pos, map: map.current, title: p.label, icon });
        m.addListener("click", () => onSelect?.(p.id));
        markers.current.set(p.id, m);
      } else { m.setPosition(pos); m.setIcon(icon); }
    }
    markers.current.forEach((m, id) => { if (!seen.has(id)) { m.setMap(null); markers.current.delete(id); } });
  }, [points, mode, onSelect]);

  useEffect(() => {
    if (mode === "google" && selectedId) {
      const p = points.find((x) => x.id === selectedId);
      if (p) map.current.panTo(toLatLng(p));
    }
  }, [selectedId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareGps = () => {
    if (!navigator.geolocation) return setGps("GPS not available on this device.");
    navigator.geolocation.watchPosition((pos) => {
      const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setGps(`Live: ${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`);
      if (mode === "google") {
        const g = window.google.maps;
        if (!gpsMarker.current) gpsMarker.current = new g.Marker({ map: map.current, title: "This device", icon: { path: g.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6, fillColor: "#10b981", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
        gpsMarker.current.setPosition(ll); map.current.panTo(ll);
      }
    }, (e) => setGps(e.code === 1 ? "Location permission was declined." : "Could not get your location."), { enableHighAccuracy: true });
  };

  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl border bg-muted">
      <div ref={el} className="absolute inset-0" style={{ display: mode === "fallback" ? "none" : "block" }} />
      {mode === "fallback" && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
          <defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="var(--border)" strokeWidth="0.3" /></pattern></defs>
          <rect width="100" height="100" fill="url(#grid)" />
          <circle cx="50" cy="55" r="2.6" fill="var(--primary)" />
          {points.map((p) => <circle key={p.id} cx={p.x} cy={p.y} r={p.kind === "vehicle" ? 2 : 1.4} fill={p.kind === "vehicle" ? "var(--brand)" : "var(--warning)"} className="cursor-pointer transition-all duration-1000" onClick={() => onSelect?.(p.id)} />)}
        </svg>
      )}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
        <SimBadge label={mode === "google" ? "Google Maps · vehicle GPS simulated" : "Map preview · GPS simulated"} />
        {gps && <span className="rounded-md bg-card/95 px-2 py-1 text-[11px] font-medium shadow-card">{gps}</span>}
      </div>
      <Button size="sm" variant="secondary" className="absolute bottom-3 right-3 shadow-card" onClick={shareGps}><LocateFixed className="mr-1 h-4 w-4" />Share my live location</Button>
      <div className="absolute bottom-3 left-3 flex gap-3 rounded-md bg-card/95 px-2.5 py-1.5 text-[11px] shadow-card">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand" />Moving vehicle</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-info" />Parked</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Pickup point</span>
      </div>
    </div>
  );
}
