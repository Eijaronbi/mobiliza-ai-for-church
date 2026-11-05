import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { repos, type Collection } from "@/services/data";
import { dispatchAction } from "@/services/events/dispatcher";
import type { ActionId } from "@/config/action-map";
import { actions } from "@/config/action-map";
import type { DemoDB } from "@/services/data/mock/seed";
import { useApp } from "./use-app";

type Item<K extends Collection> = DemoDB[K][number];

/** Read a tenant-scoped collection through the repository layer. */
export function useList<K extends Collection>(key: K) {
  const { tenantId } = useApp();
  return useQuery({
    queryKey: [key, tenantId],
    queryFn: () => (repos[key] as unknown as { list: (t: string) => Promise<Item<K>[]> }).list(tenantId),
  });
}
export function useListData<K extends Collection>(key: K): Item<K>[] {
  return useList(key).data ?? [];
}

export function useRepoMutations<K extends Collection>(key: K) {
  const qc = useQueryClient();
  const repo = repos[key] as unknown as {
    create: (i: Item<K>) => Promise<Item<K>>; update: (id: string, p: Partial<Item<K>>) => Promise<Item<K>>; remove: (id: string) => Promise<void>;
  };
  const done = () => qc.invalidateQueries({ queryKey: [key] });
  return {
    create: useMutation({ mutationFn: repo.create, onSuccess: done }),
    update: useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<Item<K>> }) => repo.update(id, patch), onSuccess: done }),
    remove: useMutation({ mutationFn: repo.remove, onSuccess: done }),
  };
}

/** Fire a registered action through the event dispatcher (→ n8n / adapters) and report honestly. */
export function useAction() {
  const { tenantId, actor, mode } = useApp();
  const qc = useQueryClient();
  return async (id: ActionId, data: Record<string, unknown>, quiet = false) => {
    try {
      const res = await dispatchAction(id, tenantId, data, actor);
      qc.invalidateQueries({ queryKey: ["logs"] });
      if (!quiet) {
        const n = res.deliveries.length;
        toast.success(actions[id].label, {
          description: mode === "live" ? (n ? `Event ${res.envelope.event} sent to ${res.deliveries.filter((d) => d.requestStatus === "delivered").length} of ${n} workflow endpoint${n > 1 ? "s" : ""}.` : `Event ${res.envelope.event} saved. Add a webhook in the Integration Hub to send it to n8n.`) : n ? `Simulated · event ${res.envelope.event} queued for ${n} workflow endpoint${n > 1 ? "s" : ""} (pending backend).` : `Simulated · event ${res.envelope.event} recorded. No active endpoint bound.`,
        });
      }
      return res;
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
}
