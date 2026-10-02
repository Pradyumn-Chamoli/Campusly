import prisma from "../config/prisma.js";
import { clamp, toInt } from "../utils/params.js";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  buildPagination,
  serializeListing,
} from "../utils/listingShape.js";

const USER_SELECT = { id: true, name: true };

const REPORT_SELECT = {
  id: true,
  reason: true,
  description: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      status: true,
      price: true,
      images: {
        select: { id: true, url: true, altText: true, position: true },
        orderBy: { position: "asc" },
        take: 1,
      },
    },
  },
  reporter: { select: USER_SELECT },
  resolvedBy: { select: USER_SELECT },
};

// Prisma returns Decimal for money; the API contract uses a plain number.
function serialize(report) {
  return {
    ...report,
    listing: { ...report.listing, price: Number(report.listing.price) },
  };
}

export async function createReport(req, res, next) {
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

    const existing = await prisma.report.findFirst({
      where: { listingId, reporterId: req.user.id },
      select: { id: true },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "You have already reported this listing" });
    }

    const report = await prisma.report.create({
      data: {
        listingId,
        reporterId: req.user.id,
        reason: req.body.reason,
        description: req.body.description?.trim() || null,
      },
      select: {
        id: true,
        listingId: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ message: "Report submitted", data: report });
  } catch (error) {
    next(error);
  }
}

export async function listReports(req, res, next) {
  try {
    const page = toInt(req.query.page, DEFAULT_PAGE);
    const limit = clamp(toInt(req.query.limit, DEFAULT_LIMIT), 1, MAX_LIMIT);
    const { status } = req.query;

    const where = { ...(status && { status }) };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        select: REPORT_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return res.status(200).json({
      data: reports.map(serialize),
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
}

export async function resolveReport(req, res, next) {
  try {
    const reportId = toInt(req.params.id);
    if (reportId === undefined) {
      return res.status(400).json({ error: "Invalid report id" });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, listingId: true },
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (report.status !== "PENDING") {
      return res.status(422).json({ error: "Report has already been resolved" });
    }

    const action = req.body.action;
    const status = action === "REMOVE" ? "REMOVED" : "DISMISSED";

    // The report is always resolved; the listing is only hidden when the
    // admin chose REMOVE. The `status: "PENDING"` guard makes resolution
    // atomic: if another admin resolves the same report first, `count` is 0
    // and nothing is written.
    const updated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.report.updateMany({
        where: { id: report.id, status: "PENDING" },
        data: {
          status,
          resolvedById: req.user.id,
          resolvedAt: new Date(),
        },
      });

      if (count === 0) return null;

      if (action === "REMOVE") {
        await tx.listing.update({
          where: { id: report.listingId },
          data: { status: "REMOVED" },
        });
      }

      return tx.report.findUnique({
        where: { id: report.id },
        select: {
          id: true,
          status: true,
          resolvedById: true,
          resolvedAt: true,
        },
      });
    });

    if (!updated) {
      return res.status(422).json({ error: "Report has already been resolved" });
    }

    return res.status(200).json({ message: "Report resolved", data: updated });
  } catch (error) {
    next(error);
  }
}
