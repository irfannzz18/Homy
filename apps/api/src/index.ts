import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PrismaClient, Role, OrderStatus, PartnerStatus } from "@prisma/client";
import { z } from "zod";

const app = express();
const db = new PrismaClient();

const PORT = Number(process.env.PORT || 4000);
const SECRET = process.env.JWT_SECRET || "";

if (SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters");
}

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : true
}));
app.use(express.json({ limit: "2mb" }));

type RequestWithUser = express.Request & {
  user?: { id: string; role: Role; email: string };
};

const issueToken = (user: any) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    SECRET,
    { expiresIn: "7d" }
  );

function authenticate(
  req: RequestWithUser,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Please sign in" });
    }
    req.user = jwt.verify(header.slice(7), SECRET) as RequestWithUser["user"];
    next();
  } catch {
    return res.status(401).json({ error: "Session expired" });
  }
}

function roles(...allowed: Role[]) {
  return (
    req: RequestWithUser,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

const admin = [authenticate, roles(Role.ADMIN)];
const partner = [authenticate, roles(Role.PARTNER)];

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "HØmy API" });
});

/* AUTHENTICATION */

app.post("/api/auth/register", async (req, res) => {
  try {
    const data = z.object({
      name: z.string().min(2).max(80),
      email: z.string().email().transform(v => v.toLowerCase()),
      phone: z.string().optional(),
      password: z.string().min(8).max(100)
    }).parse(req.body);

    const existing = await db.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: await bcrypt.hash(data.password, 12),
        role: Role.CUSTOMER
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    });

    res.status(201).json({ token: issueToken(user), user });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Registration failed"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const data = z.object({
      email: z.string().email().transform(v => v.toLowerCase()),
      password: z.string().min(1)
    }).parse(req.body);

    const user = await db.user.findUnique({
      where: { email: data.email }
    });

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      token: issueToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Login failed"
    });
  }
});

app.get("/api/auth/me", authenticate, async (req: RequestWithUser, res) => {
  const user = await db.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, phone: true, role: true }
  });

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

/* CUSTOMER PRODUCT CATALOGUE */

app.get("/api/products", async (req, res) => {
  const type = req.query.type;

  const products = await db.product.findMany({
    where: {
      isAvailable: true,
      ...(type === "VEG" || type === "NON_VEG" ? { type } : {})
    },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { sortOrder: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ products });
});

app.get("/api/products/:id", async (req, res) => {
  const product = await db.product.findFirst({
    where: { id: req.params.id, isAvailable: true },
    include: { ingredients: true, images: true }
  });

  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({ product });
});

/* ADMIN PRODUCTS */

app.get("/api/admin/products", ...admin, async (_req, res) => {
  const products = await db.product.findMany({
    include: { ingredients: true, images: true },
    orderBy: { createdAt: "desc" }
  });

  res.json({ products });
});

const productSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).default(""),
  category: z.string().min(2).max(80).default("South Indian"),
  type: z.enum(["VEG", "NON_VEG"]),
  pricePaise: z.number().int().positive(),
  imageUrl: z.string().url(),
  servings: z.number().int().min(1).max(30).default(2),
  prepMinutes: z.number().int().min(1).max(240).default(25),
  isAvailable: z.boolean().default(true),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    quantity: z.string().min(1),
    imageUrl: z.string().optional()
  })).default([]),
  images: z.array(z.string().url()).default([])
});

app.post("/api/admin/products", ...admin, async (req, res) => {
  try {
    const data = productSchema.parse(req.body);

    const product = await db.product.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        type: data.type,
        pricePaise: data.pricePaise,
        imageUrl: data.imageUrl,
        servings: data.servings,
        prepMinutes: data.prepMinutes,
        isAvailable: data.isAvailable,
        ingredients: {
          create: data.ingredients.map((item, index) => ({
            ...item,
            sortOrder: index
          }))
        },
        images: {
          create: data.images.map((imageUrl, index) => ({
            imageUrl,
            sortOrder: index
          }))
        }
      },
      include: { ingredients: true, images: true }
    });

    res.status(201).json({ product });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Product creation failed"
    });
  }
});

app.put("/api/admin/products/:id", ...admin, async (req, res) => {
  try {
    const data = productSchema.parse(req.body);
    const id = req.params.id;

    const product = await db.$transaction(async tx => {
      await tx.ingredient.deleteMany({ where: { productId: id } });
      await tx.productImage.deleteMany({ where: { productId: id } });

      return tx.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          type: data.type,
          pricePaise: data.pricePaise,
          imageUrl: data.imageUrl,
          servings: data.servings,
          prepMinutes: data.prepMinutes,
          isAvailable: data.isAvailable,
          ingredients: {
            create: data.ingredients.map((item, index) => ({
              ...item,
              sortOrder: index
            }))
          },
          images: {
            create: data.images.map((imageUrl, index) => ({
              imageUrl,
              sortOrder: index
            }))
          }
        },
        include: { ingredients: true, images: true }
      });
    });

    res.json({ product });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Update failed"
    });
  }
});

