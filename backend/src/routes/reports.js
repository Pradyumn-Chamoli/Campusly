import { Router } from "express";
import {
  createReport,
  listReports,
  resolveReport,
} from "../controllers/reportController.js";
import {
  createReportValidation,
  listReportsValidation,
  resolveReportValidation,
} from "../validators/report.js";
import validate from "../middleware/validate.js";
import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  listReportsValidation,
  validate,
  listReports
);
router.post("/", authenticate, createReportValidation, validate, createReport);
router.put(
  "/:id/resolve",
  authenticate,
  authorize("ADMIN"),
  resolveReportValidation,
  validate,
  resolveReport
);

export default router;
