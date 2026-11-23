'use strict';
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'apps', 'api', 'src', 'index.ts');
let source = fs.readFileSync(file, 'utf8');
function replaceOnce(from, to, label) {
  if (!source.includes(from)) {
    if (source.includes(to)) return;
    throw new Error('HØmy source preparation failed: could not locate ' + label);
  }
  source = source.replace(from, to);
}
replaceOnce('import crypto from "crypto";\n', 'import crypto from "crypto";\nimport path from "path";\n', 'crypto import');
replaceOnce('app.use(helmet());', 'app.use(helmet({ contentSecurityPolicy: false }));', 'helmet setup');
replaceOnce(`    const created = await db.user.create({
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
    });`, `    const created = await db.user.create({
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
    });`, 'partner-create syntax');
replaceOnce(`  if (includeOtp) {
    result.deliveryOtp = decryptOtp(order.deliveryOtpCipher);
  }`, `  if (includeOtp && order.partnerAcceptedAt &&
      ["PREPARING", "OUT_FOR_DELIVERY"].includes(order.status)) {
    result.deliveryOtp = decryptOtp(order.deliveryOtpCipher);
  }`, 'customer OTP visibility');
replaceOnce('paymentMethod: z.enum(["COD", "UPI"]).default("COD"),', 'paymentMethod: z.literal("COD").default("COD"),', 'COD-only checkout');
replaceOnce(`    if (data.paymentMethod === "UPI" && !process.env.UPI_ID) {
      return res.status(400).json({
        error: "UPI is not configured"
      });
    }

`, '', 'remove unverified UPI flow');
replaceOnce(`      order: {
        ...publicOrder(order),
        deliveryOtp: otp
      },
      payment: data.paymentMethod === "UPI"
        ? {
            upiId: process.env.UPI_ID,
            status: "AWAITING_VERIFICATION"
          }
        : { status: "PAY_ON_DELIVERY" }`, `      order: publicOrder(order),
      payment: { status: "PAY_ON_DELIVERY" }`, 'hide OTP until partner acceptance');
replaceOnce(`          status: "DELIVERED",
          deliveredAt: new Date(),
          deliveryOtpHash: null,`, `          status: "DELIVERED",
          paymentStatus: order.paymentMethod === "COD" ? "COLLECTED" : order.paymentStatus,
          deliveredAt: new Date(),
          deliveryOtpHash: null,`, 'COD collection on verified delivery');
replaceOnce(`      await db.deliveryPartner.update({
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

      if (active.length) {`, `      const active = await db.order.findMany({
        where: {
          assignedPartnerId: p.id,
          status: "OUT_FOR_DELIVERY"
        },
        select: { id: true }
      });

      if (!active.length) {
        return res.status(409).json({ error: "Location sharing starts only during an active delivery" });
      }

      await db.deliveryPartner.update({
        where: { id: p.id },
        data: {
          latitude: data.latitude,
          longitude: data.longitude,
          lastLocationAt: new Date()
        }
      });

      if (active.length) {`, 'location sharing gate');
replaceOnce(`/* SERVER ERROR HANDLING */`, `/* SINGLE-WEBSITE HOSTING: all three role interfaces share this origin. */
const webApps = [
  { route: "/customer", directory: path.resolve(process.cwd(), "apps/customer-web/dist") },
  { route: "/partner", directory: path.resolve(process.cwd(), "apps/partner/dist") },
  { route: "/admin", directory: path.resolve(process.cwd(), "apps/admin/dist") }
];
for (const site of webApps) {
  app.use(site.route, express.static(site.directory, { index: false, maxAge: "1h" }));
  app.get(site.route, (_req, res) => res.sendFile(path.join(site.directory, "index.html")));
  app.get(site.route + "/*", (_req, res) => res.sendFile(path.join(site.directory, "index.html")));
}
app.get("/", (_req, res) => res.redirect("/customer/"));
app.get("/api/*", (_req, res) => res.status(404).json({ error: "API route not found" }));

/* SERVER ERROR HANDLING */`, 'single website static hosting');
fs.writeFileSync(file, source);
console.log('HØmy API prepared: syntax correction, COD/OTP safeguards and three same-origin web interfaces.');
