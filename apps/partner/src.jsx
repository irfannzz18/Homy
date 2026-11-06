
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "https://homy-b5e6.onrender.com/api";
const money = n => `₹${(Number(n || 0) / 100).toFixed(2)}`;

function App() {
  const [token, setToken] = useState(localStorage.getItem("homy-partner-token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [otpValues, setOtpValues] = useState({});
  const [completedValues, setCompletedValues] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Request failed");
    return result;
  }

  async function loadOrders() {
    try {
      const result = await call("/partner/orders");
      setOrders(result.orders || []);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!token) return;

    loadOrders();
    const timer = setInterval(loadOrders, 3000);
    return () => clearInterval(timer);
  }, [token]);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const result = await call("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      if (result.user.role !== "PARTNER") {
        throw new Error("This account is not a delivery partner");
      }

      localStorage.setItem("homy-partner-token", result.token);
      setToken(result.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function acceptOrder(order) {
    try {
      await call(`/partner/orders/${order.id}/accept`, {
        method: "POST"
      });
      await loadOrders();
    } catch (e) {
      setError(e.message);
    }
  }

  async function startDelivery(order) {
    try {
      await call(`/partner/orders/${order.id}/start`, {
        method: "POST"
      });
      await loadOrders();
    } catch (e) {
      setError(e.message);
    }
  }

  async function verifyOtp(order) {
    const otp = otpValues[order.id] || "";

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the customer's 6-digit OTP");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await call(`/partner/orders/${order.id}/verify-otp`, {
        method: "POST",
        body: JSON.stringify({ otp })
      });

      setCompletedValues(old => ({
        ...old,
        [order.id]: result.order
      }));

      setOtpValues(old => ({ ...old, [order.id]: "" }));
      await loadOrders();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendLocation() {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          await call("/partner/location", {
            method: "POST",
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          });
          setError("");
        } catch (e) {
          setError(e.message);
        }
      },
      () => setError("Allow location permission to share your position"),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function logout() {
    localStorage.removeItem("homy-partner-token");
    setToken("");
    setOrders([]);
  }

  if (!token) {
    return (
      <main className="login">
        <form className="login-card" onSubmit={login}>
          <div className="logo">HØmy</div>
          <p className="eyebrow">DELIVERY PARTNER</p>
          <h1>Partner sign in</h1>

          <label>Email
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </label>

          <label>Password
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header>
        <div>
          <div className="logo">HØmy</div>
          <p className="eyebrow">DELIVERY PARTNER</p>
        </div>
        <button className="light" onClick={logout}>Sign out</button>
      </header>

      <section className="partner-welcome">
        <div>
          <h1>Your deliveries</h1>
          <p>Accept your assigned orders and deliver safely.</p>
        </div>
        <button className="light" onClick={sendLocation}>Share location</button>
      </section>

      {error && <p className="message">{error}</p>}

      {orders.map(order => {
        const accepted = Boolean(order.partnerAcceptedAt);
        const completed = completedValues[order.id];

        return (
          <article className="order" key={order.id}>
            <div className="order-top">
              <strong>{order.orderNumber}</strong>
              <span>
                {order.status === "OUT_FOR_DELIVERY"
                  ? "OUT FOR DELIVERY"
                  : order.status === "DELIVERED"
                    ? "DELIVERED"
                    : "PREPARING"}
              </span>
            </div>

            <h2>{order.user?.name || "Customer"}</h2>

            {order.user?.phone && (
              <a className="call-customer" href={`tel:${order.user.phone}`}>
                Call customer: {order.user.phone}
              </a>
            )}

            <p className="address">{order.address}</p>

            {order.items?.length > 0 && (
              <>
                <h3>Items in this order</h3>
                {order.items.map(item => (
                  <p key={item.id}>
                    {item.quantity} × {item.productName}
                  </p>
                ))}
              </>
            )}

            <p className="value-hidden">
              Order value is shown after successful customer OTP verification.
            </p>

            {order.status === "PREPARING" && !accepted && (
              <button onClick={() => acceptOrder(order)}>
                Accept order
              </button>
            )}

            {order.status === "PREPARING" && accepted && (
              <button onClick={() => startDelivery(order)}>
                Start delivery
              </button>
            )}

            {order.status === "OUT_FOR_DELIVERY" && (
              <>
                <button className="light" onClick={sendLocation}>
                  Update GPS location
                </button>

                <div className="otp-box">
                  <h3>Confirm delivery</h3>
                  <p>Ask the customer for their 6-digit delivery OTP.</p>

                  <input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpValues[order.id] || ""}
                    onChange={e => setOtpValues(old => ({
                      ...old,
                      [order.id]: e.target.value.replace(/\D/g, "").slice(0, 6)
                    }))}
                  />

                  <button disabled={busy} onClick={() => verifyOtp(order)}>
                    {busy ? "Verifying..." : "Verify OTP and complete"}
                  </button>
                </div>
              </>
            )}

            {completed && (
              <div className="completed-value">
                <strong>Delivery completed</strong>
                <p>Order value: {money(completed.totalPaise)}</p>
                <p>Payment method: {completed.paymentMethod}</p>
              </div>
            )}

            {order.latitude != null && order.longitude != null && (
              <div className="customer-location">
                <strong>Customer coordinates</strong>
                <p>{order.latitude}, {order.longitude}</p>
              </div>
            )}
          </article>
        );
      })}

      {!orders.length && (
        <p className="message">No deliveries assigned yet.</p>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
