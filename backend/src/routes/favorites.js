import { Router } from "express";
import {
  addFavorite,
  getFavorites,
  removeFavorite,
} from "../controllers/favoriteController.js";
import {
  addFavoriteValidation,
  favoriteListingIdValidation,
  favoriteQueryValidation,
} from "../validators/favorite.js";
import validate from "../middleware/validate.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.get("/", authenticate, favoriteQueryValidation, validate, getFavorites);
router.post("/", authenticate, addFavoriteValidation, validate, addFavorite);
router.delete(
  "/:listingId",
  authenticate,
  favoriteListingIdValidation,
  validate,
  removeFavorite
);

export default router;
