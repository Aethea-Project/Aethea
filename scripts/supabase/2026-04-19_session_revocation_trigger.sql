-- 2026-04-19_session_revocation_trigger.sql
-- Trigger to revoke all sessions if a user's account status or type is changed.

CREATE OR REPLACE FUNCTION revoke_sessions_on_account_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if account_status or account_type actually changed
    IF OLD.account_status IS DISTINCT FROM NEW.account_status OR 
       OLD.account_type IS DISTINCT FROM NEW.account_type THEN
        
        UPDATE public.user_sessions
        SET "revokedAt" = NOW()
        WHERE "userId" = NEW.id
          AND "revokedAt" IS NULL;
          
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_revoke_sessions_on_account_change ON public.user_accounts;

CREATE TRIGGER trigger_revoke_sessions_on_account_change
AFTER UPDATE ON public.user_accounts
FOR EACH ROW
EXECUTE FUNCTION revoke_sessions_on_account_change();
