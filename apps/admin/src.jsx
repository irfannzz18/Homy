
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "https://homy-b5e6.onrender.com/api";
const money = n => `₹${(Number(n || 0) / 100).toFixed(2)}`;

function App() {
  const [token, setToken] = useState(localStorage.getItem("homy-admin-token") || "");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("orders");
  const [summary, setSummary] = useState({});
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const emptyProduct = {
    name: "", description: "", category: "South Indian",
    type: "VEG", price: "", imageUrl: "", servings: 2,
    prepMinutes: 25, ingredients: "", images: ""
  };

  const [form, setForm] = useState(emptyProduct);
  const [partnerForm, setPartnerForm] = useState({
    name: "", email: "", phone: "", password: "",
    vehicleType: "", vehicleNumber: ""
  });

  async function call(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
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

  async function load() {
    try {
      const [s, p, o, d] = await Promise.all([
        call("/admin/summary"),
        call("/admin/products"),
        call("/admin/orders"),
        call("/admin/partners")
      ]);

      setSummary(s);
      setProducts(p.products || []);
      setOrders(o.orders || []);
      setPartners(d.partners || []);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!token) return;

    call("/auth/me")
      .then(r => setUser(r.user))
      .catch(() => logout());

    load();

    const timer = setInterval(load, 3000);
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

      if (result.user.role !== "ADMIN") {
        throw new Error("This is not an admin account");
      }

      localStorage.setItem("homy-admin-token", result.token);
      setToken(result.token);
      setUser(result.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("homy-admin-token");
    setToken("");
    setUser(null);
  }

  async function saveProduct(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const ingredients = form.ingredients
        .split("\n")
        .filter(Boolean)
        .map(line => {
          const [name, quantity] = line.split("|");
          return { name: name.trim(), quantity: (quantity || "").trim() };
        });

      const images = form.images
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);

      await call("/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          type: form.type,
          pricePaise: Math.round(Number(form.price) * 100),
          imageUrl: form.imageUrl,
          servings: Number(form.servings),
          prepMinutes: Number(form.prepMinutes),
          isAvailable: false,
          ingredients,
          images
        })
      });

      setForm(emptyProduct);
      setShowAddProduct(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(product) {
    try {
      await call(`/admin/products/${product.id}/availability`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !product.isAvailable })
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function changeStatus(order, status) {
    try {
      await call(`/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addPartner(e) {
    e.preventDefault();
    setBusy(true);

    try {
      await call("/admin/partners", {
        method: "POST",
        body: JSON.stringify(partnerForm)
      });

      setPartnerForm({
        name: "", email: "", phone: "", password: "",
        vehicleType: "", vehicleNumber: ""
      });

      setShowAddPartner(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function assignPartner(orderId, partnerId) {
    if (!partnerId) return;

    try {
      await call(`/admin/orders/${orderId}/assign`, {
        method: "POST",
        body: JSON.stringify({ partnerId })
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!token) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={login}>
          <div className="brand">HØmy</div>
          <p className="eyebrow">KITCHEN ADMINISTRATION</p>
          <h1>Welcome back</h1>
          <p>Manage your meal kits and orders.</p>

          <label>Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>

          <label>Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
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
    <div className="admin-app">
      <header className="admin-header">
        <div className="profile-avatar">I</div>
        <div className="header-brand">
          <div className="brand">HØmy</div>
          <small>Kitchen administration</small>
        </div>
        <button className="secondary refresh-button" onClick={load}>
          Refresh
        </button>
      </header>

      <main className="admin-content">
        {error && <p className="error notice">{error}</p>}

        {tab === "orders" && (
          <>
            <section className="stats">
              <article>
                <span>Today's orders</span>
                <strong>{summary.todayOrders ?? summary.orders ?? 0}</strong>
              </article>
              <article>
                <span>Today's sales</span>
                <strong>{money(summary.todayRevenuePaise ?? summary.revenuePaise)}</strong>
              </article>
            </section>

            <section className="panel">
              <div className="section-head">
                <h2>Orders</h2>
                <span className="muted">{orders.length} orders</span>
              </div>
              <OrderList
                orders={orders}
                partners={partners}
                changeStatus={changeStatus}
                assignPartner={assignPartner}
              />
            </section>
          </>
        )}

        {tab === "partners" && (
          <section className="panel">
            <div className="section-head">
              <h2>Delivery partners</h2>
              <button
                className="add-circle"
                onClick={() => setShowAddPartner(!showAddPartner)}
                aria-label="Add delivery partner"
              >
                +
              </button>
            </div>

            {showAddPartner && (
              <form className="form-grid" onSubmit={addPartner}>
                <h3>New delivery partner</h3>

                {["name", "email", "phone", "password", "vehicleType", "vehicleNumber"].map(key => (
                  <label key={key}>
                    {key === "vehicleType" ? "Vehicle type" :
                     key === "vehicleNumber" ? "Vehicle number" :
                     key[0].toUpperCase() + key.slice(1)}
                    <input
                      required={["name", "email", "phone", "password"].includes(key)}
                      type={
                        key === "password" ? "password" :
                        key === "email" ? "email" : "text"
                      }
                      value={partnerForm[key]}
                      onChange={e => setPartnerForm({
                        ...partnerForm,
                        [key]: e.target.value
                      })}
                    />
                  </label>
                ))}

                <button disabled={busy}>
                  {busy ? "Creating..." : "Create partner"}
                </button>
              </form>
            )}

            {partners.length === 0 ? (
              <p className="empty-state">No partners added</p>
            ) : (
              <div className="partner-list">
                {partners.map(p => (
                  <article className="partner-row" key={p.id}>
                    <div className="profile-avatar small">
                      {(p.user?.name || "P").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{p.user?.name || "Partner"}</strong>
                      <p>{p.user?.phone || p.user?.email || ""}</p>
                      <small>{p.status}</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "account" && (
          <section className="panel account-panel">
            <div className="account-avatar">I</div>
            <h2>{user?.name || "HØmy Admin"}</h2>
            <p>{user?.email || email}</p>
            <div className="account-details">
              <div><span>Account type</span><strong>Administrator</strong></div>
              <div><span>Meal kits</span><strong>{products.length}</strong></div>
              <div><span>Customers</span><strong>{summary.customers || 0}</strong></div>
            </div>
            <button className="logout-button" onClick={logout}>Sign out</button>
          </section>
        )}

        {tab === "account" && (
          <section className="panel">
            <h2>Meal kits</h2>
            <div className="section-head">
              <p className="muted">Manage what customers can see.</p>
              <button onClick={() => setShowAddProduct(!showAddProduct)}>
                {showAddProduct ? "Close" : "Add meal kit"}
              </button>
            </div>

            {showAddProduct && (
              <form className="form-grid" onSubmit={saveProduct}>
                <label>Kit name
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </label>
                <label>Description
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </label>
                <label>Category
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
                </label>
                <label>Food type
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="VEG">Vegetarian</option>
                    <option value="NON_VEG">Non-vegetarian</option>
                  </select>
                </label>
                <label>Price in rupees
                  <input type="number" min="1" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                </label>
                <label>Main kit photo URL
                  <input type="url" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} required />
                </label>
                <label>Servings
                  <input type="number" min="1" value={form.servings} onChange={e => setForm({ ...form, servings: e.target.value })} />
                </label>
                <label>Preparation minutes
                  <input type="number" min="1" value={form.prepMinutes} onChange={e => setForm({ ...form, prepMinutes: e.target.value })} />
                </label>
                <label>Ingredients — name | quantity
                  <textarea placeholder={"Rice | 250 g\nSambar powder | 20 g"} value={form.ingredients} onChange={e => setForm({ ...form, ingredients: e.target.value })} />
                </label>
                <label>Ingredient slide image URLs — one per line
                  <textarea value={form.images} onChange={e => setForm({ ...form, images: e.target.value })} />
                </label>
                <button disabled={busy}>
                  {busy ? "Saving..." : "Save hidden meal kit"}
                </button>
              </form>
            )}

            <div className="product-grid">
              {products.map(p => (
                <article className="product-card" key={p.id}>
                  <img src={p.imageUrl} alt={p.name} />
                  <div className="product-info">
                    <h3>{p.name}</h3>
                    <p>{p.category} · {p.type === "VEG" ? "Vegetarian" : "Non-vegetarian"}</p>
                    <strong>{money(p.pricePaise)}</strong>
                    <p>{p.ingredients?.length || 0} ingredients</p>
                    <button
                      className="secondary"
                      onClick={() => toggleProduct(p)}
                    >
                      {p.isAvailable ? "Hide from customers" : "List for customers"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={tab === "orders" ? "bottom-active" : ""}
          onClick={() => setTab("orders")}
        >
          <span>▤</span>Orders
        </button>
        <button
          className={tab === "partners" ? "bottom-active" : ""}
          onClick={() => setTab("partners")}
        >
          <span>♙</span>Partners
        </button>
        <button
          className={tab === "account" ? "bottom-active" : ""}
          onClick={() => setTab("account")}
        >
          <span>◉</span>My Account
        </button>
      </nav>
    </div>
  );
}

function OrderList({ orders, partners, changeStatus, assignPartner }) {
  return (
    <div className="order-list">
      {orders.map(o => (
        <article className="order-row" key={o.id}>
          <div className="order-main">
            <strong>{o.orderNumber}</strong>
            <p>{o.user?.name || "Customer"} · {money(o.totalPaise)}</p>
            <small>{o.address}</small>
            <div className="assign-row">
              <label>Delivery partner
                <select
                  value={o.assignedPartnerId || ""}
                  onChange={e => assignPartner(o.id, e.target.value)}
                >
                  <option value="">Assign partner</option>
                  {partners.filter(p => p.status === "APPROVED").map(p => (
                    <option key={p.id} value={p.id}>{p.user?.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="order-actions">
            <span className="status">
              {o.status === "OUT_FOR_DELIVERY" ? "Out for Delivery" :
               o.status === "DELIVERED" ? "Delivered" : "Preparing"}
            </span>
            <select
              value={o.status}
              onChange={e => changeStatus(o, e.target.value)}
            >
              <option value="PREPARING">Preparing</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>
        </article>
      ))}

      {!orders.length && <p className="empty-state">No orders yet.</p>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
