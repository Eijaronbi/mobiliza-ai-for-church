/** The two switches that take Mobilizer from demo to live.
 * - dataSource: "mock" uses in-memory demo repositories; "cloud" uses services/data/cloud.
 * - transport: "simulated" fakes delivery; "server" sends through a server function that holds secrets. */
export const appConfig = {
  dataSource: (import.meta.env.VITE_DATA_SOURCE ?? "mock") as "mock" | "cloud",
  transport: (import.meta.env.VITE_TRANSPORT ?? "simulated") as "simulated" | "server",
  demoNow: "2026-11-05T12:00:00.000Z", // fixed clock so demo data is stable
};
