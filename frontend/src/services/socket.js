import { io } from "socket.io-client";

// One socket per session, created lazily. The token is read fresh on every
// (re)connection attempt, so logging in mid-session is picked up without a
// reconnect dance. Without a token no socket is created at all.
let socket = null;

export function ensureSocket() {
  if (socket) return socket;
  if (!localStorage.getItem("token")) return null;

  socket = io({
    auth: (callback) => callback({ token: localStorage.getItem("token") }),
  });

  return socket;
}

export function teardownSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
