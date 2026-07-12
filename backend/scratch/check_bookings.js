const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    where: { resourceId: 1, status: 'confirmed' },
    include: {
      bookedBy: { select: { name: true } }
    }
  });

  console.log('Bookings in database:');
  bookings.forEach(b => {
    console.log(`ID: ${b.id}, User: ${b.bookedBy.name}, Start: ${b.startTime.toISOString()}, End: ${b.endTime.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
