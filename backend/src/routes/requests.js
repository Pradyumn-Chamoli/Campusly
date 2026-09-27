import { Router } from "express";
import {
  createRequest,
  listRequests,
  updateRequestStatus,
} from "../controllers/requestController.js";
import {
  createRequestValidation,
  listRequestsValidation,
  updateRequestStatusValidation,
} from "../validators/request.js";
import validate from "../middleware/validate.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.get("/", authenticate, listRequestsValidation, validate, listRequests);
router.post("/", authenticate, createRequestValidation, validate, createRequest);
router.put(
  "/:id/status",
  authenticate,
  updateRequestStatusValidation,
  validate,
  updateRequestStatus
);

export default router;
