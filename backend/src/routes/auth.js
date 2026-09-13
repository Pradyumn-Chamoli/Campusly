import { Router } from "express";
import { register, login, logout, me } from "../controllers/authController.js";
import { registerValidation, loginValidation } from "../validators/auth.js";
import validate from "../middleware/validate.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.post("/register", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
