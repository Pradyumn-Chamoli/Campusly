import { Router } from "express";
import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import listingRoutes from "./listings.js";
import favoriteRoutes from "./favorites.js";
import conversationRoutes from "./conversations.js";
import requestRoutes from "./requests.js";
import reportRoutes from "./reports.js";
import adminRoutes from "./admin.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/listings", listingRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/conversations", conversationRoutes);
router.use("/requests", requestRoutes);
router.use("/reports", reportRoutes);
router.use("/admin", adminRoutes);

export default router;
