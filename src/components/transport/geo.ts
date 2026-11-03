/** Demo coordinate space (0–100) mapped onto a Lagos bounding box. A real GPS feed replaces x/y with lat/lng. */
export interface MapPoint { id: string; kind: "vehicle" | "pickup"; label: string; x: number; y: number; moving?: boolean }
export const CHURCH = { lat: 6.535, lng: 3.38 };
export const CHURCH_XY = { x: 50, y: 55 };
export const toLatLng = (p: { x: number; y: number }) => ({ lat: 6.68 - (p.y / 100) * 0.3, lng: 3.22 + (p.x / 100) * 0.32 });
export function stepToward(p: { x: number; y: number }, target = CHURCH_XY, step = 2.5) {
  const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy);
  if (d <= step) return { ...target, arrived: true };
  return { x: p.x + (dx / d) * step, y: p.y + (dy / d) * step, arrived: false };
}
