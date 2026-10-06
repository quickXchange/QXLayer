import { Router } from "express";
import { withDatabase } from "@workspace/db";
import { ListModuleCatalogResponse, ListSandboxAssetNetworksResponse } from "@workspace/api-zod";
import { ListProductRegistryResponse, RegisterProductModuleBody, RegisterProductModuleResponse } from "@workspace/api-zod";
import { principalFrom, requireAuthentication, sameOriginMutation } from "../middlewares/authentication";
import { readRegistry, registerProductModule } from "../modules/product-registry/service";

const router = Router();
router.get("/catalog/products", async (_req, res) => {
  res.json(ListProductRegistryResponse.parse(await withDatabase({ actorId: "public-catalog" }, readRegistry)));
});
router.post("/catalog/products", requireAuthentication, sameOriginMutation, async (req, res) => {
  res.status(201).json(RegisterProductModuleResponse.parse(await registerProductModule(principalFrom(res), RegisterProductModuleBody.parse(req.body))));
});
router.get("/modules", async (_req, res): Promise<void> => {
  const modules = await withDatabase({ actorId: "public-catalog" }, readRegistry);
  res.json(ListModuleCatalogResponse.parse(modules));
});
router.get("/asset-networks", async (_req, res): Promise<void> => {
  const assets = await withDatabase({ actorId: "public-catalog" }, async (client) => {
    const result = await client.query(
      "SELECT an.id AS asset_network_id,a.id AS asset_id,a.symbol,a.name, n.id AS network_id,n.name AS network_name,n.testnet FROM asset_network_catalog an JOIN asset_catalog a ON an.asset_id=a.id JOIN network_catalog n ON an.network_id=n.id ORDER BY a.symbol,n.name",
    );
    return result.rows.map((a) => ({ assetNetworkId: a.asset_network_id, assetId: a.asset_id, symbol: a.symbol, name: a.name, networkId: a.network_id, networkName: a.network_name, testnet: a.testnet }));
  });
  res.json(ListSandboxAssetNetworksResponse.parse({ assets, sandboxOnly: true }));
});
export default router;