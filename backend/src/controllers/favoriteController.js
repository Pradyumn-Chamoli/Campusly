import prisma from "../config/prisma.js";
import { clamp, toInt } from "../utils/params.js";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  LISTING_SELECT,
  MAX_LIMIT,
  buildPagination,
  serializeListing,
} from "../utils/listingShape.js";

const FAVORITE_SELECT = {
  id: true,
  createdAt: true,
  listing: { select: LISTING_SELECT },
};

export async function addFavorite(req, res, next) {
  try {
    const listingId = toInt(req.body.listingId);
    if (listingId === undefined) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    try {
      await prisma.favorite.create({
        data: { userId: req.user.id, listingId },
      });
    } catch (error) {
      // Unique constraint (userId, listingId) — the listing is already saved.
      if (error.code === "P2002") {
        return res.status(409).json({ error: "Listing is already saved" });
      }
      throw error;
    }

    return res.status(201).json({ message: "Listing saved" });
  } catch (error) {
    next(error);
  }
}

export async function removeFavorite(req, res, next) {
  try {
    const listingId = toInt(req.params.listingId);
    if (listingId === undefined) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    // Always scoped to the authenticated user, so one user can never remove
    // another user's favorite by changing the URL.
    const { count } = await prisma.favorite.deleteMany({
      where: { userId: req.user.id, listingId },
    });

    if (count === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function getFavorites(req, res, next) {
  try {
    const page = toInt(req.query.page, DEFAULT_PAGE);
    const limit = clamp(toInt(req.query.limit, DEFAULT_LIMIT), 1, MAX_LIMIT);
    const where = { userId: req.user.id };

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        select: FAVORITE_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.favorite.count({ where }),
    ]);

    return res.status(200).json({
      data: favorites.map((favorite) => ({
        ...favorite,
        listing: serializeListing(favorite.listing),
      })),
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}
