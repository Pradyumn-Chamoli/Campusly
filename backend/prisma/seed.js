// Development seed data for Campusly.
// Idempotent: safe to re-run. Users are upserted by email; demo content is
// created only when no listings exist yet.
//
// The initial admin account is created from environment variables
// (see .env.example): ADMIN_EMAIL and ADMIN_PASSWORD.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@campus.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin1234';

const DEMO_USERS = [
  {
    email: 'alex@campus.local',
    password: 'password123',
    name: 'Alex Rivera',
    bio: 'Final-year CS student. Selling textbooks and gear.',
  },
  {
    email: 'jamie@campus.local',
    password: 'password123',
    name: 'Jamie Chen',
    bio: 'Sophomore. Always downsizing dorm furniture.',
  },
];

function hash(password) {
  return bcrypt.hash(password, 10);
}

async function upsertUser(email, data) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role ?? 'STUDENT',
      bio: data.bio ?? null,
    },
  });
}

async function main() {
  if (
    process.env.ADMIN_EMAIL === undefined ||
    process.env.ADMIN_PASSWORD === undefined
  ) {
    console.warn(
      'WARNING: ADMIN_EMAIL / ADMIN_PASSWORD are not set in .env. ' +
        `Using default dev admin at ${ADMIN_EMAIL}.`,
    );
  }

  // --- Admin account ---------------------------------------------------------
  const admin = await upsertUser(ADMIN_EMAIL, {
    passwordHash: await hash(ADMIN_PASSWORD),
    name: 'Marketplace Admin',
    role: 'ADMIN',
  });
  console.log(`Seeded admin: ${admin.email}`);

  // --- Demo student accounts -------------------------------------------------
  const demoUsers = [];
  for (const user of DEMO_USERS) {
    const created = await upsertUser(user.email, {
      passwordHash: await hash(user.password),
      name: user.name,
      bio: user.bio,
    });
    demoUsers.push(created);
    console.log(`Seeded student: ${created.email}`);
  }

  // --- Demo content (only on first run) --------------------------------------
  const existingListings = await prisma.listing.count();
  if (existingListings > 0) {
    console.log('Listings already present — skipping demo content.');
    return;
  }

  const [alex, jamie] = demoUsers;

  const alexListings = [
    {
      title: 'Operating Systems Concepts',
      description:
        'Used IT silberschatz textbook, 10th edition. Light highlighting in chapters 1-4. Great condition.',
      price: '25.00',
      category: 'BOOKS',
      condition: 'GOOD',
    },
    {
      title: 'HP Bluetooth Mouse',
      description:
        'Wireless mouse, works perfectly. Includes USB receiver. Bought for a project course, now unused.',
      price: '12.50',
      category: 'ELECTRONICS',
      condition: 'LIKE_NEW',
    },
    {
      title: 'Desk Lamp with USB Charging',
      description:
        'LED desk lamp, dimmable. USB port on the base for charging your phone.',
      price: '15.00',
      category: 'ELECTRONICS',
      condition: 'GOOD',
    },
  ];

  const jamieListings = [
    {
      title: 'IKEA Mattress (Full Size)',
      description:
        'Two years old, very clean, non-smoking room. Pickup only — must move it yourself.',
      price: '60.00',
      category: 'FURNITURE',
      condition: 'GOOD',
    },
    {
      title: 'Winter Down Jacket (M)',
      description:
        'Staying warm on your walks to class. Clean and in great shape, light teal color.',
      price: '35.00',
      category: 'CLOTHING',
      condition: 'LIKE_NEW',
    },
    {
      title: 'Calculus Early Transcendentals',
      description:
        'Same edition used in the first-year calculus sequence. Minimal wear, no writing inside.',
      price: '20.00',
      category: 'BOOKS',
      condition: 'GOOD',
      status: 'SOLD', // demo of the Sold lifecycle state
    },
  ];

  const alexListingRows = [];
  for (const l of alexListings) {
    const created = await prisma.listing.create({
      data: { ...l, sellerId: alex.id, price: l.price },
    });
    alexListingRows.push(created);
  }

  const jamieListingRows = [];
  for (const l of jamieListings) {
    const created = await prisma.listing.create({
      data: {
        title: l.title,
        description: l.description,
        price: l.price,
        category: l.category,
        condition: l.condition,
        status: l.status ?? 'ACTIVE',
        sellerId: jamie.id,
      },
    });
    jamieListingRows.push(created);
  }
  console.log(`Seeded ${alexListingRows.length + jamieListingRows.length} listings`);

  // --- Favorites -------------------------------------------------------------
  await prisma.favorite.createMany({
    data: [
      { userId: alex.id, listingId: jamieListingRows[2].id }, // alex favorites the sold jacket
      { userId: jamie.id, listingId: alexListingRows[0].id }, // jamie favorites the textbook
    ],
  });
  console.log('Seeded 2 favorites');

  // --- Request (pending) -----------------------------------------------------
  await prisma.request.create({
    data: {
      listingId: alexListingRows[0].id,
      buyerId: jamie.id,
      sellerId: alex.id,
      note: 'Is this still available? I can pick it up tomorrow.',
    },
  });
  console.log('Seeded 1 pending request');

  // --- Report (pending) ------------------------------------------------------
  await prisma.report.create({
    data: {
      listingId: jamieListingRows[2].id,
      reporterId: alex.id,
      reason: 'MISLEADING',
      description: 'Listing photo does not match the jacket being sold.',
    },
  });
  console.log('Seeded 1 pending report');

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());