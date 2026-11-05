import "dotenv/config";

import express, {
  Request,
  Response,
  NextFunction
} from "express";

import cors from "cors";
import helmet from "helmet";
import { PrismaClient, Role, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";

const prisma = new PrismaClient();
const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true
  })
);

app.use(express.json({ limit: "1mb" }));

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET must be configured with at least 32 characters."
  );
}

type AuthRequest = Request & {
  auth?: {
    id: string;
    role: Role;
  };
};

function tokenFor(user: { id: string; role: Role }) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

function auth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const raw = req.headers.authorization?.replace(
    /^Bearer\s+/i,
    ""
  );

  if (!raw) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  try {
    req.auth = jwt.verify(
      raw,
      JWT_SECRET!
    ) as {
      id: string;
      role: Role;
    };

    next();
  } catch {
    return res.status(401).json({
      error: "Session expired or invalid"
    });
  }
}

function admin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.auth?.role !== Role.ADMIN) {
    return res.status(403).json({
      error: "Admin access required"
    });
  }

  next();
}

const asyncRoute = (
  fn: (
    req: AuthRequest,
    res: Response
  ) => Promise<unknown>
) =>
  (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) =>
    Promise.resolve(fn(req, res)).catch(next);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "homy-api"
  });
});

// Register customer
app.post(
  "/api/auth/register",
  asyncRoute(async (req, res) => {
    const input = z
      .object({
        name: z.string().min(2).max(80),
        email: z.string().email(),
        password: z.string().min(8).max(100),
        phone: z.string().max(30).optional()
      })
      .parse(req.body);

    const email = input.email.toLowerCase();

    if (
      await prisma.user.findUnique({
        where: { email }
      })
    ) {
      return res.status(409).json({
        error: "Email already registered"
      });
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        phone: input.phone,
        passwordHash: await bcrypt.hash(
          input.password,
          12
        )
      }
    });

    return res.status(201).json({
      token: tokenFor(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  })
);

// Login
app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const input = z
      .object({
        email: z.string().email(),
        password: z.string().min(1)
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({
      where: {
        email: input.email.toLowerCase()
      }
    });

    if (
      !user ||
      !(await bcrypt.compare(
        input.password,
        user.passwordHash
      ))
    ) {
      return res.status(401).json({
        error: "Email or password is incorrect"
      });
    }

    return res.json({
      token: tokenFor(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  })
);

// Product list
app.get(
  "/api/products",
  asyncRoute(async (req, res) => {
    const type = req.query.type;

    if (
      type &&
      !["VEG", "NON_VEG"].includes(String(type))
    ) {
      return res.status(400).json({
        error: "Invalid product type"
      });
    }

    const products = await prisma.product.findMany({
      where: {
        isAvailable: true,
        ...(type
          ? {
              type: String(type) as
                | "VEG"
                | "NON_VEG"
            }
          : {})
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json(products);
  })
);

// Product details
app.get(
  "/api/products/:id",
  asyncRoute(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!product || !product.isAvailable) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    return res.json(product);
  })
);

// Create product (admin)
app.post(
  "/api/products",
  auth,
  admin,
  asyncRoute(async (req, res) => {
    const product = z
      .object({
        name: z.string().min(2),
        description: z.string().min(5),
        type: z.enum(["VEG", "NON_VEG"]),
        pricePaise: z.number().int().positive(),
        imageUrl: z.string().url(),
        servings: z.number().int().min(1).max(20),
        prepMinutes: z.number().int().min(1).max(240)
      })
      .parse(req.body);

    return res.status(201).json(
      await prisma.product.create({
        data: product
      })
    );
  })
);

// Update product (admin)
app.patch(
  "/api/products/:id",
  auth,
  admin,
  asyncRoute(async (req, res) => {
    const product = z
      .object({
        name: z.string().min(2).optional(),
        description: z.string().min(5).optional(),
        type: z.enum(["VEG", "NON_VEG"]).optional(),
        pricePaise: z.number().int().positive().optional(),
        imageUrl: z.string().url().optional(),
        servings: z.number().int().min(1).max(20).optional(),
        prepMinutes: z.number().int().min(1).max(240).optional(),
        isAvailable: z.boolean().optional()
      })
      .parse(req.body);

    return res.json(
      await prisma.product.update({
        where: {
          id: req.params.id
        },
        data: product
      })
    );
  })
);

// Soft-delete product (admin)
app.delete(
  "/api/products/:id",
  auth,
  admin,
  asyncRoute(async (req, res) => {
    await prisma.product.update({
      where: {
        id: req.params.id
      },
      data: {
        isAvailable: false
      }
    });

    return res.status(204).send();
  })
);

// Place order
app.post(
  "/api/orders",
  auth,
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        address: z.string().min(8).max(500),
        customerNote: z.string().max(500).optional(),
        paymentMethod: z.enum(["COD"]).default("COD"),
        items: z
          .array(
            z.object({
              productId: z.string(),
              quantity: z.number().int().min(1).max(30)
            })
          )
          .min(1)
          .max(30)
      })
      .parse(req.body);

    const ids = [
      ...new Set(
        body.items.map((item) => item.productId)
      )
    ];

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: ids
        },
        isAvailable: true
      }
    });

    if (products.length !== ids.length) {
      return res.status(400).json({
        error: "One or more products are unavailable"
      });
    }

    const byId = new Map(
      products.map((product) => [
        product.id,
        product
      ])
    );

    const subtotal = body.items.reduce(
      (sum, item) =>
        sum +
        byId.get(item.productId)!.pricePaise *
          item.quantity,
      0
    );

    const delivery =
      subtotal >= 49900 ? 0 : 3900;

    const order = await prisma.order.create({
      data: {
        orderNumber:
          "HM" +
          Date.now().toString(36).toUpperCase() +
          crypto
            .randomBytes(2)
            .toString("hex")
            .toUpperCase(),

        userId: req.auth!.id,
        address: body.address,
        customerNote: body.customerNote,
        paymentMethod: "COD",

        subtotalPaise: subtotal,
        deliveryPaise: delivery,
        totalPaise: subtotal + delivery,

        items: {
          create: body.items.map((item) => ({
            productId: item.productId,
            productName:
              byId.get(item.productId)!.name,
            quantity: item.quantity,
            unitPricePaise:
              byId.get(item.productId)!.pricePaise
          }))
        }
      },
      include: {
        items: true
      }
    });

    return res.status(201).json(order);
  })
);

