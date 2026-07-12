const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:2006@localhost:3306/mysql"
    }
  }
});

async function main() {
  console.log("Dropping and recreating assetflow database...");
  await prisma.$executeRawUnsafe("DROP DATABASE IF EXISTS assetflow;");
  await prisma.$executeRawUnsafe("CREATE DATABASE assetflow;");
  console.log("Database recreated successfully!");
}

main()
  .catch(err => {
    console.error("Recreation failed:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
