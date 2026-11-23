import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "HØmy Admin";

  if (!email || !password || password.length < 12) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters)"
    );
  }

  const existing = await db.user.findUnique({
    where: { email }
  });

  if (existing) {
    if (existing.role !== Role.ADMIN) {
      throw new Error(
        "That email already belongs to a non-admin account"
      );
    }

    console.log("Admin already exists.");
  } else {
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

  const image = "https://images.unsplash.com/photo-1547592180-85f173990554?w=900";
  for (const [name, description, type, rupees, rawIngredients] of dishes) {
    const existingDish = await db.product.findFirst({ where: { name } });
    const data = { name, description, category: "South Indian", type, pricePaise: rupees * 100, imageUrl: image, servings: 2, prepMinutes: 25, isAvailable: false };
    const product = existingDish ? await db.product.update({ where: { id: existingDish.id }, data }) : await db.product.create({ data });
    if (!existingDish) await db.ingredient.createMany({ data: rawIngredients.map((entry, index) => { const [ingredientName, quantity] = entry.split("|"); return { productId: product.id, name: ingredientName, quantity, sortOrder: index }; }) });
  }
  console.log(`Seeded ${dishes.length} South Indian dishes as unpublished catalogue items.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
