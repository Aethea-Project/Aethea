-- 1. Alter Foreign Key Constraints on access_audit_logs to ON DELETE RESTRICT
ALTER TABLE public.access_audit_logs DROP CONSTRAINT IF EXISTS "access_audit_logs_targetPatientId_fkey";
ALTER TABLE public.access_audit_logs DROP CONSTRAINT IF EXISTS "access_audit_logs_userId_fkey";

ALTER TABLE public.access_audit_logs ADD CONSTRAINT "access_audit_logs_targetPatientId_fkey" 
    FOREIGN KEY ("targetPatientId") REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.access_audit_logs ADD CONSTRAINT "access_audit_logs_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Create the Trigger Function to prevent UPDATE or DELETE or TRUNCATE
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'restrict_violation: Audit logs are strictly append-only and immutable.'
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- 3. Bind triggers for admin_audit_log
DROP TRIGGER IF EXISTS trg_prevent_admin_audit_tampering_row ON public.admin_audit_log;
CREATE TRIGGER trg_prevent_admin_audit_tampering_row
    BEFORE UPDATE OR DELETE ON public.admin_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_prevent_admin_audit_tampering_statement ON public.admin_audit_log;
CREATE TRIGGER trg_prevent_admin_audit_tampering_statement
    BEFORE TRUNCATE ON public.admin_audit_log
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.prevent_audit_tampering();

-- 4. Bind triggers for access_audit_logs
DROP TRIGGER IF EXISTS trg_prevent_access_audit_tampering_row ON public.access_audit_logs;
CREATE TRIGGER trg_prevent_access_audit_tampering_row
    BEFORE UPDATE OR DELETE ON public.access_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_prevent_access_audit_tampering_statement ON public.access_audit_logs;
CREATE TRIGGER trg_prevent_access_audit_tampering_statement
    BEFORE TRUNCATE ON public.access_audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.prevent_audit_tampering();

-- 5. Revoke UPDATE, DELETE, and TRUNCATE privileges from all database roles
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.admin_audit_log FROM authenticated, anon, public, service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.access_audit_logs FROM authenticated, anon, public, service_role;
