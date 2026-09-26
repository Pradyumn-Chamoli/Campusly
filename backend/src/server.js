import http from "node:http";
import app from "./app.js";
import config from "./config/index.js";
import { storageMode } from "./config/storage.js";
import { initSocket } from "./socket.js";

// Socket.IO rides on the same HTTP server as Express so chat and REST share
// one origin in development and production.
const server = http.createServer(app);
initSocket(server);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
  console.log(`Listing image storage: ${storageMode}`);

  if (storageMode === "local") {
    console.log(
      "Cloudinary credentials are not set — images are stored in ./backend/uploads. " +
        "Add CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET to backend/.env to use Cloudinary."
    );
  }
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});
