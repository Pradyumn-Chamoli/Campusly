import prisma from "../config/prisma.js";
import { toInt } from "../utils/params.js";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
};

// Public profiles never expose email or role.
const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  _count: {
    select: {
      listings: { where: { status: "ACTIVE" } },
    },
  },
};

export async function getPublicProfile(req, res, next) {
  try {
    const userId = toInt(req.params.id);
    if (userId === undefined) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_PROFILE_SELECT,
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { _count, ...profile } = user;

    return res.status(200).json({
      data: {
        ...profile,
        activeListings: _count.listings,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Always updates the authenticated user, so a user can never edit
// another user's profile by changing the request payload.
export async function updateMyProfile(req, res, next) {
  try {
    const { name, bio, avatarUrl } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (bio !== undefined) data.bio = bio === "" ? null : bio;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl === "" ? null : avatarUrl;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No profile fields provided" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: USER_SELECT,
    });

    return res.status(200).json({
      message: "Profile updated",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}
