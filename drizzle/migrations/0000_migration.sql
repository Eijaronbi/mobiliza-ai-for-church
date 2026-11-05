
-- Churches (tenants)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  pastor text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Roles per church (membership = having a role row)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin','church_admin','pastor','department_head','cell_leader','zonal_leader','transport_coordinator','followup_team','worker','member','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND tenant_id = _tenant)
$$;
CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND tenant_id = _tenant AND role = ANY(_roles))
$$;

CREATE POLICY "members see church" ON public.tenants FOR SELECT TO authenticated USING (public.is_tenant_member(id));
CREATE POLICY "admins edit church" ON public.tenants FOR UPDATE TO authenticated
  USING (public.has_tenant_role(id, ARRAY['church_admin','super_admin'])) WITH CHECK (public.has_tenant_role(id, ARRAY['church_admin','super_admin']));
CREATE POLICY "see roles in my churches" ON public.user_roles FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

-- Invites
CREATE TABLE public.tenant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'worker',
  invited_by uuid NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
GRANT SELECT, INSERT, DELETE ON public.tenant_invites TO authenticated;
GRANT ALL ON public.tenant_invites TO service_role;
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage invites read" ON public.tenant_invites FOR SELECT TO authenticated USING (public.has_tenant_role(tenant_id, ARRAY['church_admin','super_admin','pastor']));
CREATE POLICY "admins manage invites insert" ON public.tenant_invites FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND public.has_tenant_role(tenant_id, ARRAY['church_admin','super_admin','pastor']) AND role <> 'super_admin');
CREATE POLICY "admins manage invites delete" ON public.tenant_invites FOR DELETE TO authenticated USING (public.has_tenant_role(tenant_id, ARRAY['church_admin','super_admin','pastor']));

-- All church records (one row per app record, typed by collection)
CREATE TABLE public.records (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  collection text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, collection, id)
);
CREATE INDEX records_tenant_collection_idx ON public.records (tenant_id, collection, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.records TO authenticated;
GRANT ALL ON public.records TO service_role;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church read" ON public.records FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "church write" ON public.records FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id) AND NOT public.has_tenant_role(tenant_id, ARRAY['viewer','member']));
CREATE POLICY "church update" ON public.records FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id) AND NOT public.has_tenant_role(tenant_id, ARRAY['viewer','member']))
  WITH CHECK (public.is_tenant_member(tenant_id));
CREATE POLICY "church delete" ON public.records FOR DELETE TO authenticated
  USING (public.has_tenant_role(tenant_id, ARRAY['church_admin','super_admin','pastor']));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER records_touch BEFORE UPDATE ON public.records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Inbound events from n8n / WhatsApp (written by the server only)
CREATE TABLE public.inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source text NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inbound_events TO authenticated;
GRANT ALL ON public.inbound_events TO service_role;
ALTER TABLE public.inbound_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church read inbound" ON public.inbound_events FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

-- Create a church; caller becomes admin; optional starter records
CREATE OR REPLACE FUNCTION public.create_church(_name text, _city text, _timezone text, _pastor text, _starter jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _r jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF length(trim(coalesce(_name,''))) < 2 OR length(_name) > 120 THEN RAISE EXCEPTION 'Church name must be 2-120 characters'; END IF;
  INSERT INTO public.tenants(name, city, timezone, pastor, created_by)
    VALUES (trim(_name), left(coalesce(_city,''),120), left(coalesce(_timezone,'Africa/Lagos'),64), left(coalesce(_pastor,''),120), auth.uid())
    RETURNING id INTO _id;
  INSERT INTO public.user_roles(user_id, tenant_id, role) VALUES (auth.uid(), _id, 'church_admin');
  IF jsonb_typeof(_starter) = 'array' THEN
    FOR _r IN SELECT * FROM jsonb_array_elements(_starter) LIMIT 500 LOOP
      INSERT INTO public.records(tenant_id, collection, id, data)
        VALUES (_id, _r->>'collection', _r->>'id', jsonb_set(_r->'data', '{tenantId}', to_jsonb(_id::text)))
        ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.create_church(text,text,text,text,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_church(text,text,text,text,jsonb) TO authenticated;

-- Accept pending invites for the signed-in user's email
CREATE OR REPLACE FUNCTION public.accept_invites()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _n integer := 0; _inv record;
BEGIN
  SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid();
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

-- Profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, display_name, email)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1), ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
