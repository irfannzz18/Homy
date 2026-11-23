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
replaceOnce(`/* SERVER ERROR HANDLING */`, `app.get("/api/geocode/reverse", async (req, res) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lng);
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(503).json({ error: "Google Maps Geocoding API key is not configured" });
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return res.status(400).json({ error: "Valid coordinates are required" });
  }
  try {
    const url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + latitude + "," + longitude + "&key=" + encodeURIComponent(key);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data.status !== "OK" || !data.results?.[0]) {
      return res.status(404).json({ error: "Could not find a readable address for this location" });
    }
    res.json({ address: data.results[0].formatted_address });
  } catch {
    res.status(502).json({ error: "Address lookup is temporarily unavailable" });
  }
});

/* SINGLE-WEBSITE HOSTING: all three role interfaces share this origin. */

/* SERVER ERROR HANDLING */`, 'reverse geocoding route');
replaceOnce('setAddress(`${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`);', `fetch("/api/geocode/reverse?lat=" + c.latitude + "&lng=" + c.longitude)
          .then(response => response.json())
          .then(result => {
            if (result.address) setAddress(result.address);
            else setError(result.error || "Enter your full delivery address manually");
          })
          .catch(() => setError("Address lookup failed. Please enter the address manually."));`, 'readable customer address');
replaceOnce(`              {o.assignedPartner?.latitude != null &&
               o.assignedPartner?.longitude != null && (
                <p>
                  Partner location: {o.assignedPartner.latitude},
                  {o.assignedPartner.longitude}
                </p>
              )}`, `              {o.assignedPartner?.latitude != null &&
               o.assignedPartner?.longitude != null && (
                <div className="live-map">
                  <strong>Live delivery partner location</strong>
                  <iframe title="Live delivery partner map"
                    src={"https://www.google.com/maps?q=" + o.assignedPartner.latitude + "," + o.assignedPartner.longitude + "&output=embed"}
                    loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    style={{ width: "100%", height: 220, border: 0, borderRadius: 12 }} />
                </div>
              )}`, 'customer embedded map');
replaceOnce('      await call(`/partner/orders/${order.id}/start`, {\n        method: "POST"\n      });\n      await loadOrders();', '      await call(`/partner/orders/${order.id}/start`, {\n        method: "POST"\n      });\n      await loadOrders();\n      sendLocation();', 'start partner GPS after delivery begins');
replaceOnce('navigator.geolocation.getCurrentPosition(', 'window.__homyGpsWatch = navigator.geolocation.watchPosition(', 'continuous partner GPS');
replaceOnce(`      async position => {
        try {
          await call("/partner/location", {`, `      async position => {
        if (Date.now() - (window.__homyGpsLast || 0) < 5000) return;
        window.__homyGpsLast = Date.now();
        try {
          await call("/partner/location", {`, 'throttle partner GPS updates');
replaceOnce('{ enableHighAccuracy: true, timeout: 12000 }', '{ enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }', 'GPS watch options');
replaceOnce(`            <p className="address">{order.address}</p>`, `            <p className="address">{order.address}</p>
            {order.latitude != null && order.longitude != null && (
              <div className="customer-map">
                <strong>Customer delivery location</strong>
                <iframe title="Customer delivery map"
                  src={"https://www.google.com/maps?q=" + order.latitude + "," + order.longitude + "&output=embed"}
                  loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  style={{ width: "100%", height: 220, border: 0, borderRadius: 12 }} />
              </div>
            )}`, 'partner embedded customer map');
replaceOnce(`function logout() {
    localStorage.removeItem("homy-partner-token");`, `function logout() {
    if (window.__homyGpsWatch !== undefined && navigator.geolocation) navigator.geolocation.clearWatch(window.__homyGpsWatch);
    window.__homyGpsWatch = undefined;
    localStorage.removeItem("homy-partner-token");`, 'stop partner GPS on logout');
fs.writeFileSync(file, source);
console.log('HØmy preparation complete: one origin, partner-create fix, COD/OTP protections, address geocoding and embedded maps.');
