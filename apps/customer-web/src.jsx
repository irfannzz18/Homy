import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ShoppingBag, Search, User, Menu, X, Plus, Minus,
  ArrowRight, Leaf, Clock, Package, LogOut, Trash2,
  ChefHat, CheckCircle, RefreshCw
} from "lucide-react";
import "./style.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://homy-b5e6.onrender.com/api";

function App() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({});
  const [page, setPage] = useState("shop");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [authMode, setAuthMode] = useState("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("homy-session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        setToken(session.token || "");
        setUser(session.user || null);
      } catch {
        localStorage.removeItem("homy-session");
      }
    }
    loadProducts();
  }, []);

  async function request(path, options = {}, authToken = token) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(authToken
          ? { Authorization: `Bearer ${authToken}` }
          : {}),
        ...(options.headers || {})
      }
    });

    const data =
      response.status === 204 ? null : await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Request failed");
    }
    return data;
  }

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const data = await request("/products", {}, "");
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => ({
        product: products.find(p => p.id === id),
        quantity
      }))
      .filter(item => item.product);
  }, [cart, products]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.pricePaise * item.quantity,
    0
  );

  const delivery = subtotal === 0 || subtotal >= 49900 ? 0 : 3900;
  const total = subtotal + delivery;
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const visibleProducts = products.filter(product => {
    const matchesType =
      filter === "ALL" || product.type === filter;
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  function add(product) {
    setCart(current => ({
      ...current,
      [product.id]: (current[product.id] || 0) + 1
    }));
    setNotice(`${product.name} added to your bag`);
  }

  function decrease(product) {
    setCart(current => {
      const next = { ...current };
      if ((next[product.id] || 0) <= 1) {
        delete next[product.id];
      } else {
        next[product.id] -= 1;
      }
      return next;
    });
  }

  function removeItem(product) {
    setCart(current => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const path =
        authMode === "register" ? "/auth/register" : "/auth/login";

      const body =
        authMode === "register"
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const data = await request(
        path,
        { method: "POST", body: JSON.stringify(body) },
        ""
      );

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("homy-session", JSON.stringify(data));
      setPage("shop");
      setNotice(`Welcome${data.user?.name ? `, ${data.user.name}` : ""}!`);
      setPassword("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem("homy-session");
    setToken("");
    setUser(null);
    setOrders([]);
    setPage("shop");
    setNotice("You have signed out");
  }

  async function loadOrders() {
    if (!token) {
      setPage("account");
      setNotice("Please sign in to view your orders");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const data = await request("/orders/mine");
      setOrders(Array.isArray(data) ? data : []);
      setPage("orders");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkout(event) {
    event.preventDefault();
    if (!token) {
      setPage("account");
      setNotice("Please create an account or sign in before checkout");
      return;
    }

    if (!cartItems.length) {
      setError("Your bag is empty");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const order = await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          address: address.trim(),
          paymentMethod: "COD",
          items: cartItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
          }))
        })
      });

      setCart({});
      setAddress("");
      setNotice(`Order ${order.orderNumber} placed successfully`);
      await loadOrders();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder(id) {
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      await request(`/orders/${id}/cancel`, { method: "POST" });
      await loadOrders();
      setNotice("Order cancelled");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const money = paise =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format((paise || 0) / 100);

  function goTo(target) {
    setError("");
    setNotice("");
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app">
      <div className="announcement">
        FRESH MEALS. SIMPLE COOKING. MADE FOR YOUR HOME.
      </div>

      <header className="header">
        <button className="brand" onClick={() => goTo("shop")}>
          hØmy<span>.</span>
        </button>

        <nav className="desktop-nav">
          <button onClick={() => goTo("shop")}>Discover</button>
          <button onClick={() => goTo("shop")}>Our meal kits</button>
          <button onClick={loadOrders}>My orders</button>
        </nav>

        <div className="header-actions">
          <button className="icon-button" onClick={() => goTo("account")} aria-label="Account">
            <User size={19} />
          </button>
          <button className="bag-button" onClick={() => goTo("cart")}>
            <ShoppingBag size={18} />
            <span>Bag</span>
            <b>{cartCount}</b>
          </button>
        </div>
      </header>

      {(error || notice) && (
        <div className={error ? "message error" : "message success"}>
          <span>{error || notice}</span>
          <button onClick={() => { setError(""); setNotice(""); }}>
            <X size={16} />
          </button>
        </div>
      )}

      <main>
        {page === "shop" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow"><Leaf size={15} /> GOOD FOOD, MADE SIMPLE</div>
                <h1>Your kitchen,<br />with a little help.</h1>
                <p>
                  Fresh ingredients. Chef-crafted recipes.
                  A delicious dinner, without the guesswork.
                </p>
                <button className="primary-button" onClick={() =>
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })
                }>
                  Explore meal kits <ArrowRight size={17} />
                </button>
                <div className="hero-points">
                  <span><CheckCircle size={15} /> Fresh ingredients</span>
                  <span><Clock size={15} /> Easy preparation</span>
                </div>
              </div>
              <div className="hero-art">
                <div className="hero-circle">
                  <ChefHat size={92} strokeWidth={1.1} />
                  <span>MADE WITH CARE</span>
                </div>
              </div>
            </section>

            <section className="product-section" id="products">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">THE HØMY COLLECTION</div>
                  <h2>Find your next favourite.</h2>
                  <p>Thoughtful meal kits for everyday cooking.</p>
                </div>
                <div className="search-box">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search meals..."
                  />
                </div>
              </div>

              <div className="filters">
                {[
                  ["ALL", "All kits"],
                  ["VEG", "Vegetarian"],
                  ["NON_VEG", "Non-vegetarian"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={filter === value ? "filter active" : "filter"}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="empty"><RefreshCw className="spin" /> Loading meal kits...</div>
              ) : error && !products.length ? (
                <div className="empty">
                  <p>We couldn't load the menu.</p>
                  <button className="primary-button" onClick={loadProducts}>Try again</button>
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="empty">No meal kits found. Try another search.</div>
              ) : (
                <div className="product-grid">
                  {visibleProducts.map(product => (
                    <article className="product-card" key={product.id}>
                      <div className="product-image">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                        <span className={product.type === "VEG" ? "food-tag veg" : "food-tag nonveg"}>
                          {product.type === "VEG" ? "VEG" : "NON-VEG"}
                        </span>
                      </div>
                      <div className="product-info">
                        <div className="product-meta">
                          <span><Clock size={13} /> {product.prepMinutes} min</span>
                          <span>{product.servings} servings</span>
                        </div>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                        <div className="product-bottom">
                          <strong>{money(product.pricePaise)}</strong>
                          <button className="add-button" onClick={() => add(product)}>
                            <Plus size={16} /> Add
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {page === "cart" && (
          <section className="content-page">
            <div className="eyebrow">YOUR SELECTION</div>
            <h1>Your bag.</h1>
            {!cartItems.length ? (
              <div className="empty">
                <ShoppingBag size={35} />
                <p>Your bag is empty.</p>
                <button className="primary-button" onClick={() => goTo("shop")}>
                  Discover meal kits <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              <div className="checkout-layout">
                <div className="cart-list">
                  {cartItems.map(item => (
                    <div className="cart-item" key={item.product.id}>
                      <img src={item.product.imageUrl} alt="" />
                      <div className="cart-item-info">
                        <h3>{item.product.name}</h3>
                        <p>{money(item.product.pricePaise)}</p>
                        <div className="quantity">
                          <button onClick={() => decrease(item.product)}><Minus size={14} /></button>
                          <b>{item.quantity}</b>
                          <button onClick={() => add(item.product)}><Plus size={14} /></button>
                        </div>
                      </div>
                      <button className="remove-button" onClick={() => removeItem(item.product)} aria-label="Remove">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>

                <form className="summary" onSubmit={checkout}>
                  <h2>Order summary</h2>
                  <div className="summary-line"><span>Subtotal</span><b>{money(subtotal)}</b></div>
                  <div className="summary-line"><span>Delivery</span><b>{delivery ? money(delivery) : "FREE"}</b></div>
                  <div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div>
                  <label className="field-label">Delivery address</label>
                  <textarea
                    required
                    minLength={8}
                    maxLength={500}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="House number, street, area, city, PIN code"
                  />
                  <p className="small-note">Payment method: Cash on delivery</p>
                  <button className="primary-button full" disabled={busy}>
                    {busy ? "Placing order..." : "Place my order"}
                    <ArrowRight size={17} />
                  </button>
                </form>
              </div>
            )}
          </section>
        )}

        {page === "account" && (
          <section className="content-page narrow">
            <div className="eyebrow">YOUR HØMY ACCOUNT</div>
            <h1>{user ? "Hello again." : "Welcome home."}</h1>
            {user ? (
              <div className="account-card">
                <div className="account-avatar"><User size={28} /></div>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <button className="primary-button full" onClick={loadOrders}>View my orders</button>
                <button className="secondary-button full" onClick={signOut}><LogOut size={16} /> Sign out</button>
              </div>
            ) : (
              <form className="auth-card" onSubmit={submitAuth}>
                <div className="auth-tabs">
                  <button type="button" className={authMode === "register" ? "selected" : ""} onClick={() => setAuthMode("register")}>Create account</button>
                  <button type="button" className={authMode === "login" ? "selected" : ""} onClick={() => setAuthMode("login")}>Sign in</button>
                </div>
                {authMode === "register" && (
                  <>
                    <label className="field-label">Full name</label>
                    <input required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                  </>
                )}
                <label className="field-label">Email address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                <label className="field-label">Password</label>
                <input required minLength={authMode === "register" ? 8 : 1} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
                <button className="primary-button full" disabled={busy}>
                  {busy ? "Please wait..." : authMode === "register" ? "Create my account" : "Sign in"}
                  <ArrowRight size={17} />
                </button>
                <p className="small-note">Your account is securely managed by HØmy.</p>
              </form>
            )}
          </section>
        )}

        {page === "orders" && (
          <section className="content-page">
            <div className="eyebrow">YOUR ORDER HISTORY</div>
            <h1>My orders.</h1>
            {!token ? (
              <div className="empty">
                <p>Sign in to see your orders.</p>
                <button className="primary-button" onClick={() => goTo("account")}>Sign in</button>
              </div>
            ) : busy ? (
              <div className="empty"><RefreshCw className="spin" /> Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="empty">
                <Package size={35} />
                <p>You haven't placed an order yet.</p>
                <button className="primary-button" onClick={() => goTo("shop")}>Explore meal kits</button>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map(order => (
                  <article className="order-card" key={order.id}>
                    <div className="order-top">
                      <div>
                        <span className="eyebrow">ORDER NUMBER</span>
                        <h3>{order.orderNumber}</h3>
                      </div>
                      <span className={`status status-${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span>
                    </div>
                    <p className="order-date">{new Date(order.createdAt).toLocaleString()}</p>
                    <div className="order-items">
                      {(order.items || []).map(item => (
                        <div key={item.id}>{item.quantity} × {item.productName}</div>
                      ))}
                    </div>
                    <div className="order-bottom">
                      <strong>{money(order.totalPaise)}</strong>
                      {["PLACED", "CONFIRMED"].includes(order.status) && (
                        <button className="cancel-button" disabled={busy} onClick={() => cancelOrder(order.id)}>
                          Cancel order
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="footer-brand">hØmy<span>.</span></div>
        <p>Good food, made simple.</p>
        <div className="footer-links">
          <button onClick={() => goTo("shop")}>Shop</button>
          <button onClick={loadOrders}>Orders</button>
          <button onClick={() => goTo("account")}>Account</button>
        </div>
        <small>© {new Date().getFullYear()} HØmy. All rights reserved.</small>
      </footer>

      <div className="mobile-bottom">
        <button onClick={() => goTo("shop")}><Leaf size={19} /><span>Discover</span></button>
        <button onClick={() => goTo("cart")}><ShoppingBag size={19} /><span>Bag ({cartCount})</span></button>
        <button onClick={loadOrders}><Package size={19} /><span>Orders</span></button>
        <button onClick={() => goTo("account")}><User size={19} /><span>Account</span></button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
