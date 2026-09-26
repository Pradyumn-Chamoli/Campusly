import { Router } from "express";
import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import listingRoutes from "./listings.js";
import favoriteRoutes from "./favorites.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/listings", listingRoutes);
router.use("/favorites", favoriteRoutes);

export default router;
