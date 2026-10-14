#!/usr/bin/env python3
"""Synthetic-only local restore: no real backup input, URLs or provider credentials."""
import glob
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def run(binary, args, env, sql=None):
    return subprocess.run([str(binary), *args], input=sql, text=True, env=env,
                          check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL, timeout=40).stdout.strip()


def rehearse():
    candidates = sorted(glob.glob("/nix/store/*postgresql-16.15/bin/initdb"))
    if not candidates:
        raise ValueError("Existing PostgreSQL 16.15 tools unavailable; no install attempted")
    binary = Path(candidates[0]).parent
    root = Path(tempfile.mkdtemp(prefix="vynox-synthetic-restore-"))
    os.chmod(root, 0o700)
    data, socket = root / "data", root / "socket"
    socket.mkdir(mode=0o700)
    # Never inherit DATABASE_URL, production PG defaults, app or provider secrets.
    env = {"PATH": str(binary) + ":/usr/bin:/bin", "LANG": "C", "LC_ALL": "C",
           "HOME": str(root), "PGHOST": str(socket), "PGPORT": "55439",
           "PGUSER": "rehearsal_operator", "PGDATABASE": "postgres"}
    started = False
    try:
        version = run(binary / "postgres", ["--version"], env)
        run(binary / "initdb", ["-D", str(data), "--username=rehearsal_operator",
                               "--auth-local=trust", "--auth-host=reject",
                               "--encoding=UTF8", "--no-locale"], env)
        run(binary / "pg_ctl", ["-D", str(data), "-l", str(root / "synthetic-server.log"),
                               "-o", f"-c listen_addresses='' -c unix_socket_directories='{socket}' -c port=55439",
                               "-w", "start"], env)
        started = True
        for database in ("synthetic_source", "synthetic_restore"):
            run(binary / "createdb", [database], env)
        psql = ["-X", "-qAt", "--no-password", "-v", "ON_ERROR_STOP=1"]
        fixture = """CREATE TABLE rehearsal_records(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 business_key text UNIQUE NOT NULL, exact_integer bigint CHECK(exact_integer>0));
CREATE TABLE rehearsal_refs(record_id bigint REFERENCES rehearsal_records(id),note text NOT NULL);
INSERT INTO rehearsal_records(business_key,exact_integer) VALUES('SYNTHETIC_ONLY',9223372036854775806);
INSERT INTO rehearsal_refs VALUES(1,'NO_REAL_ACCOUNT_OR_DATA');
"""
        run(binary / "psql", [*psql, "-d", "synthetic_source"], env, fixture)
        dump = subprocess.Popen([str(binary / "pg_dump"), "-Fc", "--no-owner",
                                 "--no-acl", "-d", "synthetic_source"], env=env,
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        try:
            restored = subprocess.run([str(binary / "pg_restore"), "--exit-on-error",
                                       "--no-owner", "--no-acl", "-d", "synthetic_restore"],
                                      env=env, stdin=dump.stdout, stdout=subprocess.DEVNULL,
                                      stderr=subprocess.DEVNULL, timeout=40)
        finally:
            dump.stdout.close()
            if dump.poll() is None:
                try:
                    dump.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    dump.kill()
                    dump.wait()
        if restored.returncode or dump.returncode:
            raise ValueError("Synthetic dump/restore failed")
        evidence = """SELECT jsonb_build_object(
 'records',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM rehearsal_records r),
 'refs',(SELECT jsonb_agg(to_jsonb(r) ORDER BY record_id) FROM rehearsal_refs r),
 'constraints',(SELECT jsonb_agg(pg_get_constraintdef(oid) ORDER BY conname)
 FROM pg_constraint WHERE conrelid IN ('rehearsal_records'::regclass,'rehearsal_refs'::regclass)),
 'sequence',(SELECT jsonb_build_object('last_value',last_value,'is_called',is_called)
 FROM rehearsal_records_id_seq));
"""
        baseline = json.loads(run(binary / "psql", [*psql, "-d", "synthetic_source"], env, evidence))
        result = json.loads(run(binary / "psql", [*psql, "-d", "synthetic_restore"], env, evidence))
        if baseline != result or result["records"][0]["exact_integer"] != 9223372036854775806:
            raise ValueError("Synthetic records, constraints or sequence changed")
        listeners = run(binary / "psql", [*psql, "-d", "postgres"], env,
                        "SHOW listen_addresses;")
        if listeners:
            raise ValueError("Network listener unexpectedly enabled")
        return {"status": "SYNTHETIC_LOCAL_RESTORE_PASSED", "postgres_version": version,
                "unix_socket_only": True, "private_directory_mode": "0700",
                "production_credentials_inherited": False, "remote_services_contacted": False,
                "records_constraints_and_sequence_equal": True,
                "bigint_roundtrip_exact": True, "real_backup_or_owner_account_used": False,
                "production_restore_approved": False}
    finally:
        if started:
            subprocess.run([str(binary / "pg_ctl"), "-D", str(data), "-m", "immediate",
                            "-w", "stop"], env=env, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=20, check=True)
        shutil.rmtree(root)


if __name__ == "__main__":
    try:
        report = rehearse()
        report["synthetic_cluster_removed"] = True
        print(json.dumps(report, indent=2))
    except Exception as error:
        print(json.dumps({"status": "BLOCKED", "error_type": type(error).__name__,
                          "real_backup_or_owner_account_used": False}))
        raise SystemExit(1)
