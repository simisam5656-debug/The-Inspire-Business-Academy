-- ==============================================================================
-- Migration: 20261010000000_enforce_max_four_managers.sql
-- Purpose: Atomic database-level enforcement of the maximum-four-managers policy.
--
-- SECURITY & GOVERNANCE CONTEXT:
-- The Inspire Business Academy governance rules mandate that no more than four (4)
-- operational manager accounts may exist at any time. Application-level count checks
-- (SELECT count(*) ... followed by INSERT) can race under concurrent HTTP requests,
-- allowing 5 or more managers to be created simultaneously.
--
-- This migration implements a PostgreSQL trigger with transaction-scoped advisory locking
-- (pg_advisory_xact_lock) to serialize concurrent manager promotions and insertions.
--
-- IMPORTANT MANUAL REVIEW NOTICE:
-- As per non-negotiable security rules, this file is generated for administrative review
-- and MUST NOT be executed against a live database during automated testing or builds.
-- Apply this via the Supabase SQL editor or Supabase CLI migration pipeline after review.
-- ==============================================================================

-- 1. Create or replace the atomic concurrency validation function
CREATE OR REPLACE FUNCTION public.check_max_managers_limit()
RETURNS trigger AS $$
DECLARE
    current_manager_count integer;
    max_allowed constant integer := 4;
BEGIN
    -- Only inspect rows where role is or will become 'manager'
    IF NEW.role = 'manager' THEN
        -- Acquire a transaction-level advisory lock to serialize concurrent manager insertions and promotions.
        -- Lock releases automatically when the transaction completes (commit or rollback).
        PERFORM pg_advisory_xact_lock(hashtext('the_inspire_academy_manager_limit_lock'));

        -- ACADEMY GOVERNANCE POLICY SEMANTICS:
        -- Both active (is_active = true) and inactive/deactivated (is_active = false) manager
        -- profiles count toward the hard ceiling of 4 manager accounts. Deactivation does NOT
        -- free up an operations manager seat; the account must be deleted or reassigned away
        -- from the 'manager' role to release the seat. This prevents quota evasion via deactivation.
        IF TG_OP = 'UPDATE' AND OLD.role = 'manager' THEN
            -- Updating an existing manager: count other managers excluding current record
            SELECT count(*) INTO current_manager_count
            FROM public.profiles
            WHERE role = 'manager' AND id != OLD.id;
        ELSE
            -- Inserting a new manager or promoting a non-manager to manager role: count all current managers
            SELECT count(*) INTO current_manager_count
            FROM public.profiles
            WHERE role = 'manager';
        END IF;

        IF current_manager_count >= max_allowed THEN
            RAISE EXCEPTION 'Maximum % Operations Manager accounts allowed under academy governance policy.', max_allowed
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Attach trigger to public.profiles table
DROP TRIGGER IF EXISTS trg_check_max_managers_limit ON public.profiles;

CREATE TRIGGER trg_check_max_managers_limit
    BEFORE INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_max_managers_limit();

COMMENT ON FUNCTION public.check_max_managers_limit() IS
    'Guarantees atomic serialization and hard ceiling of 4 operational managers under concurrent requests.';
