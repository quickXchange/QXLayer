import assert from "node:assert/strict";
import test from "node:test";
import { GetPlatformManagementResponse } from "@workspace/api-zod";
import { platformManagement } from "./management";
import type { Principal } from "../authentication/service";

for (const role of ["unassigned", "staff", "client_admin"] as const) {
  test(`platform management denies ${role} before reading platform or identity data`, async () => {
    const principal: Principal = { userId: "permission-test", role, memberships: [] };
    await assert.rejects(platformManagement(principal), (error: unknown) =>
      (error as { status?: number }).status === 403);
  });
}
test("a demo cannot read platform management even if its role claims super_admin", async () => {
  await assert.rejects(platformManagement({
    userId: "permission-test", role: "super_admin", memberships: [], demo: true,
  }), (error: unknown) => (error as { status?: number }).status === 403);
});
test("directory unavailability is explicit and missing account dates remain unknown", () => {
  const data = GetPlatformManagementResponse.parse({
    customers: [{ id: "historical-account", name: "Linked account", email: null, status: "unavailable", createdAt: null, tenantIds: [] }],
    customerTotal: null, projects: [], audit: [], providers: [],
    directoryAvailable: false, directoryError: "Directory unavailable",
  });
  assert.equal(data.customerTotal, null);
  assert.equal(data.customers[0].createdAt, null);
});
test("an empty authoritative directory is zero, not unavailable", () => {
  const data = GetPlatformManagementResponse.parse({
    customers: [], customerTotal: 0, projects: [], audit: [], providers: [],
    directoryAvailable: true, directoryError: null,
  });
  assert.equal(data.customerTotal, 0);
});
