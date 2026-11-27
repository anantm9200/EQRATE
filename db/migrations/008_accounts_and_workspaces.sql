-- CREQOR migration 008: user accounts, organisations, memberships and private research
-- workspaces with database-enforced tenant isolation.
--  * Passwords are stored only as scrypt hashes produced by the engine; the website
--    never sees a hash.
--  * cq_workspace_items is protected by row-level security: a session can only see
--    rows of the organisation in `creqor.org_id`, which the engine sets per
--    transaction after verifying membership. FORCE applies the policy to the owner too.
--  * Accounts are deleted through cq_delete_account(), which removes the user's
--    personal data and any organisation left without members.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cq_users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND email ~ '^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,24}$'),
  display_name text CHECK (char_length(display_name) <= 120),
  password_hash text NOT NULL CHECK (password_hash LIKE 'scrypt$%'),
  failed_logins int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.cq_orgs (
  org_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  personal boolean NOT NULL DEFAULT false,
  plan text NOT NULL DEFAULT 'research' CHECK (plan IN ('research','team','institutional')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cq_memberships (
  org_id uuid NOT NULL REFERENCES public.cq_orgs(org_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.cq_users(user_id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','analyst','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS cq_memberships_user_idx ON public.cq_memberships (user_id);

CREATE TABLE IF NOT EXISTS public.cq_workspace_items (
  item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.cq_orgs(org_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('assessment','valuation','watchlist','note')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  subject_lei char(20) CHECK (subject_lei ~ '^[A-Z0-9]{20}$'),
  payload jsonb NOT NULL CHECK (pg_column_size(payload) <= 262144),
  created_by uuid REFERENCES public.cq_users(user_id) ON DELETE SET NULL,
  version int NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cq_workspace_items_org_idx ON public.cq_workspace_items (org_id, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS cq_workspace_items_lei_idx ON public.cq_workspace_items (subject_lei) WHERE subject_lei IS NOT NULL;

ALTER TABLE public.cq_workspace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cq_workspace_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cq_workspace_items_tenant ON public.cq_workspace_items;
CREATE POLICY cq_workspace_items_tenant ON public.cq_workspace_items
  USING (org_id = nullif(current_setting('creqor.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('creqor.org_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS public.cq_account_audit (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  org_id uuid,
  action text NOT NULL CHECK (action ~ '^[a-z_.]{3,60}$'),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(detail) <= 8192)
);
CREATE INDEX IF NOT EXISTS cq_account_audit_user_idx ON public.cq_account_audit (user_id, at DESC);

-- Deletion runs with the owner's rights so the engine role needs no general DELETE on users.
CREATE OR REPLACE FUNCTION public.cq_delete_account(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE orphan uuid;
BEGIN
  FOR orphan IN SELECT m.org_id FROM cq_memberships m WHERE m.user_id = p_user
    AND NOT EXISTS (SELECT 1 FROM cq_memberships o WHERE o.org_id = m.org_id AND o.user_id <> p_user)
  LOOP
    DELETE FROM cq_orgs WHERE org_id = orphan;  -- cascades to its workspace items
  END LOOP;
  DELETE FROM cq_users WHERE user_id = p_user;
  INSERT INTO cq_account_audit (user_id, action, detail) VALUES (p_user, 'account.deleted', '{}'::jsonb);
END$$;
REVOKE ALL ON FUNCTION public.cq_delete_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cq_delete_account(uuid) TO creqor_app;

GRANT SELECT, INSERT, UPDATE ON public.cq_users, public.cq_orgs, public.cq_memberships TO creqor_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cq_workspace_items TO creqor_app;
GRANT INSERT, SELECT ON public.cq_account_audit TO creqor_app;

COMMIT;
