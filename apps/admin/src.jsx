import React, {
  useEffect,
  useState
} from "react";

import {
  createRoot
} from "react-dom/client";

import "./style.css";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000/api";

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("homy-admin-token") || ""
  );

  const [email, setEmail] =
    useState("admin@homy.local");

  const [password, setPassword] =
    useState("");

  const [summary, setSummary] =
    useState(null);

  const [orders, setOrders] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [error, setError] =
    useState("");

  async function call(path, opts = {}) {
    const response = await fetch(API + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: "Bearer " + token
            }
          : {}),
        ...(opts.headers || {})
      }
    });

    const data =
      response.status === 204
        ? null
        : await response.json();

    if (!response.ok) {
      throw Error(
        data?.error || "Request failed"
      );
    }

    return data;
  }

  async function load() {
    try {
      const [s, o, p] =
        await Promise.all([
          call("/admin/summary"),
          call("/admin/orders"),
          call("/products")
        ]);

      setSummary(s);
      setOrders(o);
      setProducts(p);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  async function login(e) {
    e.preventDefault();
    setError("");

    try {
      const data = await call(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      if (data.user.role !== "ADMIN") {
        throw Error(
          "This account is not an admin"
        );
      }

      localStorage.setItem(
        "homy-admin-token",
        data.token
      );

      setToken(data.token);
    } catch (e) {
      setError(e.message);
    }
  }

  async function status(id, status) {
    try {
      await call(
        "/admin/orders/" +
          id +
          "/status",
        {
          method: "PATCH",
          body: JSON.stringify({
            status
          })
        }
      );

      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function logout() {
    localStorage.removeItem(
      "homy-admin-token"
    );

    setToken("");
    setSummary(null);
  }

  if (!token) {
    return (
      <main className="login">
        <div className="mark">
          h<span>Ø</span>my
        </div>

        <p className="eyebrow">
          THE KITCHEN CONSOLE
        </p>

        <h1>Welcome back.</h1>

        <p className="muted">
          Sign in to manage the HØmy kitchen.
        </p>

        <form onSubmit={login}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />
          </label>

          <button>Sign in</button>
        </form>

        {error && (
          <p className="error">
            {error}
          </p>
        )}
      </main>
    );
  }

  return (
    <div className="shell">
      <aside>
        <div className="mark">
          h<span>Ø</span>my
        </div>

        <small>ADMIN STUDIO</small>

        <div className="nav active">
          Overview
        </div>

        <div className="nav">
          Orders
        </div>

        <div className="nav">
          Menu & kits
        </div>

        <div className="nav">
          Customers
        </div>

        <button
          className="ghost"
          onClick={logout}
        >
          Sign out
        </button>
      </aside>

      <main className="content">
        <header>
          <div>
            <p className="eyebrow">
              YOUR DAILY DASHBOARD
            </p>

            <h1>
              Good food, well managed.
            </h1>
          </div>

          <div className="avatar">H</div>
        </header>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <section className="stats">
          {[
            [
              "Total orders",
              summary?.orders ?? "—"
            ],
            [
              "Active kits",
              summary?.activeProducts ?? "—"
            ],
            [
              "Customers",
              summary?.customers ?? "—"
            ],
            [
              "Delivered revenue",
              summary
                ? `₹${(
                    summary.revenuePaise / 100
                  ).toLocaleString("en-IN")}`
                : "—"
            ]
          ].map(([key, value]) => (
            <article
              className="stat"
              key={key}
            >
              <span>{key}</span>
              <strong>{value}</strong>
              <i>Live data</i>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="panelhead">
            <div>
              <p className="eyebrow">
                KITCHEN ACTIVITY
              </p>

              <h2>Recent orders</h2>
            </div>

            <button
              className="light"
              onClick={load}
            >
              Refresh
            </button>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Update</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b>
                        {order.orderNumber}
                      </b>

                      <small>
                        {new Date(
                          order.createdAt
                        ).toLocaleString()}
                      </small>
                    </td>

                    <td>
                      {order.user?.name}

                      <small>
                        {order.user?.email}
                      </small>
                    </td>

                    <td>
                      ₹
                      {(
                        order.totalPaise / 100
                      ).toFixed(2)}
                    </td>

                    <td>
                      <span
                        className={
                          "pill " +
                          order.status.toLowerCase()
                        }
                      >
                        {order.status.replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </td>

                    <td>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          status(
                            order.id,
                            e.target.value
                          )
                        }
                      >
                        <option
                          value={order.status}
                        >
                          {order.status}
                        </option>

                        {({
                          PLACED: [
                            "CONFIRMED",
                            "CANCELLED"
                          ],
                          CONFIRMED: [
                            "PREPARING",
                            "CANCELLED"
                          ],
                          PREPARING: [
                            "OUT_FOR_DELIVERY"
                          ],
                          OUT_FOR_DELIVERY: [
                            "DELIVERED"
                          ],
                          DELIVERED: [],
                          CANCELLED: []
                        })[
                          order.status
                        ]?.map((next) => (
                          <option key={next}>
                            {next}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!orders.length && (
              <p className="empty">
                Orders will appear here when
                customers check out.
              </p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelhead">
            <div>
              <p className="eyebrow">
                MENU PREVIEW
              </p>

              <h2>
                Available meal kits
              </h2>
            </div>
          </div>

          <div className="products">
            {products.map((product) => (
              <article key={product.id}>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                />

                <div>
                  <span className="pill">
                    {product.type === "VEG"
                      ? "VEGETARIAN"
                      : "NON-VEG"}
                  </span>

                  <h3>{product.name}</h3>

                  <p>
                    ₹
                    {(
                      product.pricePaise / 100
                    ).toFixed(0)}
                    {" · "}
                    {product.servings} servings
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);
