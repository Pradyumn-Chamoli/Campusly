import { Router } from "express";
import { getListings, getMyListings } from "../controllers/listingController.js";
import { listQueryValidation, myListingsQueryValidation } from "../validators/listing.js";
import validate from "../middleware/validate.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.get("/mine", authenticate, myListingsQueryValidation, validate, getMyListings);
router.get("/", listQueryValidation, validate, getListings);

export default router;
