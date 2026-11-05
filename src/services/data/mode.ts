/** Which data source the current browser session uses.
 * "demo": in-memory fictional churches (no login). "live": the signed-in user's church in Lovable Cloud. */
export type DataMode = "demo" | "live";
let mode: DataMode = "demo";
export const getDataMode = () => mode;
export const setDataMode = (m: DataMode) => { mode = m; };

const DEMO_FLAG = "mobiliza-demo";
/** Remembers that a signed-in visitor chose the demo instead of their church. */
export function setDemoPreference(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.sessionStorage.setItem(DEMO_FLAG, "1");
  else window.sessionStorage.removeItem(DEMO_FLAG);
}
export function prefersDemo() {
  return typeof window !== "undefined" && window.sessionStorage.getItem(DEMO_FLAG) === "1";
}