app.patch("/api/admin/products/:id/availability", ...admin, async (req, res) => {
  try {
    const { isAvailable } = z.object({
      isAvailable: z.boolean()
    }).parse(req.body);

    const product = await db.product.update({
      where: { id: req.params.id },
      data: { isAvailable }
    });

    res.json({ product });
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

/* CUSTOMER ORDERS */

app.post("/api/orders", authenticate, roles(Role.CUSTOMER), async (req: RequestWithUser, res) => {
  try {
    const data = z.object({
      address: z.string().min(8).max(500),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      note: z.string().max(500).optional(),
      paymentMethod: z.enum(["COD", "UPI"]).default("COD"),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(30)
      })).min(1)
    }).parse(req.body);

    if (data.paymentMethod === "UPI" && !process.env.UPI_ID) {
      return res.status(400).json({ error: "UPI is not configured" });
    }

    const ids = [...new Set(data.items.map(i => i.productId))];
    const products = await db.product.findMany({
      where: { id: { in: ids }, isAvailable: true }
    });

    if (products.length !== ids.length) {
      return res.status(400).json({ error: "A product is unavailable" });
    }

    const lookup = new Map(products.map(p => [p.id, p]));
    const subtotal = data.items.reduce(
      (sum, item) => sum + lookup.get(item.productId)!.pricePaise * item.quantity,
      0
    );

    const delivery = subtotal >= 49900 ? 0 : 3900;
    const order = await db.order.create({
      data: {
        orderNumber: "HOMY-" + crypto.randomBytes(4).toString("hex").toUpperCase(),
        userId: req.user!.id,
        subtotalPaise: subtotal,
        deliveryPaise: delivery,
        totalPaise: subtotal + delivery,
        paymentMethod: data.paymentMethod,
        paymentStatus: "PENDING",
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        customerNote: data.note,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            productName: lookup.get(item.productId)!.name,
            quantity: item.quantity,
            unitPricePaise: lookup.get(item.productId)!.pricePaise
          }))
        }
      },
      include: { items: true }
    });

    res.status(201).json({
      order,
      payment: data.paymentMethod === "UPI"
        ? { upiId: process.env.UPI_ID, status: "AWAITING_VERIFICATION" }
        : { status: "PAY_ON_DELIVERY" }
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Order failed"
    });
  }
});

app.get("/api/orders/mine", authenticate, async (req: RequestWithUser, res) => {
  const orders = await db.order.findMany({
    where: { userId: req.user!.id },
    include: {
      items: true,
      tracking: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ orders });
});

app.post("/api/orders/:id/cancel", authenticate, async (req: RequestWithUser, res) => {
  const order = await db.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });

  if (!order) return res.status(404).json({ error: "Order not found" });

  if (!["PLACED", "CONFIRMED"].includes(order.status)) {
    return res.status(400).json({ error: "Order cannot be cancelled now" });
  }

  const updated = await db.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED" }
  });

  res.json({ order: updated });
});

/* ADMIN DASHBOARD */

app.get("/api/admin/summary", ...admin, async (_req, res) => {
  const [orders, products, customers, revenue] = await Promise.all([
    db.order.count(),
    db.product.count({ where: { isAvailable: true } }),
    db.user.count({ where: { role: Role.CUSTOMER } }),
    db.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalPaise: true }
    })
  ]);

  res.json({
    orders,
    products,
    customers,
    revenuePaise: revenue._sum.totalPaise || 0
  });
});

