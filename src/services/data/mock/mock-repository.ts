import type { ID } from "@/types";
import type { Repository } from "../repository";
import { buildSeed, type DemoDB } from "./seed";

let db: DemoDB = buildSeed();
export const getDb = () => db;
export const resetDemo = () => { db = buildSeed(); };

type Coll = Exclude<keyof DemoDB, "tenants">;
type Item<K extends Coll> = DemoDB[K][number];
const wait = () => new Promise((r) => setTimeout(r, 60));

export function mockRepo<K extends Coll>(key: K): Repository<Item<K>> {
  const all = () => db[key] as Item<K>[];
  return {
    async list(tenantId) { await wait(); return all().filter((x) => x.tenantId === tenantId); },
    async get(id: ID) { return all().find((x) => x.id === id); },
    async create(item) { (db[key] as Item<K>[]) = [item, ...all()]; return item; },
    async update(id, patch) {
      let out: Item<K> | undefined;
      (db[key] as Item<K>[]) = all().map((x) => (x.id === id ? (out = { ...x, ...patch }) : x));
      if (!out) throw new Error(`Not found: ${id}`);
      return out;
    },
    async remove(id) { (db[key] as Item<K>[]) = all().filter((x) => x.id !== id); },
  };
}
