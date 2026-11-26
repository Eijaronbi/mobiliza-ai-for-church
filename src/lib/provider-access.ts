/** Workspace-owned providers may only serve this registered church. */
export const OWNER_PROVIDER_TENANT_ID = "5c5910b2-afee-4b96-9b38-82eed1ed4cca";
/** Owner's church, or one of the first 10 churches (shared usage, credentials stay server-side). */
export function canUseOwnerProvider(tenantId: string, roles: string[], isEarlyChurch = false): boolean {
  return (tenantId === OWNER_PROVIDER_TENANT_ID || isEarlyChurch) && roles.some((role) => ["church_admin", "pastor", "super_admin"].includes(role));
}