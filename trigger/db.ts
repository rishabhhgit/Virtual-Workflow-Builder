import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required in Trigger task");
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({ adapter });
  return prismaInstance;
}
