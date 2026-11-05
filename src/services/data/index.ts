import { appConfig } from "@/config/app.config";
import { mockRepo } from "./mock/mock-repository";
import { cloudRepo } from "./cloud/cloud-repository";
import { getDataMode } from "./mode";
import type { DemoDB } from "./mock/seed";

export type Collection = Exclude<keyof DemoDB, "tenants">;
export const collections: Collection[] = [
  "members","units","services","workflows","mobilization","transport","pickupPoints","vehicles","followups","templates",
  "reports","escalations","activities","agents","executions","integrations","endpoints","customApis","logs",
];

type Repo<K extends Collection> = ReturnType<typeof mockRepo<K>>;

/** Picks mock or cloud per call, so demo visitors and signed-in churches share the same screens. */
function make<K extends Collection>(k: K): Repo<K> {
  const mock = mockRepo(k);
  const cloud = cloudRepo(k) as unknown as Repo<K>;
  const pick = () => (getDataMode() === "live" || appConfig.dataSource === "cloud" ? cloud : mock);
  return {
    list: (t) => pick().list(t),
    get: (id) => pick().get(id),
    create: (i) => pick().create(i),
    update: (id, p) => pick().update(id, p),
    remove: (id) => pick().remove(id),
  };
}

/** Single entry point for data access. */
export const repos = {
  members: make("members"), units: make("units"), services: make("services"), workflows: make("workflows"),
  mobilization: make("mobilization"), transport: make("transport"), pickupPoints: make("pickupPoints"), vehicles: make("vehicles"),
  followups: make("followups"), templates: make("templates"), reports: make("reports"), escalations: make("escalations"),
  activities: make("activities"), agents: make("agents"), executions: make("executions"), integrations: make("integrations"),
  endpoints: make("endpoints"), customApis: make("customApis"), logs: make("logs"),
};
export { tenants } from "./mock/seed";
export { resetDemo } from "./mock/mock-repository";
export { getDataMode, setDataMode } from "./mode";
