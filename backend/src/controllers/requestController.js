import prisma from "../config/prisma.js";
import { clamp, toInt } from "../utils/params.js";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  buildPagination,
} from "../utils/listingShape.js";

const USER_SELECT = { id: true, name: true, avatarUrl: true };

const REQUEST_SELECT = {
  id: true,
  status: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  buyerId: true,
  sellerId: true,
  listing: {
    select: {
      id: true,
      title: true,
      price: true,
      status: true,
      category: true,
      images: {
        select: { id: true, url: true, altText: true, position: true },
        orderBy: { position: "asc" },
        take: 1,
      },
    },
  },
  buyer: { select: USER_SELECT },
  seller: { select: USER_SELECT },
};

// The five-state lifecycle from docs/06_Phase0_Decisions.md D1/D2:
// a target status maps to the role allowed to make that transition.
const TRANSITIONS = {
  PENDING: {
    ACCEPTED: "seller",
    REJECTED: "seller",
    CANCELLED: "buyer",
  },
  ACCEPTED: {
    COMPLETED: "any",
  },
};

const STATUS_MESSAGES = {
  ACCEPTED: "Request accepted",
  REJECTED: "Request rejected",
  CANCELLED: "Request cancelled",
  COMPLETED: "Request completed",
};

// Prisma returns Decimal for money; the API contract uses a plain number.
function serialize(request) {
  if (request.listing?.price !== undefined) {
    return {
      ...request,
      listing: { ...request.listing, price: Number(request.listing.price) },
    };
  }
  return request;
}

export async function createRequest(req, res, next) {
  try {
    const listingId = toInt(req.body.listingId);
    if (listingId === undefined) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, status: true },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (listing.sellerId === req.user.id) {
      return res
        .status(403)
        .json({ error: "You cannot request your own listing" });
    }
    if (listing.status !== "ACTIVE") {
      return res.status(422).json({ error: "Listing is not active" });
    }

    const note = req.body.note?.trim() || null;

    const request = await prisma.request.create({
      data: { listingId, buyerId: req.user.id, sellerId: listing.sellerId, note },
      // Matches the POST response shape in docs/07_API_Design.md §10.
      select: {
        id: true,
        status: true,
        note: true,
        createdAt: true,
        listing: { select: { id: true, title: true } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({ message: "Request submitted", data: request });
  } catch (error) {
    next(error);
  }
}

export async function listRequests(req, res, next) {
  try {
    const page = toInt(req.query.page, DEFAULT_PAGE);
    const limit = clamp(toInt(req.query.limit, DEFAULT_LIMIT), 1, MAX_LIMIT);
    const { role, status } = req.query;

    // Requests are always scoped to the caller: they can only ever see
    // requests where they are the buyer or the seller.
    const where = {
      ...(role === "buyer"
        ? { buyerId: req.user.id }
        : role === "seller"
          ? { sellerId: req.user.id }
          : { OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }] }),
      ...(status && { status }),
    };

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        select: REQUEST_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.request.count({ where }),
    ]);

    return res.status(200).json({
      data: requests.map(serialize),
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRequestStatus(req, res, next) {
  try {
    const requestId = toInt(req.params.id);
    if (requestId === undefined) {
      return res.status(400).json({ error: "Invalid request id" });
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      select: { id: true, buyerId: true, sellerId: true, status: true },
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const isBuyer = request.buyerId === req.user.id;
    const isSeller = request.sellerId === req.user.id;
    if (!isBuyer && !isSeller) {
      return res
        .status(403)
        .json({ error: "You are not a participant in this request" });
    }

    const target = req.body.status;
    const allowedRole = TRANSITIONS[request.status]?.[target];
    if (!allowedRole) {
      return res
        .status(422)
        .json({ error: "Invalid status transition" });
    }
    if (allowedRole !== "any" && allowedRole !== (isBuyer ? "buyer" : "seller")) {
      return res
        .status(403)
        .json({ error: "You are not authorized for this transition" });
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: { status: target },
      select: { id: true, status: true, updatedAt: true },
    });

    return res.status(200).json({
      message: STATUS_MESSAGES[target],
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
