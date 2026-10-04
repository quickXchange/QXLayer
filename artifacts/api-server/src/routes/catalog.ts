import { Router } from "express";
import { withDatabase } from "@workspace/db";
import { ListModuleCatalogResponse, ListSandboxAssetNetworksResponse } from "@workspace/api-zod";

const router = Router();
router.get("/modules", async (_req, res): Promise<void> => {
  const modules = await withDatabase({ actorId: "public-catalog" }, async (client) => {
    const result = await client.query("SELECT key,name,description,category,sandbox_available FROM module_catalog ORDER BY key");
    return result.rows.map((m) => ({ key: m.key, name: m.name, description: m.description, category: m.category, sandboxAvailable: m.sandbox_available }));
  });
  res.json(ListModuleCatalogResponse.parse(modules));
});
router.get("/asset-networks", async (_req, res): Promise<void> => {
  const assets = await withDatabase({ actorId: "public-catalog" }, async (client) => {
    const result = await client.query(
      "SELECT a.id AS asset_id,a.symbol,a.name, n.id AS network_id,n.name AS network_name,n.testnet FROM asset_network_catalog an JOIN asset_catalog a ON an.asset_id=a.id JOIN network_catalog n ON an.network_id=n.id ORDER BY a.symbol,n.name",
    );
    return result.rows.map((a) => ({ assetId: a.asset_id, symbol: a.symbol, name: a.name, networkId: a.network_id, networkName: a.network_name, testnet: a.testnet }));
  });
  res.json(ListSandboxAssetNetworksResponse.parse({ assets, sandboxOnly: true }));
});
export default router;