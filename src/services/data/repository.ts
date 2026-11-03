import type { ID } from "@/types";

/** Data-access contract. MockRepository implements it today; CloudRepository later.
 * UI code only ever talks to this interface (through hooks). */
export interface Repository<T extends { id: ID; tenantId: ID }> {
  list(tenantId: ID): Promise<T[]>;
  get(id: ID): Promise<T | undefined>;
  create(item: T): Promise<T>;
  update(id: ID, patch: Partial<T>): Promise<T>;
  remove(id: ID): Promise<void>;
}
