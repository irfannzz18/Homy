import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import AsyncStorage from
  "@react-native-async-storage/async-storage";

const API =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://homy-b5e6.onrender.com/api";

const green = "#183b2b";
const cream = "#f6f6f0";
const lime = "#d8edaa";

const money = (n) =>
  "₹" + (n / 100).toFixed(0);

export default function App() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [cart, setCart] = useState({});
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  async function api(path, opts = {}) {
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
        data?.error || "Something went wrong"
      );
    }

    return data;
  }

  useEffect(() => {
    (async () => {
      try {
        const saved =
          await AsyncStorage.getItem(
            "homy-session"
          );

        if (saved) {
          const session = JSON.parse(saved);

          setToken(session.token);
          setUser(session.user);
        }

        const response = await fetch(
          API + "/products"
        );

        setProducts(await response.json());
      } catch (e) {
        Alert.alert(
          "Connection issue",
          "Check that HØmy API is running and EXPO_PUBLIC_API_URL points to it."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => ({
          product: products.find(
            (p) => p.id === id
          ),
          quantity
        }))
        .filter((x) => x.product),
    [cart, products]
  );

  const subtotal = cartItems.reduce(
    (sum, item) =>
      sum +
      item.product.pricePaise *
        item.quantity,
    0
  );

  const delivery =
    subtotal >= 49900 ? 0 : 3900;

  function add(product) {
    setCart((current) => ({
      ...current,
      [product.id]:
        (current[product.id] || 0) + 1
    }));
  }

  function remove(product) {
    setCart((current) => {
      const next = { ...current };

      if (next[product.id] <= 1) {
        delete next[product.id];
      } else {
        next[product.id]--;
      }

      return next;
    });
  }

  async function login() {
    try {
      const data = await api(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      setToken(data.token);
      setUser(data.user);

      await AsyncStorage.setItem(
        "homy-session",
        JSON.stringify(data)
      );

      setPage("home");
    } catch (e) {
      Alert.alert(
        "Sign in failed",
        e.message
      );
    }
  }

  async function register() {
    try {
      const data = await api(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            password
          })
        }
      );

      setToken(data.token);
      setUser(data.user);

      await AsyncStorage.setItem(
        "homy-session",
        JSON.stringify(data)
      );

      setPage("home");
    } catch (e) {
      Alert.alert(
        "Could not create account",
        e.message
      );
    }
  }

  async function checkout() {
    if (!token) {
      setPage("account");

      Alert.alert(
        "Sign in required",
        "Create an account or sign in to place your order."
      );

      return;
    }

    if (address.trim().length < 8) {
      Alert.alert(
        "Delivery address",
        "Enter your complete delivery address."
      );

      return;
    }

    try {
      const order = await api(
        "/orders",
        {
          method: "POST",
          body: JSON.stringify({
            address,
            paymentMethod: "COD",
            items: cartItems.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity
            }))
          })
        }
      );

      setCart({});

      Alert.alert(
        "Order placed",
        `Order ${order.orderNumber} is confirmed. Pay cash on delivery.`
      );

      setPage("orders");
    } catch (e) {
      Alert.alert(
        "Checkout failed",
        e.message
      );
    }
  }

  async function loadOrders() {
    if (!token) {
      setPage("account");
      return;
    }

    try {
      setOrders(
        await api("/orders/mine")
      );

      setPage("orders");
    } catch (e) {
      Alert.alert(
        "Orders unavailable",
        e.message
      );
    }
  }

  async function cancel(id) {
    try {
      await api(
        `/orders/${id}/cancel`,
        {
          method: "POST"
        }
      );

      await loadOrders();
    } catch (e) {
      Alert.alert(
        "Cancellation unavailable",
        e.message
      );
    }
  }

  function signout() {
    setToken("");
    setUser(null);

    AsyncStorage.removeItem(
      "homy-session"
    );

    setPage("home");
  }

  function button(
    label,
    onPress,
    style = {}
  ) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          {
            backgroundColor: green,
            padding: 14,
            borderRadius: 14,
            alignItems: "center"
          },
          style
        ]}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "800"
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function nav(label, target) {
    return (
      <TouchableOpacity
        onPress={() =>
          target === "orders"
            ? loadOrders()
            : setPage(target)
        }
        style={{
          paddingVertical: 9,
          paddingHorizontal: 12
        }}
      >
        <Text
          style={{
            color:
              page === target
                ? green
                : "#849084",
            fontWeight: "700"
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: cream
        }}
      >
        <ActivityIndicator
          size="large"
          color={green}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: cream
      }}
    >
      <StatusBar barStyle="dark-content" />

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <Text
          style={{
            fontSize: 29,
            fontWeight: "900",
            letterSpacing: -1.5,
            color: green
          }}
        >
          hØmy
          <Text
            style={{
              color: "#91ad66"
            }}
          >
            .
          </Text>
        </Text>

        <TouchableOpacity
          onPress={() => setPage("cart")}
          style={{
            backgroundColor: "#e8eddf",
            padding: 11,
            borderRadius: 15
          }}
        >
          <Text
            style={{
              color: green,
              fontWeight: "800"
            }}
          >
            Bag ·{" "}
            {Object.values(cart).reduce(
              (sum, quantity) =>
                sum + quantity,
              0
            )}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 10,
          justifyContent: "space-around",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e9de"
        }}
      >
        {nav("Discover", "home")}
        {nav("My orders", "orders")}
        {nav(
          user
            ? user.name.split(" ")[0]
            : "Account",
          "account"
        )}
      </View>

      {page === "home" && (
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 40
          }}
        >
          <View
            style={{
              backgroundColor: "#dfe9cf",
              borderRadius: 24,
              padding: 22,
              marginBottom: 22
            }}
          >
            <Text
              style={{
                color: "#667b53",
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 2
              }}
            >
              GOOD FOOD, MADE SIMPLE
            </Text>

            <Text
              style={{
                fontSize: 31,
                fontWeight: "900",
                color: green,
                letterSpacing: -1,
                marginTop: 9
              }}
            >
              Your kitchen,
              {"\n"}
              with a little help.
            </Text>

            <Text
              style={{
                color: "#5f7254",
                marginTop: 8,
                lineHeight: 21
              }}
            >
              Fresh ingredients. Chef-crafted
              recipes. A delicious dinner,
              without the guesswork.
            </Text>

            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 14,
                backgroundColor: green,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 7
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "800"
                }}
              >
                From ₹219 · 20 min
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 9,
              marginBottom: 17
            }}
          >
            {["ALL", "VEG", "NON_VEG"].map(
              (type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() =>
                    setFilter(type)
                  }
                  style={{
                    backgroundColor:
                      filter === type
                        ? green
                        : "#fff",
                    paddingHorizontal: 17,
                    paddingVertical: 10,
                    borderRadius: 30
                  }}
                >
                  <Text
                    style={{
                      color:
                        filter === type
                          ? "white"
                          : green,
                      fontWeight: "800",
                      fontSize: 12
                    }}
                  >
                    {type === "NON_VEG"
                      ? "NON-VEG"
                      : type === "ALL"
                      ? "All kits"
                      : "Veg"}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          <Text
            style={{
              fontSize: 23,
              fontWeight: "900",
              color: green,
              marginBottom: 15
            }}
          >
            The weeknight favourites
          </Text>

          {products
            .filter(
              (product) =>
                filter === "ALL" ||
                product.type === filter
            )
            .map((product) => (
              <View
                key={product.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: 20,
                  overflow: "hidden",
                  marginBottom: 15,
                  borderWidth: 1,
                  borderColor: "#ebeee5"
                }}
              >
                <Image
                  source={{
                    uri: product.imageUrl
                  }}
                  style={{
                    height: 175,
                    backgroundColor: "#e7e9df"
                  }}
                />

                <View
                  style={{
                    padding: 16
                  }}
                >
                  <Text
                    style={{
                      color: "#83916e",
                      fontSize: 10,
                      fontWeight: "900",
                      letterSpacing: 1.4
                    }}
                  >
                    {product.type === "VEG"
                      ? "PLANT-LOVING"
                      : "MEAT & SEAFOOD"}
                    {" · "}
                    {product.prepMinutes} MIN
                  </Text>

                  <Text
                    style={{
                      fontSize: 19,
                      fontWeight: "900",
                      color: green,
                      marginTop: 6
                    }}
                  >
                    {product.name}
                  </Text>

                  <Text
                    style={{
                      color: "#7a887b",
                      lineHeight: 19,
                      marginTop: 5
                    }}
                  >
                    {product.description}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 14
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 19,
                        fontWeight: "900",
                        color: green
                      }}
                    >
                      {money(
                        product.pricePaise
                      )}

                      <Text
                        style={{
                          fontSize: 11,
                          color: "#7c8c7c"
                        }}
                      >
                        {" · "}
                        {product.servings} servings
                      </Text>
                    </Text>

                    {button(
                      cart[product.id]
                        ? `Add more (${cart[product.id]})`
                        : "Add kit",
                      () => add(product),
                      {
                        paddingHorizontal: 20
                      }
                    )}
                  </View>
                </View>
              </View>
            ))}
        </ScrollView>
      )}

      {page === "cart" && (
        <ScrollView
          contentContainerStyle={{
            padding: 20
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "900",
              color: green,
              marginBottom: 20
            }}
          >
            Your bag
          </Text>

          {cartItems.map((item) => (
            <View
              key={item.product.id}
              style={{
                backgroundColor: "white",
                padding: 15,
                borderRadius: 17,
                marginBottom: 12,
                flexDirection: "row",
                justifyContent: "space-between"
              }}
            >
              <View
                style={{
                  flex: 1
                }}
              >
                <Text
                  style={{
                    fontWeight: "800",
                    color: green
                  }}
                >
                  {item.product.name}
                </Text>

                <Text
                  style={{
                    color: "#7d8a7b",
                    marginTop: 5
                  }}
                >
                  {money(
                    item.product.pricePaise
                  )}{" "}
                  each
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    remove(item.product)
                  }
                >
                  <Text
                    style={{
                      fontSize: 22,
                      color: green
                    }}
                  >
                    −
                  </Text>
                </TouchableOpacity>

                <Text
                  style={{
                    fontWeight: "800"
                  }}
                >
                  {item.quantity}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    add(item.product)
                  }
                >
                  <Text
                    style={{
                      fontSize: 22,
                      color: green
                    }}
                  >
                    ＋
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {!cartItems.length && (
            <Text
              style={{
                color: "#7b887c"
              }}
            >
              Your bag is ready for something
              delicious.
            </Text>
          )}

          <View
            style={{
              backgroundColor: "white",
              padding: 18,
              borderRadius: 18,
              marginTop: 10
            }}
          >
            <Text
              style={{
                color: green
              }}
            >
              Subtotal{"   "}
              {money(subtotal)}
            </Text>

            <Text
              style={{
                color: green,
                marginTop: 8
              }}
            >
              Delivery{"   "}
              {delivery
                ? money(delivery)
                : "FREE"}
            </Text>

            <Text
              style={{
                fontWeight: "900",
                fontSize: 20,
                color: green,
                marginTop: 14
              }}
            >
              Total{"   "}
              {money(
                subtotal + delivery
              )}
            </Text>

            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Full delivery address"
              multiline
              style={{
                marginTop: 18,
                borderWidth: 1,
                borderColor: "#e4e8df",
                borderRadius: 12,
                padding: 13,
                minHeight: 75,
                textAlignVertical: "top"
              }}
            />

            <Text
              style={{
                fontSize: 11,
                color: "#879387",
                marginVertical: 12
              }}
            >
              Cash on delivery · Free delivery
              over ₹499
            </Text>

            {button(
              "Place order",
              checkout,
              {
                marginTop: 3
              }
            )}
          </View>
        </ScrollView>
      )}

      {page === "account" && (
        <ScrollView
          contentContainerStyle={{
            padding: 22
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "900",
              color: green,
              marginBottom: 8
            }}
          >
            {user
              ? "Your account"
              : "Welcome to HØmy"}
          </Text>

          {user ? (
            <>
              <Text
                style={{
                  color: "#7a897c",
                  marginBottom: 18
                }}
              >
                {user.name} · {user.email}
              </Text>

              {button(
                "Sign out",
                signout
              )}
            </>
          ) : (
            <>
              <Text
                style={{
                  color: "#7a897c",
                  marginBottom: 18
                }}
              >
                Sign in to check out and keep
                track of your meals.
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name (for new account)"
                style={field}
              />

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                autoCapitalize="none"
                keyboardType="email-address"
                style={field}
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password (8+ characters)"
                secureTextEntry
                style={field}
              />

              {button(
                "Create account",
                register,
                {
                  marginTop: 8
                }
              )}

              {button(
                "Sign in",
                login,
                {
                  marginTop: 10,
                  backgroundColor: "#73866d"
                }
              )}
            </>
          )}
        </ScrollView>
      )}

      {page === "orders" && (
        <ScrollView
          contentContainerStyle={{
            padding: 20
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "900",
              color: green,
              marginBottom: 18
            }}
          >
            Your orders
          </Text>

          {orders.map((order) => (
            <View
              key={order.id}
              style={{
                backgroundColor: "white",
                padding: 17,
                borderRadius: 18,
                marginBottom: 12
              }}
            >
              <Text
                style={{
                  fontWeight: "900",
                  color: green
                }}
              >
                {order.orderNumber}
              </Text>

              <Text
                style={{
                  color: "#819081",
                  marginTop: 5
                }}
              >
                {new Date(
                  order.createdAt
                ).toLocaleString()}
              </Text>

              <Text
                style={{
                  fontWeight: "800",
                  marginTop: 10
                }}
              >
                {order.status.replaceAll(
                  "_",
                  " "
                )}
                {" · "}
                {money(order.totalPaise)}
              </Text>

              {order.items.map((item) => (
                <Text
                  key={item.id}
                  style={{
                    color: "#718071",
                    marginTop: 4
                  }}
                >
                  {item.quantity} ×{" "}
                  {item.productName}
                </Text>
              ))}

              {[
                "PLACED",
                "CONFIRMED"
              ].includes(order.status) && (
                <TouchableOpacity
                  onPress={() =>
                    cancel(order.id)
                  }
                  style={{
                    marginTop: 12,
                    alignSelf: "flex-start"
                  }}
                >
                  <Text
                    style={{
                      color: "#a64b3d",
                      fontWeight: "800"
                    }}
                  >
                    Cancel order
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {!orders.length && (
            <Text
              style={{
                color: "#7c897d"
              }}
            >
              No orders yet. Your next
              favourite meal is waiting.
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const field = {
  backgroundColor: "white",
  borderWidth: 1,
  borderColor: "#e5e9df",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12
};
  
