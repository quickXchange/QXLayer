import { Router } from "express";
import {
  ListMyAdminPanelsResponse, ListMyWhiteLabelRequestsResponse, SubmitWhiteLabelRequestBody, SubmitWhiteLabelRequestResponse,
  ListWhiteLabelRequestsResponse, ReviewWhiteLabelRequestParams, ReviewWhiteLabelRequestBody, ReviewWhiteLabelRequestResponse,
  ProvisionWhiteLabelRequestParams, ProvisionWhiteLabelRequestBody, ProvisionWhiteLabelRequestResponse,
} from "@workspace/api-zod";
import { requireAuthentication, principalFrom, sameOriginMutation } from "../middlewares/authentication";
import { myAdminPanels, listRequests, submitRequest, reviewRequest, deliverRequest } from "../modules/customer/service";
const router = Router();
router.use(["/customer", "/operator"], requireAuthentication, sameOriginMutation);
router.get("/customer/admin-panels", async (_req, res) => res.json(ListMyAdminPanelsResponse.parse(await myAdminPanels(principalFrom(res)))));
router.get("/customer/white-label-requests", async (_req, res) => res.json(ListMyWhiteLabelRequestsResponse.parse(await listRequests(principalFrom(res)))));
router.post("/customer/white-label-requests", async (req, res) => res.status(201).json(SubmitWhiteLabelRequestResponse.parse(await submitRequest(principalFrom(res), SubmitWhiteLabelRequestBody.parse(req.body)))));
router.get("/operator/white-label-requests", async (_req, res) => res.json(ListWhiteLabelRequestsResponse.parse(await listRequests(principalFrom(res), true))));
router.put("/operator/white-label-requests/:requestId/review", async (req, res) => res.json(ReviewWhiteLabelRequestResponse.parse(await reviewRequest(principalFrom(res), ReviewWhiteLabelRequestParams.parse(req.params).requestId, ReviewWhiteLabelRequestBody.parse(req.body)))));
router.post("/operator/white-label-requests/:requestId/provision", async (req, res) => res.json(ProvisionWhiteLabelRequestResponse.parse(await deliverRequest(principalFrom(res), ProvisionWhiteLabelRequestParams.parse(req.params).requestId, ProvisionWhiteLabelRequestBody.parse(req.body).tenantId))));
export default router;