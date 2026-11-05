ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('super_admin','church_admin','pastor','department_leader','cell_leader','member'));
ALTER TABLE public.tenant_invites ADD CONSTRAINT tenant_invites_role_check CHECK (role IN ('church_admin','pastor','department_leader','cell_leader','member'));
ALTER TABLE public.tenant_invites ALTER COLUMN role SET DEFAULT 'member';
DROP POLICY IF EXISTS "church write" ON public.records;
DROP POLICY IF EXISTS "church update" ON public.records;
CREATE POLICY "church write" ON public.records FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id) AND NOT public.has_tenant_role(tenant_id, ARRAY['member']));
CREATE POLICY "church update" ON public.records FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id) AND NOT public.has_tenant_role(tenant_id, ARRAY['member']))
  WITH CHECK (public.is_tenant_member(tenant_id));