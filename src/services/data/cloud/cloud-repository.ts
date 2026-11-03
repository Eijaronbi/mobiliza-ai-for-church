import type { ID } from "@/types";
import type { Repository } from "../repository";

/** Placeholder for the Lovable Cloud implementation.
 * When the database is enabled, implement each method with the generated client:
 *   supabase.from(table).select("*").eq("tenant_id", tenantId)
 * Row-level security enforces tenant isolation; see docs/database-schema.sql. */
export function cloudRepo<T extends { id: ID; tenantId: ID }>(table: string): Repository<T> {
  const todo = () => Promise.reject(new Error(`Cloud repository for "${table}" is not connected yet.`));
  return { list: todo, get: todo, create: todo, update: todo, remove: todo };
}
