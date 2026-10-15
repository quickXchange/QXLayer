"""Synthetic local socket only. Never connects to a source or hosted database."""
import glob
import json
import pathlib
import shutil
import subprocess
import tempfile

root = pathlib.Path(tempfile.mkdtemp(prefix="vynox-delta-"))
socket = root / "socket"
socket.mkdir(mode=0o700)
tools = pathlib.Path(glob.glob("/nix/store/*-postgresql-17.6/bin")[0])
env = {"PATH": str(tools), "HOME": str(root), "LANG": "C", "LC_ALL": "C"}


def run(command, *args, input=None):
    result = subprocess.run(
        [str(tools / command), *map(str, args)], input=input, text=True,
        capture_output=True, env=env, timeout=90,
    )
    if result.returncode:
        raise RuntimeError(command + ": " + result.stderr[-1800:])
    return result.stdout


started = False
try:
    run("initdb", "-D", root / "data", "--username=postgres",
        "--auth-local=trust", "--auth-host=reject", "--no-locale")
    run("pg_ctl", "-D", root / "data", "-l", root / "log", "-o",
        f"-c listen_addresses='' -c unix_socket_directories='{socket}' -c port=55681",
        "-w", "start")
    started = True
    sql = ("CREATE ROLE supabase_admin; CREATE ROLE anon; CREATE ROLE authenticated; "
           "CREATE ROLE service_role; SET qxlayer.external_migration_authorized='yes'; "
           "SET qxlayer.auth_schema_approved='yes';\n")
    for name in ["0001_application_schema.sql", "0002_runtime_security.sql", "0003_owned_auth.sql"]:
        sql += (pathlib.Path("deploy/migrations") / name).read_text() + "\n"
    sql += "BEGIN;\n" + pathlib.Path(
        "deploy/production-candidate/0004_latest-schema-PREPARED.sql").read_text() + "\n"
    sql += """
    SELECT json_build_object(
      'policies',(SELECT count(*) FROM pg_policies WHERE schemaname='public'),
      'usingClauses',(SELECT count(*) FROM pg_policies WHERE schemaname='public' AND qual IS NOT NULL),
      'writeChecks',(SELECT count(*) FROM pg_policies WHERE schemaname='public' AND with_check IS NOT NULL),
      'forceRls',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relforcerowsecurity),
      'privateTables',(SELECT count(*) FROM information_schema.tables WHERE table_schema='vynox_supabase_auth'),
      'privateColumns',(SELECT count(*) FROM information_schema.columns WHERE table_schema='vynox_supabase_auth'),
      'privateConstraints',(SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='vynox_supabase_auth'),
      'privateSchemaIsolated',NOT has_schema_privilege('anon','vynox_supabase_auth','USAGE')
        AND NOT has_schema_privilege('authenticated','vynox_supabase_auth','USAGE')
        AND NOT has_schema_privilege('qxlayer_runtime','vynox_supabase_auth','USAGE'));
    COMMIT;
    """
    output = run("psql", "-h", socket, "-p", "55681", "-U", "postgres", "-d", "postgres",
                 "-v", "ON_ERROR_STOP=1", "-At", input=sql)
    result = json.loads([line for line in output.splitlines() if line.startswith("{")][-1])
    assert result == dict(policies=84, usingClauses=84, writeChecks=42, forceRls=42,
                          privateTables=5, privateColumns=20, privateConstraints=11,
                          privateSchemaIsolated=True), result
    result.update(syntheticLocalOnly=True, liveModified=False, sourceRowsCopied=False)
    out = pathlib.Path("generated-artifacts/external-finalization")
    out.mkdir(parents=True, exist_ok=True)
    (out / "schema-rehearsal.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))
finally:
    if started:
        run("pg_ctl", "-D", root / "data", "-m", "immediate", "stop")
    shutil.rmtree(root)
