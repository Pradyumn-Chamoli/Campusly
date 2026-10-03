import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import config from "./config/index.js";
import { storageMode, UPLOADS_DIR } from "./config/storage.js";
import routes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimit.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Serving local uploads at the same origin keeps the images reachable through
// the Vite proxy in development. Cloudinary serves its own URLs instead.
if (storageMode === "local") {
  app.use(
    "/uploads",
    // Images may be loaded from another origin (e.g. a separate frontend host).
    helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
    express.static(UPLOADS_DIR, { maxAge: "7d", fallthrough: true })
  );
}

// Credential endpoints get the strict limiter; everything else gets the broad
// one. Both run before the router so rejected requests never reach handlers.
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", routes);

app.use(errorHandler);

export default app;
