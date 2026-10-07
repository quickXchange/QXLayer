import { Router } from "express";
import {
  GetTenantProviderFoundationParams, GetTenantProviderFoundationResponse,
  GetProviderFoundationResponse, CreateProviderDefinitionResponse,
  UpdateProviderDefinitionParams, UpdateProviderDefinitionResponse,
  CreateProviderAssignmentParams, CreateProviderAssignmentResponse,
  UpdateProviderAssignmentParams, UpdateProviderAssignmentResponse,
  RemoveProviderAssignmentParams, SaveProviderPolicyParams, SaveProviderPolicyResponse,
  RemoveProviderPolicyParams,
} from "@workspace/api-zod";
import { principalFrom, requireAuthentication, sameOriginMutation } from "../middlewares/authentication";
import { providerFoundation } from "../modules/providers/read";
import { saveProviderDefinition } from "../modules/providers/catalog";
import { createProviderAssignment, updateProviderAssignment, removeProviderAssignment } from "../modules/providers/assignments";
import { saveProviderPolicy, removeProviderPolicy } from "../modules/providers/routing";

const router = Router();
router.use(["/providers", "/tenants/:tenantId/provider-foundation", "/tenants/:tenantId/provider-assignments", "/tenants/:tenantId/provider-policies"], requireAuthentication, sameOriginMutation,
  (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/providers/foundation", async (_req, res): Promise<void> => {
  res.json(GetProviderFoundationResponse.parse(await providerFoundation(principalFrom(res))));
});
router.post("/providers/catalog", async (req, res): Promise<void> => {
  res.status(201).json(CreateProviderDefinitionResponse.parse(await saveProviderDefinition(principalFrom(res), req.body)));
});
router.put("/providers/catalog/:providerId", async (req, res): Promise<void> => {
  const { providerId } = UpdateProviderDefinitionParams.parse(req.params);
  res.json(UpdateProviderDefinitionResponse.parse(await saveProviderDefinition(principalFrom(res), req.body, providerId)));
});
router.get("/tenants/:tenantId/provider-foundation", async (req, res): Promise<void> => {
  const { tenantId } = GetTenantProviderFoundationParams.parse(req.params);
  res.json(GetTenantProviderFoundationResponse.parse(await providerFoundation(principalFrom(res), tenantId)));
});
router.post("/tenants/:tenantId/provider-assignments", async (req, res): Promise<void> => {
  const { tenantId } = CreateProviderAssignmentParams.parse(req.params);
  res.status(201).json(CreateProviderAssignmentResponse.parse(await createProviderAssignment(principalFrom(res), tenantId, req.body)));
});
router.put("/tenants/:tenantId/provider-assignments/:assignmentId", async (req, res): Promise<void> => {
  const { tenantId, assignmentId } = UpdateProviderAssignmentParams.parse(req.params);
  res.json(UpdateProviderAssignmentResponse.parse(await updateProviderAssignment(principalFrom(res), tenantId, assignmentId, req.body)));
});
router.delete("/tenants/:tenantId/provider-assignments/:assignmentId", async (req, res): Promise<void> => {
  const { tenantId, assignmentId } = RemoveProviderAssignmentParams.parse(req.params);
  await removeProviderAssignment(principalFrom(res), tenantId, assignmentId);
  res.status(204).end();
});
router.put("/tenants/:tenantId/provider-policies", async (req, res): Promise<void> => {
  const { tenantId } = SaveProviderPolicyParams.parse(req.params);
  res.json(SaveProviderPolicyResponse.parse(await saveProviderPolicy(principalFrom(res), tenantId, req.body)));
});
router.delete("/tenants/:tenantId/provider-policies/:policyId", async (req, res): Promise<void> => {
  const { tenantId, policyId } = RemoveProviderPolicyParams.parse(req.params);
  await removeProviderPolicy(principalFrom(res), tenantId, policyId);
  res.status(204).end();
});
export default router;
