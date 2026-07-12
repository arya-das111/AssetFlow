const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    include: { resource: true }
  });

  console.log('TZ offset in minutes:', new Date().getTimezoneOffset());

  bookings.forEach(b => {
    const localStart = new Date(b.startTime);
    console.log(`ID: ${b.id}, Resource: ${b.resource.name}, ISO: ${b.startTime.toISOString()}, LocalString: ${localStart.toString()}, LocalToDateString: ${localStart.toDateString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
