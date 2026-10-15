#!/usr/bin/env python3
"""Fresh source schema + real PostgreSQL RLS tests. Synthetic data, no remote DB."""
import glob
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def rehearse():
    tools = Path(sorted(glob.glob("/nix/store/*postgresql-17.6/bin/initdb"))[0]).parent
    schema_files = list(Path("generated-artifacts/auth-security/production-candidate-schema-complete").glob("0000_*.sql"))
    assert len(schema_files) == 1
    sql = schema_files[0].read_text().replace("--> statement-breakpoint", "")
    root = Path(tempfile.mkdtemp(prefix="vynox-source-rehearsal-"))
    root.chmod(0o700)
    socket = root / "socket"
    socket.mkdir(mode=0o700)
    env = {"PATH": str(tools), "LANG": "C", "LC_ALL": "C", "HOME": str(root),
           "PGHOST": str(socket), "PGPORT": "55449", "PGUSER": "candidate_owner", "PGDATABASE": "postgres"}
    started = False
    checks = []

    def run(name, args, stdin=None, expected="ok"):
        p = subprocess.run([str(tools / name), *args], input=stdin, text=True, env=env,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        if expected == "ok":
            if p.returncode:
                # Only synthetic schema/data, clean environment and local socket.
                raise RuntimeError("LOCAL_POSTGRES_" + name.upper() + "_FAILED: " + p.stderr[:1200])
        else:
            assert p.returncode and expected in p.stderr, "Expected guarded SQL rejection"
        return p.stdout.strip()

    def query(statement, expected="ok"):
        return run("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate"], statement, expected)

    try:
        run("initdb", ["-D", str(root / "data"), "--username=candidate_owner",
                      "--auth-local=trust", "--auth-host=reject", "--encoding=UTF8", "--no-locale"])
        run("pg_ctl", ["-D", str(root / "data"), "-l", str(root / "server.log"),
                      "-o", f"-c listen_addresses='' -c unix_socket_directories='{socket}' -c port=55449", "-w", "start"])
        started = True
        query(sql)
        query("""
CREATE ROLE candidate_tenant NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE candidate_anonymous NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO candidate_tenant;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO candidate_tenant;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO candidate_tenant;
REVOKE ALL ON SCHEMA vynox_supabase_auth FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA vynox_supabase_auth FROM PUBLIC;
INSERT INTO tenants(id,name,slug,status) VALUES
('10000000-0000-4000-8000-000000000001','Synthetic A','synthetic-a','active'),
('10000000-0000-4000-8000-000000000002','Synthetic B','synthetic-b','active');
INSERT INTO tenant_branding(tenant_id,brand_name) VALUES
('10000000-0000-4000-8000-000000000001','A'),
('10000000-0000-4000-8000-000000000002','B');
""")
        tables = query("SELECT count(*) FROM pg_tables WHERE schemaname='vynox_supabase_auth';")
        assert tables == "5"
        checks.append("complete_private_auth_schema")
        assert query("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND qual IS NULL;") == "0"
        assert query("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND cmd='ALL' AND with_check IS NULL;") == "0"
        checks.append("all_rls_predicates_explicit")
        a = "10000000-0000-4000-8000-000000000001"
        b = "10000000-0000-4000-8000-000000000002"
        context = f"""BEGIN;SET LOCAL ROLE candidate_tenant;
SELECT set_config('app.tenant_id','{a}',true);
SELECT set_config('app.is_super_admin','false',true);
SELECT set_config('app.can_write','true',true);"""
        result = query(context + "SELECT count(*) FROM tenant_branding; ROLLBACK;").splitlines()
        assert result[-1] == "1"
        checks.append("tenant_read_isolation")
        query(context + f"INSERT INTO tenant_branding(tenant_id,brand_name) VALUES('{b}','Denied');", "42501")
        checks.append("foreign_insert_denied")
        assert query(context + f"WITH changed AS (UPDATE tenant_branding SET brand_name='Denied' WHERE tenant_id='{b}' RETURNING *) SELECT count(*) FROM changed;ROLLBACK;").splitlines()[-1] == "0"
        checks.append("foreign_update_denied")
        assert query(context + f"WITH changed AS (DELETE FROM tenant_branding WHERE tenant_id='{b}' RETURNING *) SELECT count(*) FROM changed;ROLLBACK;").splitlines()[-1] == "0"
        checks.append("foreign_delete_denied")
        assert query(context + f"WITH changed AS (UPDATE tenant_branding SET brand_name='Allowed' WHERE tenant_id='{a}' RETURNING *) SELECT count(*) FROM changed;ROLLBACK;").splitlines()[-1] == "1"
        checks.append("own_update_allowed")
        query("SET ROLE candidate_anonymous;SELECT * FROM platform_admins;", "42501")
        checks.append("anonymous_admin_read_denied")
        query("SET ROLE candidate_tenant;SELECT * FROM vynox_supabase_auth.sessions;", "42501")
        checks.append("tenant_auth_storage_denied")
        query("INSERT INTO vynox_supabase_auth.sessions VALUES('bad','20000000-0000-4000-8000-000000000001','synthetic',now());", "23514")
        checks.append("session_digest_constraint")
        query("""INSERT INTO vynox_supabase_auth.identity_links(subject,business_id,proof_subject)
VALUES('20000000-0000-4000-8000-000000000001','synthetic_original_owner','synthetic_proof');""")
        query("""INSERT INTO vynox_supabase_auth.identity_links(subject,business_id,proof_subject)
VALUES('20000000-0000-4000-8000-000000000002','synthetic_original_owner','different_proof');""", "23505")
        checks.append("duplicate_owner_link_denied")
        return {"status": "PASSED", "synthetic": True, "liveModified": False, "checks": checks,
                "nativePublishPlanVerified": False, "authSchemaTables": 5}
    finally:
        if started:
            subprocess.run([str(tools / "pg_ctl"), "-D", str(root / "data"), "-m", "immediate", "stop"],
                           env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    try:
        report = rehearse()
        Path("generated-artifacts/auth-security/production-candidate-local-rehearsal.json").write_text(json.dumps(report, indent=2))
        print(json.dumps(report))
    except Exception as error:
        print(json.dumps({"status": "FAILED", "code": "LOCAL_CANDIDATE_REHEARSAL_FAILED",
                          "syntheticOnlyDiagnostic": str(error)}))
        raise SystemExit(1)
