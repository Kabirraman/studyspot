import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Every spot below has a unique `name` within its building, so we
// upsert on (buildingId, name) rather than blindly `create`-ing —
// running `npm run db:seed` more than once is then a no-op instead of
// producing duplicate rows.
async function upsertSpot(data: {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  hasOutlets?: boolean;
  capacity?: number;
  buildingId: string;
}) {
  const existing = await prisma.spot.findFirst({
    where: { name: data.name, buildingId: data.buildingId },
  });
  if (existing) {
    return prisma.spot.update({ where: { id: existing.id }, data });
  }
  return prisma.spot.create({ data });
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "seed@example.edu" },
    update: {},
    create: { email: "seed@example.edu", name: "Seed User" },
  });

  const csBuilding = await prisma.building.upsert({
    where: { name: "CS Building" },
    update: {},
    create: { name: "CS Building", latitude: 18.5679, longitude: 73.7143 },
  });

  const library = await prisma.building.upsert({
    where: { name: "Central Library" },
    update: {},
    create: { name: "Central Library", latitude: 18.5685, longitude: 73.7151 },
  });

  const spot1 = await upsertSpot({
    name: "3rd Floor Reading Room",
    description: "Quiet corner with window seating",
    latitude: 18.568,
    longitude: 73.7144,
    hasOutlets: true,
    capacity: 40,
    buildingId: csBuilding.id,
  });

  const spot2 = await upsertSpot({
    name: "Ground Floor Lounge",
    description: "Open seating near the cafe, tends to get loud",
    latitude: 18.5678,
    longitude: 73.7141,
    hasOutlets: true,
    capacity: 25,
    buildingId: csBuilding.id,
  });

  const spot3 = await upsertSpot({
    name: "Library Silent Zone",
    description: "No talking allowed, strict silence",
    latitude: 18.5686,
    longitude: 73.7152,
    hasOutlets: false,
    capacity: 60,
    buildingId: library.id,
  });

  // Ratings ARE allowed to accumulate on re-seed (that mirrors real usage —
  // more reviews over time) so these stay plain `create` calls. If you
  // want a clean slate, wipe with a DB reset rather than editing this file.
  const existingRatingCount = await prisma.rating.count({ where: { userId: user.id } });
  if (existingRatingCount === 0) {
    await prisma.rating.createMany({
      data: [
        {
          spotId: spot1.id,
          userId: user.id,
          noise: "QUIET",
          wifi: "GOOD",
          busyness: "EMPTY",
          hasOutlets: true,
          comment: "Almost always empty after 6pm, great for focused work.",
          timeOfDay: "evening",
        },
        {
          spotId: spot1.id,
          userId: user.id,
          noise: "MODERATE",
          wifi: "GOOD",
          busyness: "MODERATE",
          comment: "Gets a bit busy around midday with group projects.",
          timeOfDay: "afternoon",
        },
        {
          spotId: spot2.id,
          userId: user.id,
          noise: "LOUD",
          wifi: "OKAY",
          busyness: "PACKED",
          comment: "Very loud, more of a hangout spot than study spot.",
          timeOfDay: "afternoon",
        },
        {
          spotId: spot3.id,
          userId: user.id,
          noise: "SILENT",
          wifi: "EXCELLENT",
          busyness: "LIGHT",
          hasOutlets: false,
          comment: "Dead silent, no outlets though so bring a charged laptop.",
          timeOfDay: "evening",
        },
      ],
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
