import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const DEFAULT_JWT_SECRET = "dev-secret-change-me";

// A known or missing secret would let anyone mint valid tokens. Refusing to
// boot is safer than silently running with it (docs/02 §12 "Secret management").
if (nodeEnv === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET)) {
  throw new Error(
    "JWT_SECRET must be set to a unique value when NODE_ENV=production"
  );
}

export default {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};
