#!/usr/bin/env python3
"""Read-only metadata inspection. No exports, uploads, restores or remote writes."""
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import ssl
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
KIT = ROOT / "generated-artifacts/qxlayer-production-transfer-40"
sys.path.insert(0, str(KIT))


def management_get(path):
    if not re.fullmatch(r"/v1/projects(?:/[a-z]{20}/database/backups)?", path):
        raise ValueError("Only reviewed management metadata GET paths allowed")
    token = os.environ.get("QXLAYER_SUPABASE_MANAGEMENT_TOKEN")
    if not token:
        return {"available": False, "reason": "management credential absent"}
    connection = http.client.HTTPSConnection("api.supabase.com", timeout=20,
                                             context=ssl.create_default_context())
    try:
        connection.request("GET", path, headers={"Authorization": "Bearer " + token})
        response = connection.getresponse()
        payload = response.read(1048577)
        if response.status != 200 or len(payload) > 1048576:
            return {"available": False, "http_status": response.status,
                    "edge_challenge_marker": b"cloudflare" in payload.lower(),
                    "json_error_response": response.getheader("Content-Type", "").startswith("application/json")}
        return {"available": True, "data": json.loads(payload)}
    finally:
        connection.close()


def dedicated_source():
    from secure_preflight import connection_environment
    env = connection_environment(os.environ)
    env["PGOPTIONS"] += " -c statement_timeout=10000"
    sql = r"""\conninfo
BEGIN READ ONLY;
SELECT jsonb_build_object(
 'database',current_database(),'version',current_setting('server_version'),
 'read_only',current_setting('transaction_read_only'),
 'admin_count',(SELECT count(*) FROM public.platform_admins),
 'active_admin_count',(SELECT count(*) FROM public.platform_admins WHERE active),
 'original_admin_row_matches',EXISTS(SELECT 1 FROM public.platform_admins p
  WHERE encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex')
   ='463c6f5c4a7cddab63f559943b323e21658932ca8ebb181b757aeafd308e526a'));
ROLLBACK;
"""
    result = subprocess.run(["psql", "-X", "-qAt", "--no-password",
                             "-v", "ON_ERROR_STOP=1"], input=sql, text=True,
                            env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                            timeout=30)
    if result.returncode:
        return {"available": False, "reason": "pinned verified-TLS metadata read refused"}
    records = [json.loads(line) for line in result.stdout.splitlines() if line.startswith("{")]
    if len(records) != 1 or records[0].get("read_only") != "on":
        raise ValueError("Read-only result set missing")
    tls = re.search(r"SSL connection \(protocol: (TLSv1\.[23])", result.stdout)
    if not tls:
        raise ValueError("Client TLS readback unavailable; do not weaken TLS")
    return {"available": True, "metadata": records[0], "client_tls": tls.group(1),
            "verified_hostname_and_ca": True, "channel_binding_required": True,
            "dedicated_export_host_matches_configured_pin": True,
            "deployed_application_binding_proven": False}


def receiving_storage():
    from supabase_connection import configuration, Storage, BUCKET
    config = configuration(os.environ)
    ref = config["host"].split(".")[0]
    storage = Storage(config)
    # Never call supabase_backup.ready(): it can create a missing bucket.
    buckets = storage.json("GET", "/storage/v1/bucket")
    if not isinstance(buckets, list):
        raise ValueError("Bucket metadata result missing")
    bucket = next((item for item in buckets if item.get("id") == BUCKET), None)
    projects = management_get("/v1/projects")
    project = next((p for p in projects.get("data", [])
                    if p.get("id") == ref), None) if projects.get("available") else None
    backups = management_get("/v1/projects/" + ref + "/database/backups")
    data = backups.get("data", {})
    return {"available": True, "configured_project_ref": ref,
            "project_metadata": {key: project.get(key) for key in ("id", "name", "region", "status")}
            if project else None,
            "project_management_metadata_http_status": 200 if projects.get("available")
            else projects.get("http_status"),
            "pinned_auth_environment": {"nktstksmfpcsjnjbeqsk": "development",
                                        "muvedavhbpgpdrrnjrih": "staging"}.get(ref, "not-an-auth-pin"),
            "receiving_bucket": BUCKET, "bucket_exists": bucket is not None,
            "bucket_public": bucket.get("public") if bucket else None,
            "bucket_file_size_limit": bucket.get("file_size_limit") if bucket else None,
            "bucket_allowed_mime_types": bucket.get("allowed_mime_types") if bucket else None,
            "server_authenticated_metadata_only": True,
            "anonymous_object_access_or_full_rls_not_proven": True,
            "provider_backup_metadata_available": backups.get("available", False),
            "provider_backup_metadata_http_status": 200 if backups.get("available")
            else backups.get("http_status"),
            "provider_pitr_enabled": data.get("pitr_enabled") if isinstance(data, dict) else None,
            "provider_backup_count": len(data.get("backups", []))
            if isinstance(data, dict) and isinstance(data.get("backups"), list) else None,
            "new_storage_writes_authorized": False}


def safely(operation):
    try:
        return operation()
    except Exception as error:
        # No exception messages, request bodies, key/URL values or subprocess logs.
        return {"available": False, "reason": "metadata check blocked",
                "error_type": type(error).__name__}


if __name__ == "__main__":
    report = {"scope": "READ_ONLY_METADATA", "dedicated_source": safely(dedicated_source),
              "receiving_storage": safely(receiving_storage),
              "key_recovery": {"configured_key_present": bool(os.environ.get("QXLAYER_BACKUP_PASSPHRASE")),
                               "independent_key_custody_verified": False},
              "real_backup_created": False, "remote_writes_executed": False}
    print(json.dumps(report, indent=2))
