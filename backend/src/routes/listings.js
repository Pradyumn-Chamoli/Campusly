import { Router } from "express";
import {
  createListing,
  deleteListing,
  getListings,
  getListing,
  getMyListings,
  updateListing,
} from "../controllers/listingController.js";
import { addListingImages, deleteListingImage } from "../controllers/listingImageController.js";
import {
  createListingValidation,
  listingIdValidation,
  listQueryValidation,
  myListingsQueryValidation,
  updateListingValidation,
} from "../validators/listing.js";
import validate from "../middleware/validate.js";
import authenticate, { optionalAuthenticate } from "../middleware/authenticate.js";
import { upload } from "../config/storage.js";

const router = Router();

router.get("/mine", authenticate, myListingsQueryValidation, validate, getMyListings);
router.get("/", listQueryValidation, validate, getListings);
router.post("/", authenticate, createListingValidation, validate, createListing);

// Created before "/:id" so the literal path always wins.
router.get("/:id", optionalAuthenticate, listingIdValidation, validate, getListing);
router.put("/:id", authenticate, listingIdValidation, updateListingValidation, validate, updateListing);
router.delete("/:id", authenticate, listingIdValidation, validate, deleteListing);

router.post("/:listingId/images", authenticate, upload.array("images", 5), addListingImages);
router.delete("/:listingId/images/:imageId", authenticate, deleteListingImage);

export default router;
