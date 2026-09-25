import prisma from "../config/prisma.js";
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