app.get("/api/admin/orders", ...admin, async (_req, res) => {
  const orders = await db.order.findMany({
    include: {
      items: true,
      user: { select: { name: true, email: true, phone: true } },
      assignedPartner: {
        include: { user: { select: { name: true, phone: true } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ orders });
});

app.patch("/api/admin/orders/:id/status", ...admin, async (req, res) => {
  try {
    const { status } = z.object({
      status: z.nativeEnum(OrderStatus)
    }).parse(req.body);

    const order = await db.order.findUnique({
      where: { id: req.params.id }
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

    const transitions: Record<OrderStatus, OrderStatus[]> = {
      PLACED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
      OUT_FOR_DELIVERY: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: []
    };

    if (!transitions[order.status].includes(status)) {
      return res.status(400).json({ error: "Invalid status transition" });
    }

    const updated = await db.order.update({
      where: { id: order.id },
      data: { status }
    });

    res.json({ order: updated });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid status"
    });
  }
});

/* DELIVERY PARTNERS */

app.get("/api/admin/partners", ...admin, async (_req, res) => {
  const partners = await db.deliveryPartner.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ partners });
});

app.post("/api/admin/partners", ...admin, async (req, res) => {
  try {
    const data = z.object({
      name: z.string().min(2),
      email: z.string().email().transform(v => v.toLowerCase()),
      phone: z.string().min(8),
      password: z.string().min(8),
      vehicleType: z.string().optional(),
      vehicleNumber: z.string().optional()
    }).parse(req.body);

    const existing = await db.user.findUnique({
      where: { email: data.email }
    });

    if (existing) return res.status(409).json({ error: "Email already exists" });

    const created = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: await bcrypt.hash(data.password, 12),
        role: Role.PARTNER,
        partner: {
          create: {
            status: PartnerStatus.APPROVED,
            vehicleType: data.vehicleType,
            vehicleNumber: data.vehicleNumber
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        partner: true
      }
    });

    res.status(201).json({ partner: created });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Partner creation failed"
    });
  }
});

app.post("/api/admin/orders/:id/assign", ...admin, async (req, res) => {
  try {
    const { partnerId } = z.object({
      partnerId: z.string()
    }).parse(req.body);

    const deliveryPartner = await db.deliveryPartner.findFirst({
      where: { id: partnerId, status: PartnerStatus.APPROVED }
    });

    if (!deliveryPartner) {
      return res.status(404).json({ error: "Approved partner not found" });
    }

    const order = await db.order.update({
      where: { id: req.params.id },
      data: { assignedPartnerId: deliveryPartner.id }
    });

    res.json({ order });
  } catch {
    res.status(404).json({ error: "Order or partner not found" });
  }
});

/* PARTNER ORDERS AND GPS */

app.get("/api/partner/orders", ...partner, async (req: RequestWithUser, res) => {
  const p = await db.deliveryPartner.findUnique({
    where: { userId: req.user!.id }
  });

  if (!p || p.status !== "APPROVED") {
    return res.status(403).json({ error: "Partner account not approved" });
  }

  const orders = await db.order.findMany({
    where: { assignedPartnerId: p.id },
    include: {
      items: true,
      user: { select: { name: true, phone: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ orders });
});

app.post("/api/partner/location", ...partner, async (req: RequestWithUser, res) => {
  try {
    const data = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).parse(req.body);

    const p = await db.deliveryPartner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!p || p.status !== "APPROVED") {
      return res.status(403).json({ error: "Partner not approved" });
    }

    await db.deliveryPartner.update({
      where: { id: p.id },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        lastLocationAt: new Date()
      }
    });

    const active = await db.order.findMany({
      where: {
        assignedPartnerId: p.id,
        status: "OUT_FOR_DELIVERY"
      },
      select: { id: true }
    });

    if (active.length) {
      await db.orderTracking.createMany({
        data: active.map(o => ({
          orderId: o.id,
          partnerId: p.id,
          latitude: data.latitude,
          longitude: data.longitude
        }))
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Location update failed"
    });
  }
});

app.patch("/api/partner/orders/:id/status", ...partner, async (req: RequestWithUser, res) => {
  try {
    const { status } = z.object({
      status: z.enum(["OUT_FOR_DELIVERY", "DELIVERED"])
    }).parse(req.body);

    const p = await db.deliveryPartner.findUnique({
      where: { userId: req.user!.id }
    });

    if (!p) return res.status(403).json({ error: "Partner not found" });

    const order = await db.order.findFirst({
      where: { id: req.params.id, assignedPartnerId: p.id }
    });

    if (!order) return res.status(404).json({ error: "Order not assigned to you" });

    const valid =
      (status === "OUT_FOR_DELIVERY" && order.status === "PREPARING") ||
      (status === "DELIVERED" && order.status === "OUT_FOR_DELIVERY");

    if (!valid) return res.status(400).json({ error: "Invalid order transition" });

    const updated = await db.order.update({
      where: { id: order.id },
      data: { status }
    });

    res.json({ order: updated });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Status update failed"
    });
  }
});

app.get("/api/orders/:id/tracking", authenticate, async (req: RequestWithUser, res) => {
  const order = await db.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: {
      assignedPartner: {
        select: {
          latitude: true,
          longitude: true,
          lastLocationAt: true
        }
      }
    }
  });

  if (!order) return res.status(404).json({ error: "Order not found" });

  res.json({
    status: order.status,
    location: order.assignedPartner?.latitude != null
      ? {
          latitude: order.assignedPartner.latitude,
          longitude: order.assignedPartner.longitude,
          updatedAt: order.assignedPartner.lastLocationAt
        }
      : null
  });
});

/* ERROR HANDLER */

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`HØmy API listening on ${PORT}`);
});
