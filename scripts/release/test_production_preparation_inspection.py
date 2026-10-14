import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "production_inspector", Path(__file__).with_name("inspect-production-preparation.py"))
inspector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inspector)


class ReadOnlyInspectionTests(unittest.TestCase):
    def test_management_mutation_or_unreviewed_paths_never_reach_network(self):
        for path in ("/v1/projects/abcdefghijklmnopqrst/restore",
                     "/v1/projects/abcdefghijklmnopqrst/config/auth",
                     "/v1/projects?token=synthetic"):
            with self.assertRaises(ValueError):
                inspector.management_get(path)

    def test_missing_bucket_is_reported_without_creation_or_upload(self):
        calls = []

        class FakeStorage:
            def __init__(self, config):
                pass

            def json(self, method, path):
                calls.append((method, path))
                return []

        module = types.SimpleNamespace(
            configuration=lambda env: {"host": "muvedavhbpgpdrrnjrih.supabase.co"},
            Storage=FakeStorage, BUCKET="synthetic-private-backups")
        with patch.dict(sys.modules, {"supabase_connection": module}), \
                patch.object(inspector, "management_get", return_value={"available": False, "http_status": 403}):
            result = inspector.receiving_storage()
        self.assertEqual(calls, [("GET", "/storage/v1/bucket")])
        self.assertFalse(result["bucket_exists"])
        self.assertEqual(result["pinned_auth_environment"], "staging")
        self.assertEqual(result["provider_backup_metadata_http_status"], 403)
        self.assertFalse(result["new_storage_writes_authorized"])

    def test_errors_never_print_exception_messages_or_credentials(self):
        def fail():
            raise ValueError("SYNTHETIC-CREDENTIAL-MATERIAL")
        result = inspector.safely(fail)
        self.assertNotIn("SYNTHETIC-CREDENTIAL-MATERIAL", json.dumps(result))
        self.assertEqual(result["error_type"], "ValueError")

    def source_result(self, stdout):
        env = {"PGOPTIONS": "-c default_transaction_read_only=on"}
        module = types.SimpleNamespace(connection_environment=lambda _: env)
        result = types.SimpleNamespace(returncode=0, stdout=stdout)
        with patch.dict(sys.modules, {"secure_preflight": module}), \
                patch.object(inspector.subprocess, "run", return_value=result) as child:
            value = inspector.dedicated_source()
        self.assertIn("BEGIN READ ONLY", child.call_args.kwargs["input"])
        self.assertEqual(child.call_args.kwargs["stderr"], inspector.subprocess.DEVNULL)
        self.assertNotIn("DATABASE_URL", child.call_args.kwargs["env"])
        return value

    def test_matching_database_is_not_claimed_as_deployed_app_binding(self):
        result = self.source_result('SSL connection (protocol: TLSv1.3, cipher: synthetic)\n'
                                    '{"read_only":"on","original_admin_row_matches":true}\n')
        self.assertTrue(result["available"])
        self.assertTrue(result["verified_hostname_and_ca"])
        self.assertFalse(result["deployed_application_binding_proven"])

    def test_missing_readonly_or_client_tls_proof_fails_closed(self):
        for stdout in ('{"read_only":"off"}\n', '{"read_only":"on"}\n'):
            with self.assertRaises(ValueError):
                self.source_result(stdout)


if __name__ == "__main__":
    unittest.main()
