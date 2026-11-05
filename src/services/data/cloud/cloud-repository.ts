import type { ID } from "@/types";
import type { Repository } from "../repository";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/** Lovable Cloud implementation. Every collection is stored in `public.records`
 * keyed by (tenant_id, collection, id); row-level security limits rows to the user's churches. */
export function cloudRepo<T extends { id: ID; tenantId: ID }>(collection: string): Repository<T> {
  const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
  return {
    async list(tenantId) {
      const { data, error } = await supabase.from("records").select("data")
        .eq("tenant_id", tenantId).eq("collection", collection).order("created_at", { ascending: false }).limit(1000);
      fail(error);
      return (data ?? []).map((r) => r.data as unknown as T);
    },
    async get(id) {
      const { data, error } = await supabase.from("records").select("data").eq("collection", collection).eq("id", id).maybeSingle();
      fail(error);
      return (data?.data as unknown as T) ?? undefined;
    },
    async create(item) {
      const { error } = await supabase.from("records").upsert({ tenant_id: item.tenantId, collection, id: item.id, data: item as unknown as Json });
      fail(error);
      return item;
    },
    async update(id, patch) {
      const current = await this.get(id);
      if (!current) throw new Error(`Not found: ${id}`);
      const next = { ...current, ...patch } as T;
      const { error } = await supabase.from("records").update({ data: next as unknown as Json })
        .eq("tenant_id", current.tenantId).eq("collection", collection).eq("id", id);
      fail(error);
      return next;
    },
    async remove(id) {
      const { error } = await supabase.from("records").delete().eq("collection", collection).eq("id", id);
      fail(error);
    },
  };
}
