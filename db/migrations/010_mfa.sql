-- CREQOR migration 010: optional TOTP two-factor authentication.
-- The TOTP secret is stored AES-256-GCM encrypted by the engine (key in .env.dgx,
-- never in the database). Recovery codes are stored only as SHA-256 hashes.
BEGIN;
ALTER TABLE public.cq_users
  ADD COLUMN IF NOT EXISTS totp_secret_enc text,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_last_step bigint,
  ADD COLUMN IF NOT EXISTS recovery_code_hashes text[] NOT NULL DEFAULT '{}';
COMMIT;
