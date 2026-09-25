import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import prisma from "../config/prisma.js";

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "7d";

function signToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: JWT_EXPIRES_IN });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: "STUDENT",
      },
    });

    return res.status(201).json({
      message: "Account created",
      data: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user.id);

    return res.status(200).json({
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
}

// Campusly uses stateless JWT authentication, so there is no server-side
// session record to destroy. Invalidation happens on the client: the stored
// token is discarded, and the token is no longer sent with any request.
export async function logout(req, res) {
  return res.status(200).json({ message: "Logged out" });
}

export async function me(req, res) {
  return res.status(200).json({ data: sanitizeUser(req.user) });
}
