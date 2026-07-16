import "dotenv/config";
import { ensureCantinaDatabase } from "../src/infrastructure/persistence/prisma/bootstrap";
import { prisma } from "../src/infrastructure/persistence/prisma/client";

ensureCantinaDatabase()
  .then(() => console.log("Cantina seed complete."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
