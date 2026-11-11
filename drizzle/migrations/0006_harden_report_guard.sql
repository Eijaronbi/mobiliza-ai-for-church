CREATE OR REPLACE FUNCTION public.guard_report_records()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE approver boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.collection IS DISTINCT FROM OLD.collection OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'Record identity cannot be changed';
  END IF;
  IF NEW.collection <> 'reports' THEN RETURN NEW; END IF;
  approver := public.has_tenant_role(NEW.tenant_id, ARRAY['church_admin','super_admin','pastor']);
  IF approver THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.data->>'status','draft') = 'approved' THEN
      RAISE EXCEPTION 'Only a pastor or church admin can approve reports';
    END IF;
  ELSE
    IF coalesce(OLD.data->>'status','draft') IN ('submitted','approved') AND NEW.data IS DISTINCT FROM OLD.data THEN
      RAISE EXCEPTION 'Submitted reports can only be changed by a pastor or church admin';
    END IF;
    IF coalesce(NEW.data->>'status','draft') = 'approved' THEN
      RAISE EXCEPTION 'Only a pastor or church admin can approve reports';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_report_records() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_report_records ON public.records;
CREATE TRIGGER guard_report_records BEFORE INSERT OR UPDATE ON public.records
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_records();