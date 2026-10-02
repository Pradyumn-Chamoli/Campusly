import { Router } from "express";
import { getRemovedListings } from "../controllers/listingController.js";
import { paginationValidation } from "../validators/listing.js";
import validate from "../middleware/validate.js";
import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";

const router = Router();

router.get(
  "/listings/removed",
  authenticate,
  authorize("ADMIN"),
  paginationValidation,
  validate,
  getRemovedListings
);

export default router;
