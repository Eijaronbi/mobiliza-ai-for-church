CREATE OR REPLACE FUNCTION public.accept_invites()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _n integer := 0; _inv record;
BEGIN
  SELECT lower(email) INTO _email FROM auth.users
   WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF _email IS NULL THEN RETURN 0; END IF;
  FOR _inv IN SELECT * FROM public.tenant_invites WHERE lower(email) = _email AND accepted_at IS NULL LOOP
    INSERT INTO public.user_roles(user_id, tenant_id, role) VALUES (auth.uid(), _inv.tenant_id, _inv.role) ON CONFLICT (user_id, tenant_id) DO NOTHING;
    UPDATE public.tenant_invites SET accepted_at = now() WHERE id = _inv.id;
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.accept_invites() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_invites() TO authenticated;