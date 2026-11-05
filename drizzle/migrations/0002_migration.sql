REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, text[]) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, text[]) TO authenticated;