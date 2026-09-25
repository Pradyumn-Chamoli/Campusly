import jwt from "jsonwebtoken";
import config from "../config/index.js";
import prisma from "../config/prisma.js";

async function resolveUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return false;

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) return false;

    req.user = user;
    return true;
  } catch {
    return false;
  }
}

export default async function authenticate(req, res, next) {
  const resolved = await resolveUser(req);

  if (!resolved) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  next();
}

// Attaches `req.user` when a valid token is present, but never fails the
// request. Used where guests may view extra detail (e.g. admins seeing
// removed listings).
export async function optionalAuthenticate(req, res, next) {
  await resolveUser(req);
  next();
}
