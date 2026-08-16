import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  const spot1 = await prisma.spot.create({
    data: {
      name: "3rd Floor Reading Room",
      description: "Quiet corner with window seating",
      latitude: 18.5680,
      longitude: 73.7144,
      hasOutlets: true,
      capacity: 40,
      buildingId: csBuilding.id,
    },
  });

  const spot2 = await prisma.spot.create({
    data: {
      name: "Ground Floor Lounge",
      description: "Open seating near the cafe, tends to get loud",
      latitude: 18.5678,
      longitude: 73.7141,
      hasOutlets: true,
      capacity: 25,
      buildingId: csBuilding.id,
    },
  });

  const spot3 = await prisma.spot.create({
    data: {
      name: "Library Silent Zone",
      description: "No talking allowed, strict silence",
      latitude: 18.5686,
      longitude: 73.7152,
      hasOutlets: false,
      capacity: 60,
      buildingId: library.id,
    },
  });

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
