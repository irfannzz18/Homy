import {
  PrismaClient,
  ProductType,
  Role
} from "@prisma/client";

import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email =
    process.env.ADMIN_EMAIL ?? "admin@homy.local";

  const password =
    process.env.ADMIN_PASSWORD ??
    "ChangeMe-Immediately-123!";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "HØmy Admin",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: Role.ADMIN
    }
  });

  const products = [
    {
      name: "Paneer Tikka Bowl Kit",
      description:
        "Smoky paneer, peppers and a bright mint chutney.",
      type: ProductType.VEG,
      pricePaise: 24900,
      imageUrl:
        "https://images.unsplash.com/photo-1631452180519-c014fe946bc7",
      servings: 2,
      prepMinutes: 25
    },
    {
      name: "Garden Pesto Pasta Kit",
      description:
        "Fresh basil pesto, cherry tomatoes and parmesan.",
      type: ProductType.VEG,
      pricePaise: 21900,
      imageUrl:
        "https://images.unsplash.com/photo-1473093295043-cdd812d0e601",
      servings: 2,
      prepMinutes: 20
    },
    {
      name: "Chicken Tikka Wrap Kit",
      description:
        "Spiced chicken, crisp salad and cooling yogurt sauce.",
      type: ProductType.NON_VEG,
      pricePaise: 28900,
      imageUrl:
        "https://images.unsplash.com/photo-160",
      servings: 2,
      prepMinutes: 30
    },
    {
      name: "Coastal Fish Curry Kit",
      description:
        "Aromatic coconut curry with a coastal spice blend.",
      type: ProductType.NON_VEG,
      pricePaise: 32900,
      imageUrl:
        "https://images.unsplash.com/photo-156",
      servings: 2,
      prepMinutes: 35
    }
  ];

  for (const product of products) {
    const exists = await prisma.product.findFirst({
      where: { name: product.name }
    });

    if (!exists) {
      await prisma.product.create({
        data: product
      });
    }
  }
}

main().finally(() => prisma.$disconnect());
