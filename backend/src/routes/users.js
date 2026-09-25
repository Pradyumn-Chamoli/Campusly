import { Router } from "express";
import { getPublicProfile, updateMyProfile } from "../controllers/userController.js";
import { userIdValidation, updateProfileValidation } from "../validators/user.js";
import validate from "../middleware/validate.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.put("/profile", authenticate, updateProfileValidation, validate, updateMyProfile);
router.get("/:id", userIdValidation, validate, getPublicProfile);

export default router;
