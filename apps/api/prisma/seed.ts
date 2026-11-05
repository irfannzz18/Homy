import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "HØmy Admin";

  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters)");
  }

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== Role.ADMIN) {
      throw new Error("That email already belongs to a non-admin account");
    }
    console.log("Admin already exists.");
    return;
  }

  await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: Role.ADMIN
    }
  });

  console.log("HØmy admin account created.");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
