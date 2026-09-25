import prisma from "../config/prisma.js";
import { removeImage } from "../config/storage.js";
import { clamp, toFloat, toInt } from "../utils/params.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const LISTING_SELECT = {
  id: true,
  title: true,
  price: true,
  category: true,
  condition: true,
  status: true,
  createdAt: true,
  seller: {
    select: { id: true, name: true, avatarUrl: true },
  },
  images: {
    select: { id: true, url: true, altText: true, position: true },
    orderBy: { position: "asc" },
  },
  _count: {
    select: { favorites: true },
  },
};

// Prisma returns Decimal for money; the API contract uses a plain number.
function serializeListing(listing) {
  return {
    ...listing,
    price: Number(listing.price),
  };
}

function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getListings(req, res, next) {
  try {
    const page = toInt(req.query.page, DEFAULT_PAGE);
    const limit = clamp(toInt(req.query.limit, DEFAULT_LIMIT), 1, MAX_LIMIT);
    const { search, category, condition } = req.query;
    const sellerId = toInt(req.query.sellerId);
    const minPrice = toFloat(req.query.minPrice);
    const maxPrice = toFloat(req.query.maxPrice);

    const where = {
      status: "ACTIVE",
      ...(category && { category }),
      ...(condition && { condition }),
      ...(sellerId !== undefined && { sellerId }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined && { gte: minPrice }),
              ...(maxPrice !== undefined && { lte: maxPrice }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        select: LISTING_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    return res.status(200).json({
      data: listings.map(serializeListing),
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyListings(req, res, next) {
  try {
    const page = toInt(req.query.page, DEFAULT_PAGE);
    const limit = clamp(toInt(req.query.limit, DEFAULT_LIMIT), 1, MAX_LIMIT);
    const { status } = req.query;

    const where = {
      sellerId: req.user.id,
      ...(status && { status }),
    };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        select: LISTING_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    return res.status(200).json({
      data: listings.map(serializeListing),
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

const LISTING_DETAIL_SELECT = {
  ...LISTING_SELECT,
  description: true,
  sellerId: true,
  updatedAt: true,
};

export async function getListing(req, res, next) {
  try {
    const listingId = toInt(req.params.id);
    if (listingId === undefined) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: LISTING_DETAIL_SELECT,
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Admin-only listings stay hidden from everyone else.
    if (listing.status === "REMOVED" && req.user?.role !== "ADMIN") {
      return res.status(404).json({ error: "Listing not found" });
    }

    return res.status(200).json({ data: serializeListing(listing) });
  } catch (error) {
    next(error);
  }
}

export async function createListing(req, res, next) {
  try {
    const { title, description, price, category, condition } = req.body;

    const listing = await prisma.listing.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price: String(price),
        category,
        condition,
        status: "ACTIVE",
        sellerId: req.user.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        condition: true,
        status: true,
        sellerId: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "Listing created",
      data: serializeListing(listing),
    });
  } catch (error) {
    next(error);
  }
}

// Returns an error descriptor when the caller may not touch the listing.
function ownershipError(listing, req) {
  if (!listing) return { status: 404, error: "Listing not found" };
  if (listing.sellerId !== req.user.id) {
    return { status: 403, error: "You can only manage your own listings" };
  }
  return null;
}

export async function updateListing(req, res, next) {
  try {
    const listingId = toInt(req.params.id);
    if (listingId === undefined) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, status: true },
    });

    const denied = ownershipError(listing, req);
    if (denied) return res.status(denied.status).json({ error: denied.error });

    const { title, description, price, category, condition, status } = req.body;

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (price !== undefined) data.price = String(price);
    if (category !== undefined) data.category = category;
    if (condition !== undefined) data.condition = condition;

    if (status !== undefined) {
      // Sellers may mark their own listing sold (or relist it). REMOVED is
      // reserved for admin moderation, so it is rejected with 422.
      if (status !== "SOLD" && status !== "ACTIVE") {
        return res.status(422).json({
          error: "Sellers can only set a listing to Active or Sold",
        });
      }
      data.status = status;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const updated = await prisma.listing.update({
      where: { id: listing.id },
      data,
      select: LISTING_DETAIL_SELECT,
    });

    return res.status(200).json({
      message: "Listing updated",
      data: serializeListing(updated),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteListing(req, res, next) {
  try {
    const listingId = toInt(req.params.id);
    if (listingId === undefined) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, images: { select: { cloudinaryPublicId: true } } },
    });

    const denied = ownershipError(listing, req);
    if (denied) return res.status(denied.status).json({ error: denied.error });

    // Images are removed from storage before the rows are dropped, so a
    // storage failure does not leave us with unreachable rows.
    for (const image of listing.images) {
      await removeImage(image.cloudinaryPublicId);
    }

    await prisma.listing.delete({ where: { id: listing.id } });

    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}
