// Shared shape for listing responses. The marketplace list, listing detail,
// "my listings" and favorites all return the same listing payload so the
// frontend can render any of them with one card component.

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const LISTING_SELECT = {
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

export const LISTING_DETAIL_SELECT = {
  ...LISTING_SELECT,
  description: true,
  sellerId: true,
  updatedAt: true,
};

// Prisma returns Decimal for money; the API contract uses a plain number.
export function serializeListing(listing) {
  return {
    ...listing,
    price: Number(listing.price),
  };
}

export function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
