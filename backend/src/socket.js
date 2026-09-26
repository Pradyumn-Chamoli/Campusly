import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import config from "./config/index.js";

let io = null;

// Socket.IO is used for delivery only: messages are written over REST and
// PostgreSQL stays the source of truth (docs/03 §10).
export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  // Handshake auth: the same JWT the REST API uses, sent as `auth.token`.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Not authenticated"));

    try {
      const payload = jwt.verify(token, config.jwtSecret);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("Not authenticated"));
    }
  });

  io.on("connection", (socket) => {
    // Every user has a personal room, so delivering to the two participants
    // of a conversation needs no room management from the client.
    socket.join(`user:${socket.userId}`);
  });

  return io;
}

export function emitNewMessage(conversation, message) {
  if (!io) return;
  io.to(`user:${conversation.buyerId}`)
    .to(`user:${conversation.sellerId}`)
    .emit("new_message", {
      conversationId: conversation.id,
      message,
    });
}
