-- ============================================================
-- Migration 006: email_has_account(email) helper
--
-- Lets the checkout email-nudge tell a guest "you already have an account —
-- log in for faster checkout" without exposing auth.users to the API.
-- security definer so it can read auth.users; execute is granted ONLY to
-- service_role (the server action calls it via the service-role client), and
-- revoked from anon/authenticated so it can't be probed from the browser.
-- ============================================================

create or replace function public.email_has_account(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(trim(p_email))
  );
$$;

revoke all on function public.email_has_account(text) from public, anon, authenticated;
grant execute on function public.email_has_account(text) to service_role;
