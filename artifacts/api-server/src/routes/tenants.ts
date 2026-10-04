import { Router } from "express";
import {
  ListTenantsResponse, CreateTenantBody, CreateTenantResponse, GetTenantParams, GetTenantResponse,
  UpdateTenantBrandBody, UpdateTenantBrandParams, UpdateTenantBrandResponse,
  UpdateTenantDomainBody, UpdateTenantDomainParams, UpdateTenantDomainResponse,
  UpdateTenantModulesBody, UpdateTenantModulesParams, UpdateTenantModulesResponse,
  UpdateTenantAssetsNetworksBody, UpdateTenantAssetsNetworksParams, UpdateTenantAssetsNetworksResponse,
  UpdateTenantConfigurationBody, UpdateTenantConfigurationParams, UpdateTenantConfigurationResponse,
  ActivateTenantParams, ActivateTenantResponse,
} from "@workspace/api-zod";
import { requireAuthentication, principalFrom, sameOriginMutation } from "../middlewares/authentication";
import { activateTenant, createTenant, getTenant, listTenants, saveAssets, saveBrand, saveConfiguration, saveDomain, saveModules } from "../modules/tenants/service";

const router = Router();
router.use("/tenants", requireAuthentication, sameOriginMutation);
router.get("/tenants", async (_req, res): Promise<void> => {
  res.json(ListTenantsResponse.parse(await listTenants(principalFrom(res))));
});
router.post("/tenants", async (req, res): Promise<void> => {
  const input = CreateTenantBody.parse(req.body);
  res.status(201).json(CreateTenantResponse.parse(await createTenant(principalFrom(res), input)));
});
router.get("/tenants/:tenantId", async (req, res): Promise<void> => {
  const { tenantId } = GetTenantParams.parse(req.params);
  res.json(GetTenantResponse.parse(await getTenant(principalFrom(res), tenantId)));
});
router.put("/tenants/:tenantId/brand", async (req, res): Promise<void> => {
  const { tenantId } = UpdateTenantBrandParams.parse(req.params);
  res.json(UpdateTenantBrandResponse.parse(await saveBrand(principalFrom(res), tenantId, UpdateTenantBrandBody.parse(req.body))));
});
router.put("/tenants/:tenantId/domain", async (req, res): Promise<void> => {
  const { tenantId } = UpdateTenantDomainParams.parse(req.params);
  res.json(UpdateTenantDomainResponse.parse(await saveDomain(principalFrom(res), tenantId, UpdateTenantDomainBody.parse(req.body).domain)));
});
router.put("/tenants/:tenantId/modules", async (req, res): Promise<void> => {
  const { tenantId } = UpdateTenantModulesParams.parse(req.params);
  res.json(UpdateTenantModulesResponse.parse(await saveModules(principalFrom(res), tenantId, UpdateTenantModulesBody.parse(req.body).moduleKeys)));
});
router.put("/tenants/:tenantId/assets-networks", async (req, res): Promise<void> => {
  const { tenantId } = UpdateTenantAssetsNetworksParams.parse(req.params);
  res.json(UpdateTenantAssetsNetworksResponse.parse(await saveAssets(principalFrom(res), tenantId, UpdateTenantAssetsNetworksBody.parse(req.body).assetNetworkIds)));
});
router.put("/tenants/:tenantId/configuration", async (req, res): Promise<void> => {
  const { tenantId } = UpdateTenantConfigurationParams.parse(req.params);
  res.json(UpdateTenantConfigurationResponse.parse(await saveConfiguration(principalFrom(res), tenantId, UpdateTenantConfigurationBody.parse(req.body))));
});
router.post("/tenants/:tenantId/launch", async (req, res): Promise<void> => {
  const { tenantId } = ActivateTenantParams.parse(req.params);
  res.json(ActivateTenantResponse.parse(await activateTenant(principalFrom(res), tenantId)));
});
export default router;