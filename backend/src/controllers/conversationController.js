import prisma from "../config/prisma.js";
import { clamp, toInt } from "../utils/params.js";
import {
  DEFAULT_PAGE,
  MAX_LIMIT,
  buildPagination,
} from "../utils/listingShape.js";
import { emitNewMessage } from "../socket.js";

const DEFAULT_MESSAGE_LIMIT = 50;
const DEFAULT_CONVERSATION_LIMIT = 20;

const PARTICIPANT_SELECT = { id: true, name: true, avatarUrl: true };

const CONVERSATION_LIST_SELECT = {
  id: true,
  buyerId: true,
  sellerId: true,
  createdAt: true,
  updatedAt: true,
  listing: { select: { id: true, title: true, status: true } },
  buyer: { select: PARTICIPANT_SELECT },
  seller: { select: PARTICIPANT_SELECT },
  messages: {
    select: { body: true, senderId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
};

const CONVERSATION_DETAIL_SELECT = {
  id: true,
  buyerId: true,
  sellerId: true,
  createdAt: true,
  updatedAt: true,
  listing: { select: { id: true, title: true, price: true, status: true } },
  buyer: { select: PARTICIPANT_SELECT },
  seller: { select: PARTICIPANT_SELECT },
};

const MESSAGE_SELECT = {
  id: true,
  body: true,
  senderId: true,
  conversationId: true,
  createdAt: true,
};

// Prisma returns Decimal for money; the API contract uses a plain number.
function serialize(conversation) {
  if (conversation.listing?.price !== undefined) {
    return {
      ...conversation,
      listing: { ...conversation.listing, price: Number(conversation.listing.price) },
    };
  }
  return conversation;
}

function isParticipant(conversation, userId) {
  return conversation.buyerId === userId || conversation.sellerId === userId;
}

// Every read/write below is scoped to the caller: 404 when it does not
// exist, 403 when it exists but the caller is not part of it.
async function loadConversation(conversationId, user) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: CONVERSATION_DETAIL_SELECT,
  });

  if (!conversation) {
    return { error: { status: 404, error: "Conversation not found" } };
  }
  if (!isParticipant(conversation, user.id)) {
    return {
      error: { status: 403, error: "You are not a participant in this conversation" },
    };
  }
  return { conversation };
}

// Start a conversation about a listing, or return the existing one — the
// (listingId, buyerId) unique constraint makes duplicates impossible.
export async function startConversation(req, res, next) {
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
    if (listing.status !== "ACTIVE") {
      return res
        .status(422)
        .json({ error: "You can only message about active listings" });
    }
    if (listing.sellerId === req.user.id) {
      return res
        .status(403)
        .json({ error: "You cannot start a conversation on your own listing" });
    }

    const existing = await prisma.conversation.findUnique({
      where: { listingId_buyerId: { listingId, buyerId: req.user.id } },
      select: CONVERSATION_DETAIL_SELECT,
    });

    if (existing) {
      return res.status(200).json({ data: serialize(existing) });
    }

    const conversation = await prisma.conversation.create({
      data: {
        listingId,
        buyerId: req.user.id,
        sellerId: listing.sellerId,
      },
      select: CONVERSATION_DETAIL_SELECT,
    });

    return res.status(201).json({ data: serialize(conversation) });
  } catch (error) {
    next(error);
  }
}

export async function listConversations(req, res, next) {
  try {
    const page = toInt(req.query.page, DEFAULT_PAGE);
    const limit = clamp(toInt(req.query.limit, DEFAULT_CONVERSATION_LIMIT), 1, MAX_LIMIT);

    const where = {
      OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
    };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        select: CONVERSATION_LIST_SELECT,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    return res.status(200).json({
      data: conversations.map(({ messages, ...conversation }) => ({
        ...conversation,
        lastMessage: messages[0] ?? null,
      })),
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req, res, next) {
  try {
    const conversationId = toInt(req.params.id);
    if (conversationId === undefined) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    const { conversation, error } = await loadConversation(conversationId, req.user);
    if (error) return res.status(error.status).json({ error: error.error });

    return res.status(200).json({ data: serialize(conversation) });
  } catch (error) {
    next(error);
  }
}

export async function listMessages(req, res, next) {
  try {
    const conversationId = toInt(req.params.conversationId);
    if (conversationId === undefined) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    const { error } = await loadConversation(conversationId, req.user);
    if (error) return res.status(error.status).json({ error: error.error });

    const page = toInt(req.query.page, DEFAULT_PAGE);
    const limit = clamp(toInt(req.query.limit, DEFAULT_MESSAGE_LIMIT), 1, MAX_LIMIT);
    const where = { conversationId };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        select: MESSAGE_SELECT,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return res.status(200).json({
      data: messages,
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const conversationId = toInt(req.params.conversationId);
    if (conversationId === undefined) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    const { conversation, error } = await loadConversation(conversationId, req.user);
    if (error) return res.status(error.status).json({ error: error.error });

    const body = req.body.body.trim();

    // Writing the message and bumping `updatedAt` together keeps the
    // conversation list ordered by the most recent activity.
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId: req.user.id, body },
        select: MESSAGE_SELECT,
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    emitNewMessage(conversation, message);

    return res.status(201).json({ data: message });
  } catch (error) {
    next(error);
  }
}