// Customer order history
app.get(
  "/api/orders/mine",
  auth,
  asyncRoute(async (req, res) => {
    return res.json(
      await prisma.order.findMany({
        where: {
          userId: req.auth!.id
        },
        include: {
          items: true
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    );
  })
);

// Customer cancellation
app.post(
  "/api/orders/:id/cancel",
  auth,
  asyncRoute(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id,
        userId: req.auth!.id
      }
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    if (
      !["PLACED", "CONFIRMED"].includes(
        order.status
      )
    ) {
      return res.status(409).json({
        error:
          "This order can no longer be cancelled"
      });
    }

    return res.json(
      await prisma.order.update({
        where: {
          id: order.id
        },
        data: {
          status: "CANCELLED"
        }
      })
    );
  })
);

// Admin order list
app.get(
  "/api/admin/orders",
  auth,
  admin,
  asyncRoute(async (_req, res) => {
    return res.json(
      await prisma.order.findMany({
        include: {
          items: true,
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    );
  })
);

// Admin status update
app.patch(
  "/api/admin/orders/:id/status",
  auth,
  admin,
  asyncRoute(async (req, res) => {
    const status = z
      .nativeEnum(OrderStatus)
      .parse(req.body.status);

    const order = await prisma.order.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    const allowed: Record<
      OrderStatus,
      OrderStatus[]
    > = {
      PLACED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["OUT_FOR_DELIVERY"],
      OUT_FOR_DELIVERY: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: []
    };

    if (!allowed[order.status].includes(status)) {
      return res.status(409).json({
        error:
          `Cannot move ${order.status} to ${status}`
      });
    }

    return res.json(
      await prisma.order.update({
        where: {
          id: order.id
        },
        data: {
          status
        }
      })
    );
  })
);

// Admin dashboard summary
app.get(
  "/api/admin/summary",
  auth,
  admin,
  asyncRoute(async (_req, res) => {
    const [
      orders,
      products,
      users,
      revenue
    ] = await Promise.all([
      prisma.order.count(),

      prisma.product.count({
        where: {
          isAvailable: true
        }
      }),

      prisma.user.count({
        where: {
          role: Role.CUSTOMER
        }
      }),

      prisma.order.aggregate({
        where: {
          status: "DELIVERED"
        },
        _sum: {
          totalPaise: true
        }
      })
    ]);

    return res.json({
      orders,
      activeProducts: products,
      customers: users,
      revenuePaise:
        revenue._sum.totalPaise ?? 0
    });
  })
);

// Error handler
app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
        details: err.issues
      });
    }

    console.error(err);

    return res.status(500).json({
      error: "Unexpected server error"
    });
  }
);

const port = Number(
  process.env.PORT ?? 4000
);

app.listen(port, () => {
  console.log(
    `HØmy API listening on ${port}`
  );
});
