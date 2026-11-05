import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "https://homy-b5e6.onrender.com/api";
const money = n => `₹${(Number(n || 0) / 100).toFixed(2)}`;

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [token, setToken] = useState(localStorage.getItem("homy-customer-token") || "");
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [screen, setScreen] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ name: "", email: "", phone: "", password: "" });
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [payment, setPayment] = useState("COD");
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function loadProducts() {
    try {
      const result = await request("/products");
      setProducts(result.products || []);
    } catch (e) { setError(e.message); }
  }

  async function loadUser() {
    if (!token) return;
    try {
      const result = await request("/auth/me");
      setUser(result.user);
      const orderResult = await request("/orders/mine");
      setOrders(orderResult.orders || []);
    } catch {
      localStorage.removeItem("homy-customer-token");
      setToken("");
    }
  }

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { loadUser(); }, [token]);

  const visible = products.filter(p => filter === "ALL" || p.type === filter);
  const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0);
  const subtotal = cartItems.reduce((sum, [id, qty]) => {
    const p = products.find(item => item.id === id);
    return sum + (p ? p.pricePaise * qty : 0);
  }, 0);

  function add(id) {
    setCart(old => ({ ...old, [id]: (old[id] || 0) + 1 }));
  }

  function remove(id) {
    setCart(old => ({ ...old, [id]: Math.max(0, (old[id] || 0) - 1) }));
  }

  async function submitAuth(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = authMode === "register" ? "/auth/register" : "/auth/login";
      const result = await request(path, {
        method: "POST",
        body: JSON.stringify(auth)
      });
      localStorage.setItem("homy-customer-token", result.token);
      setToken(result.token);
      setUser(result.user);
      setScreen("home");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const c = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCoords(c);
        setAddress(`${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`);
      },
      () => setError("Please allow location permission or enter your address manually"),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function checkout(e) {
    e.preventDefault();
    if (!token) {
      setScreen("account");
      return;
    }
    if (!cartItems.length) return;
    setBusy(true);
    setError("");
    try {
      const result = await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          address,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          paymentMethod: payment,
          items: cartItems.map(([productId, quantity]) => ({ productId, quantity }))
        })
      });
      setCart({});
      setOrders(old => [result.order, ...old]);
      setUpiId(result.payment?.upiId || "");
      setScreen(payment === "UPI" ? "payment" : "orders");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("homy-customer-token");
    setToken("");
    setUser(null);
    setScreen("home");
  }

  return (
    <div className="app">
      <header className="header">
        <button className="logo" onClick={() => setScreen("home")}>
          <span className="leaf">✦</span> HØmy
        </button>
        <nav>
          <button onClick={() => setScreen("home")}>Explore</button>
          <button onClick={() => setScreen("orders")}>My orders</button>
          <button onClick={() => setScreen("cart")}>Cart ({cartItems.reduce((n, x) => n + x[1], 0)})</button>
          <button onClick={() => setScreen("account")}>{user ? user.name : "Sign in"}</button>
        </nav>
      </header>

      {error && <div className="error">{error}</div>}

      {screen === "home" && (
        <>
          <section className="hero">
            <p className="eyebrow">A LITTLE HOME IN EVERY MEAL</p>
            <h1>South Indian flavours,<br />made simple.</h1>
            <p>Freshly packed meal kits with the ingredients you need.</p>
            <button onClick={() => document.getElementById("kits")?.scrollIntoView({ behavior: "smooth" })}>
              Explore meal kits
            </button>
          </section>

          <section id="kits" className="catalogue">
            <div className="section-title">
              <div><p className="eyebrow">MADE FOR YOUR TABLE</p><h2>Our meal kits</h2></div>
              <div className="filters">
                {["ALL", "VEG", "NON_VEG"].map(f => (
                  <button className={filter === f ? "chosen" : ""} key={f} onClick={() => setFilter(f)}>
                    {f === "ALL" ? "All" : f === "VEG" ? "Veg" : "Non-veg"}
                  </button>
                ))}
              </div>
            </div>

            <div className="products">
              {visible.map(p => (
                <article className="product" key={p.id}>
                  <button className="photo-button" onClick={() => setSelected(p)}>
                    <img src={p.imageUrl} alt={p.name} />
                  </button>
                  <div className="product-content">
                    <span className="food-type">{p.type === "VEG" ? "VEGETARIAN" : "NON-VEGETARIAN"}</span>
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    <div className="product-bottom">
                      <strong>{money(p.pricePaise)}</strong>
                      <button onClick={() => add(p.id)}>Add +</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!visible.length && <p className="empty">No meal kits are currently listed.</p>}
          </section>
        </>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="detail-modal" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)}>×</button>
            <img className="detail-photo" src={selected.imageUrl} alt={selected.name} />
            <div className="detail-content">
              <p className="eyebrow">MEAL KIT DETAILS</p>
              <h2>{selected.name}</h2>
              <p>{selected.description}</p>
              <strong>{money(selected.pricePaise)}</strong>
              <div className="ingredient-slides">
                {(selected.images || []).map(image => (
                  <img key={image.id} src={image.imageUrl} alt="Meal kit contents" />
                ))}
              </div>
              <h3>What's inside</h3>
              {(selected.ingredients || []).map(item => (
                <div className="ingredient" key={item.id}>
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
                  <span>{item.name}</span><small>{item.quantity}</small>
                </div>
              ))}
              <button onClick={() => add(selected.id)}>Add to cart</button>
            </div>
          </section>
        </div>
      )}

      {screen === "cart" && (
        <main className="page">
          <h1>Your cart</h1>
          {cartItems.map(([id, qty]) => {
            const p = products.find(x => x.id === id);
            if (!p) return null;
            return (
              <div className="cart-row" key={id}>
                <img src={p.imageUrl} alt={p.name} />
                <div><strong>{p.name}</strong><p>{money(p.pricePaise)}</p></div>
                <div className="quantity">
                  <button onClick={() => remove(id)}>-</button>{qty}<button onClick={() => add(id)}>+</button>
                </div>
              </div>
            );
          })}
          <h2>Subtotal: {money(subtotal)}</h2>
          <p>Delivery: {subtotal >= 49900 ? "Free" : "₹39.00"}</p>
          <button onClick={() => setScreen("checkout")} disabled={!cartItems.length}>Continue to checkout</button>
        </main>
      )}

      {screen === "checkout" && (
        <main className="page">
          <h1>Delivery details</h1>
          <form className="checkout" onSubmit={checkout}>
            <label>Delivery address
              <textarea required value={address} onChange={e => setAddress(e.target.value)} placeholder="House number, street, area, city, PIN code" />
            </label>
            <button type="button" className="secondary" onClick={useLocation}>Use my current location</button>
            {coords && <p>Location captured. Please confirm the address above.</p>}
            <label>Payment method
              <select value={payment} onChange={e => setPayment(e.target.value)}>
                <option value="COD">Cash on delivery</option>
                {upiId && <option value="UPI">UPI</option>}
              </select>
            </label>
            <h2>Total: {money(subtotal + (subtotal >= 49900 ? 0 : 3900))}</h2>
            <button disabled={busy}>{busy ? "Placing order..." : "Place order"}</button>
          </form>
        </main>
      )}

      {screen === "payment" && (
        <main className="page">
          <h1>UPI payment</h1>
          <p>UPI ID: {upiId}</p>
          <p>Your order is awaiting payment verification. Do not assume payment is complete until it is verified by the merchant.</p>
          <button onClick={() => setScreen("orders")}>View order</button>
        </main>
      )}

      {screen === "orders" && (
        <main className="page">
          <h1>Your orders</h1>
          {!token && <button onClick={() => setScreen("account")}>Sign in to view orders</button>}
          {orders.map(o => (
            <article className="order-card" key={o.id}>
              <strong>{o.orderNumber}</strong>
              <span>{o.status.replaceAll("_", " ")}</span>
              <p>{money(o.totalPaise)} · {o.paymentMethod}</p>
              <p>{o.address}</p>
              {o.status === "PLACED" || o.status === "CONFIRMED" ? (
                <button className="secondary" onClick={async () => {
                  try {
                    await request(`/orders/${o.id}/cancel`, { method: "POST" });
                    const r = await request("/orders/mine");
                    setOrders(r.orders);
                  } catch (e) { setError(e.message); }
                }}>Cancel order</button>
              ) : null}
            </article>
          ))}
        </main>
      )}

      {screen === "account" && (
        <main className="page">
          {user ? (
            <>
              <h1>Hello, {user.name}</h1>
              <p>{user.email}</p>
              <button onClick={logout}>Sign out</button>
            </>
          ) : (
            <form className="auth-form" onSubmit={submitAuth}>
              <h1>{authMode === "login" ? "Welcome back" : "Create account"}</h1>
              {authMode === "register" && <>
                <label>Name<input required value={auth.name} onChange={e => setAuth({ ...auth, name: e.target.value })} /></label>
                <label>Phone<input value={auth.phone} onChange={e => setAuth({ ...auth, phone: e.target.value })} /></label>
              </>}
              <label>Email<input type="email" required value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })} /></label>
              <label>Password<input type="password" required value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} /></label>
              <button disabled={busy}>{busy ? "Please wait..." : authMode === "login" ? "Sign in" : "Register"}</button>
              <button type="button" className="secondary" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                {authMode === "login" ? "Create an account" : "I already have an account"}
              </button>
            </form>
          )}
        </main>
      )}

      <footer>HØmy · South Indian food, made simple.</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
