import { appConfig } from "@/config/app.config";
import { mockRepo } from "./mock/mock-repository";
import { cloudRepo } from "./cloud/cloud-repository";
import type { DemoDB } from "./mock/seed";

export type Collection = Exclude<keyof DemoDB, "tenants">;
export const collections: Collection[] = [
  "members","units","services","workflows","mobilization","transport","pickupPoints","vehicles","followups","templates",
  "reports","escalations","activities","agents","executions","integrations","endpoints","customApis","logs",
];

function make<K extends Collection>(k: K) {
  return appConfig.dataSource === "cloud" ? (cloudRepo(k) as unknown as ReturnType<typeof mockRepo<K>>) : mockRepo(k);
}

/** Single entry point for data access. Swap dataSource in app.config to go live. */
export const repos = {
  members: make("members"), units: make("units"), services: make("services"), workflows: make("workflows"),
  mobilization: make("mobilization"), transport: make("transport"), pickupPoints: make("pickupPoints"), vehicles: make("vehicles"),
  followups: make("followups"), templates: make("templates"), reports: make("reports"), escalations: make("escalations"),
  activities: make("activities"), agents: make("agents"), executions: make("executions"), integrations: make("integrations"),
  endpoints: make("endpoints"), customApis: make("customApis"), logs: make("logs"),
};
export { tenants } from "./mock/seed";
export { resetDemo } from "./mock/mock-repository";
