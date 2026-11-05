import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "https://homy-b5e6.onrender.com/api";
const money = n => `₹${(Number(n || 0) / 100).toFixed(2)}`;

function App() {
  const [token, setToken] = useState(localStorage.getItem("homy-admin-token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState({});
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    if (token) load();
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
      if (result.user.role !== "ADMIN") throw new Error("This is not an admin account");
      localStorage.setItem("homy-admin-token", result.token);
      setToken(result.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("homy-admin-token");
    setToken("");
  }

  async function saveProduct(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const ingredients = form.ingredients.split("\n").filter(Boolean).map(line => {
        const [name, quantity] = line.split("|");
        return { name: name.trim(), quantity: (quantity || "").trim() };
      });
      const images = form.images.split("\n").map(x => x.trim()).filter(Boolean);

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
          isAvailable: true,
          ingredients,
          images
        })
      });

      setForm(emptyProduct);
      await load();
      setTab("products");
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
    try {
      await call("/admin/partners", {
        method: "POST",
        body: JSON.stringify(partnerForm)
      });
      setPartnerForm({
        name: "", email: "", phone: "", password: "",
        vehicleType: "", vehicleNumber: ""
      });
      await load();
    } catch (e) {
      setError(e.message);
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
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        </form>
      </main>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">HØmy</div>
        <p className="eyebrow">KITCHEN CONTROL</p>
        {[
          ["overview", "Overview"],
          ["products", "Meal kits"],
          ["add", "Add meal kit"],
          ["orders", "Orders"],
          ["partners", "Delivery partners"]
        ].map(([id, name]) => (
          <button key={id} className={tab === id ? "nav active" : "nav"} onClick={() => setTab(id)}>
            {name}
          </button>
        ))}
        <button className="logout" onClick={logout}>Sign out</button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">HØMY ADMIN</p>
            <h1>{tab === "add" ? "Add a meal kit" : tab[0].toUpperCase() + tab.slice(1)}</h1>
          </div>
          <button className="secondary" onClick={load}>Refresh</button>
        </header>

        {error && <p className="error notice">{error}</p>}

        {tab === "overview" && (
          <>
            <section className="stats">
              <article><span>Total orders</span><strong>{summary.orders || 0}</strong></article>
              <article><span>Listed meal kits</span><strong>{summary.products || 0}</strong></article>
              <article><span>Customers</span><strong>{summary.customers || 0}</strong></article>
              <article><span>Order value</span><strong>{money(summary.revenuePaise)}</strong></article>
            </section>
            <section className="panel">
              <h2>Recent orders</h2>
              <OrderList orders={orders.slice(0, 6)} changeStatus={changeStatus} />
            </section>
          </>
        )}

        {tab === "products" && (
          <section className="panel">
            <div className="section-head">
              <h2>All meal kits</h2>
              <button onClick={() => setTab("add")}>Add meal kit</button>
            </div>
            <div className="product-grid">
              {products.map(p => (
                <article className="product-card" key={p.id}>
                  <img src={p.imageUrl} alt={p.name} />
                  <div className="product-info">
                    <h3>{p.name}</h3>
                    <p>{p.category} · {p.type === "VEG" ? "Vegetarian" : "Non-vegetarian"}</p>
                    <strong>{money(p.pricePaise)}</strong>
                    <p>{p.ingredients?.length || 0} ingredients</p>
                    <button className="secondary" onClick={() => toggleProduct(p)}>
                      {p.isAvailable ? "Hide from customers" : "List for customers"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "add" && (
          <form className="panel form-grid" onSubmit={saveProduct}>
            <h2>New South Indian meal kit</h2>
            <label>Kit name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <label>Category<input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required /></label>
            <label>Food type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="VEG">Vegetarian</option><option value="NON_VEG">Non-vegetarian</option></select></label>
            <label>Price in rupees<input type="number" min="1" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required /></label>
            <label>Main kit photo URL<input type="url" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} required /></label>
            <label>Servings<input type="number" min="1" value={form.servings} onChange={e => setForm({ ...form, servings: e.target.value })} /></label>
            <label>Preparation minutes<input type="number" min="1" value={form.prepMinutes} onChange={e => setForm({ ...form, prepMinutes: e.target.value })} /></label>
            <label>Ingredients — one per line: name | quantity<textarea placeholder={"Rice | 250 g\nSambar powder | 20 g"} value={form.ingredients} onChange={e => setForm({ ...form, ingredients: e.target.value })} /></label>
            <label>Additional slide image URLs — one per line<textarea value={form.images} onChange={e => setForm({ ...form, images: e.target.value })} /></label>
            <button disabled={busy}>{busy ? "Saving..." : "Save and list meal kit"}</button>
          </form>
        )}

        {tab === "orders" && (
          <section className="panel">
            <h2>All orders</h2>
            <OrderList orders={orders} changeStatus={changeStatus} />
            {orders.map(order => (
              <div className="assign-row" key={order.id}>
                <span>{order.orderNumber} · Delivery partner</span>
                <select defaultValue={order.assignedPartnerId || ""} onChange={e => assignPartner(order.id, e.target.value)}>
                  <option value="">Assign partner</option>
                  {partners.filter(p => p.status === "APPROVED").map(p => (
                    <option key={p.id} value={p.id}>{p.user.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </section>
        )}

        {tab === "partners" && (
          <section className="panel">
            <h2>Create delivery partner</h2>
            <form className="form-grid" onSubmit={addPartner}>
              {["name", "email", "phone", "password", "vehicleType", "vehicleNumber"].map(key => (
                <label key={key}>{key}
                  <input
                    required={["name", "email", "phone", "password"].includes(key)}
                    type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                    value={partnerForm[key]}
                    onChange={e => setPartnerForm({ ...partnerForm, [key]: e.target.value })}
                  />
                </label>
              ))}
              <button>Create partner account</button>
            </form>
            <h2>Registered partners</h2>
            {partners.map(p => <p key={p.id}>{p.user.name} · {p.user.phone} · {p.status}</p>)}
          </section>
        )}
      </main>
    </div>
  );
}

function OrderList({ orders, changeStatus }) {
  return (
    <div className="order-list">
      {orders.map(o => (
        <article className="order-row" key={o.id}>
          <div>
            <strong>{o.orderNumber}</strong>
            <p>{o.user?.name || "Customer"} · {money(o.totalPaise)}</p>
            <small>{o.address}</small>
          </div>
          <div>
            <span className="status">{o.status}</span>
            <select value={o.status} onChange={e => changeStatus(o, e.target.value)}>
              {["PLACED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map(s => (
                <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
        </article>
      ))}
      {!orders.length && <p>No orders yet.</p>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
