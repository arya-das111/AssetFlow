const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    where: { bookable: true }
  });

  console.log('Bookable resources in database:');
  assets.forEach(a => {
    console.log(`ID: ${a.id}, Tag: ${a.assetCode}, Name: ${a.name}`);
  });

  const bookings = await prisma.booking.findMany({
    include: {
      resource: true,
      bookedBy: { select: { name: true } }
    }
  });

  console.log('\nAll Bookings in database:');
  bookings.forEach(b => {
    console.log(`ID: ${b.id}, Resource: ${b.resource.name} (ID: ${b.resourceId}), User: ${b.bookedBy.name}, Start: ${b.startTime.toISOString()}, End: ${b.endTime.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
