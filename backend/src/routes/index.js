import { Router } from "express";
import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import listingRoutes from "./listings.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/listings", listingRoutes);

export default router;
