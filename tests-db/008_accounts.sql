\set ON_ERROR_STOP 1
-- Tenant isolation is enforced by the database for the engine role.
INSERT INTO cq_users(user_id,email,password_hash) VALUES
 ('00000000-0000-0000-0000-00000000000a','a@example.com','scrypt$x'),('00000000-0000-0000-0000-00000000000b','b@example.com','scrypt$x');
INSERT INTO cq_orgs(org_id,name,personal) VALUES ('10000000-0000-0000-0000-00000000000a','A',true),('10000000-0000-0000-0000-00000000000b','B',true);
INSERT INTO cq_memberships VALUES ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a','owner'),
 ('10000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b','owner');
SET ROLE creqor_app;
BEGIN; SELECT set_config('creqor.org_id','10000000-0000-0000-0000-00000000000a',true);
INSERT INTO cq_workspace_items(org_id,kind,title,payload) VALUES ('10000000-0000-0000-0000-00000000000a','note','A secret','{}');
COMMIT;
BEGIN; SELECT set_config('creqor.org_id','10000000-0000-0000-0000-00000000000b',true);
DO $$DECLARE n int;BEGIN
 IF EXISTS (SELECT 1 FROM cq_workspace_items) THEN RAISE EXCEPTION 'org B can read org A items'; END IF;
 UPDATE cq_workspace_items SET title='x'; GET DIAGNOSTICS n = ROW_COUNT; IF n>0 THEN RAISE EXCEPTION 'org B updated org A'; END IF;
 DELETE FROM cq_workspace_items; GET DIAGNOSTICS n = ROW_COUNT; IF n>0 THEN RAISE EXCEPTION 'org B deleted org A'; END IF;
 BEGIN INSERT INTO cq_workspace_items(org_id,kind,title,payload) VALUES ('10000000-0000-0000-0000-00000000000a','note','forged','{}');
  RAISE EXCEPTION 'org B wrote into org A'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
COMMIT;
DO $$BEGIN IF EXISTS (SELECT 1 FROM cq_workspace_items) THEN RAISE EXCEPTION 'no org context must see nothing'; END IF; END$$;
DO $$BEGIN
 BEGIN DELETE FROM cq_users; RAISE EXCEPTION 'engine role can delete users'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END$$;
SELECT cq_delete_account('00000000-0000-0000-0000-00000000000a');
RESET ROLE;
DO $$BEGIN
 IF EXISTS (SELECT 1 FROM cq_users WHERE email='a@example.com') OR EXISTS (SELECT 1 FROM cq_orgs WHERE name='A') THEN RAISE EXCEPTION 'account deletion incomplete'; END IF;
 IF (SELECT count(*) FROM cq_workspace_items WHERE title='A secret')>0 THEN RAISE EXCEPTION 'orphan workspace data left'; END IF;
END$$;
SELECT 'migration 008 checks passed';
