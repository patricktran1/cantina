import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    // Generation does not need a live database. Deploy/migrate commands still
    // receive the real DATABASE_URL from Vercel or the local shell.
    url: process.env.DATABASE_URL ?? "postgresql://cantina:placeholder@localhost:5432/cantina"
  }
});
