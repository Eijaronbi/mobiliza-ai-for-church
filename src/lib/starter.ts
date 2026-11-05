import { buildSeed, tenants } from "@/services/data/mock/seed";

/** Collections a brand-new church starts with: configuration only, no people or history. */
export const STARTER_COLLECTIONS = ["agents", "integrations", "templates", "endpoints", "customApis"] as const;

export function starterRecords() {
  const db = buildSeed();
  const source = tenants[0].id;
  return STARTER_COLLECTIONS.flatMap((collection) =>
    (db[collection] as { id: string; tenantId: string }[])
      .filter((r) => r.tenantId === source)
      .map((r) => ({ collection, id: r.id, data: { ...r, ...("status" in r ? { status: (r as { status?: string }).status === "connected" ? "not_configured" : (r as { status?: string }).status } : {}) } })),
  );
}
