import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "https://homy-b5e6.onrender.com/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("homy-partner-token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
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
    if (token) loadOrders();
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

  async function updateStatus(order, status) {
    try {
      await call(`/partner/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadOrders();
    } catch (e) {
      setError(e.message);
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
          setError("Location updated successfully");
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
          <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
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

      <h1>Your assigned deliveries</h1>
      <div className="actions">
        <button onClick={loadOrders}>Refresh orders</button>
        <button className="light" onClick={sendLocation}>Share current location</button>
      </div>
      {error && <p className="message">{error}</p>}

      {orders.map(order => (
        <article className="order" key={order.id}>
          <div className="order-top">
            <strong>{order.orderNumber}</strong>
            <span>{order.status.replaceAll("_", " ")}</span>
          </div>
          <h2>{order.user?.name || "Customer"}</h2>
          <p>{order.user?.phone || "No phone provided"}</p>
          <p className="address">{order.address}</p>
          <h3>Items</h3>
          {order.items.map(item => (
            <p key={item.id}>{item.quantity} × {item.productName}</p>
          ))}
          <div className="actions">
            {order.status === "PREPARING" && (
              <button onClick={() => updateStatus(order, "OUT_FOR_DELIVERY")}>Start delivery</button>
            )}
            {order.status === "OUT_FOR_DELIVERY" && (
              <>
                <button className="light" onClick={sendLocation}>Update GPS</button>
                <button onClick={() => updateStatus(order, "DELIVERED")}>Mark delivered</button>
              </>
            )}
          </div>
          {order.latitude != null && order.longitude != null && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Navigate to customer
            </a>
          )}
        </article>
      ))}

      {!orders.length && <p className="message">No deliveries assigned yet.</p>}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
