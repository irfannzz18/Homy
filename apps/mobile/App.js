
import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Image, ScrollView,
  StyleSheet, Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

const API = "https://homy-b5e6.onrender.com/api";

const money = value =>
  `₹${(Number(value || 0) / 100).toFixed(2)}`;

const statusName = status => ({
  PREPARING: "Preparing",
  PLACED: "Preparing",
  CONFIRMED: "Preparing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled"
}[status] || "Preparing");

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [screen, setScreen] = useState("home");
  const [selected, setSelected] = useState(null);
  const [orders, setOrders] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [register, setRegister] = useState(false);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);

  async function api(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Something went wrong");
    }
    return result;
  }

  async function loadProducts() {
    try {
      const result = await api("/products");
      setProducts(result.products || []);
    } catch (e) {
      Alert.alert("HØmy", e.message);
    }
  }

  async function loadOrders() {
    if (!token) return;
    try {
      const result = await api("/orders/mine");
      setOrders(result.orders || []);
    } catch (e) {
      Alert.alert("Orders", e.message);
    }
  }

  async function logout() {
    await AsyncStorage.removeItem("homy-token");
    setToken("");
    setUser(null);
    setOrders([]);
    setScreen("home");
  }

  useEffect(() => {
    loadProducts();

    AsyncStorage.getItem("homy-token").then(saved => {
      if (saved) setToken(saved);
    });
  }, []);

  useEffect(() => {
    if (!token) return;

    api("/auth/me")
      .then(result => setUser(result.user))
      .then(loadOrders)
      .catch(() => logout());

    const timer = setInterval(loadOrders, 3000);
    return () => clearInterval(timer);
  }, [token]);

  async function authenticate() {
    setBusy(true);

    try {
      const path = register ? "/auth/register" : "/auth/login";
      const body = register
        ? { name, email, phone, password }
        : { email, password };

      const result = await api(path, {
        method: "POST",
        body: JSON.stringify(body)
      });

      await AsyncStorage.setItem("homy-token", result.token);
      setToken(result.token);
      setUser(result.user);
      setScreen("home");
    } catch (e) {
      Alert.alert("Sign in", e.message);
    } finally {
      setBusy(false);
    }
  }

  function add(id) {
    setCart(old => ({
      ...old,
      [id]: (old[id] || 0) + 1
    }));
  }

  function remove(id) {
    setCart(old => ({
      ...old,
      [id]: Math.max(0, (old[id] || 0) - 1)
    }));
  }

  const items = Object.entries(cart).filter(([, quantity]) => quantity > 0);

  const subtotal = items.reduce((sum, [id, quantity]) => {
    const product = products.find(p => p.id === id);
    return sum + (product ? product.pricePaise * quantity : 0);
  }, 0);

  const delivery = subtotal >= 49900 ? 0 : 3900;
  const shown = products.filter(p => filter === "ALL" || p.type === filter);

  async function getLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Location permission",
          "Please allow location or enter your address manually."
        );
        return;
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const coords = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude
      };

      setLocation(coords);

      const places = await Location.reverseGeocodeAsync(coords);

      if (places.length) {
        const p = places[0];
        setAddress([
          p.name,
          p.street,
          p.district,
          p.city,
          p.region,
          p.postalCode
        ].filter(Boolean).join(", "));
      }
    } catch {
      Alert.alert("Location", "Could not retrieve your location.");
    }
  }

  async function checkout() {
    if (!token) {
      setScreen("account");
      return;
    }

    if (!address.trim()) {
      Alert.alert("Address required", "Please enter your delivery address.");
      return;
    }

    if (!items.length) return;

    setBusy(true);

    try {
      await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          address,
          latitude: location?.latitude,
          longitude: location?.longitude,
          paymentMethod: "COD",
          items: items.map(([productId, quantity]) => ({
            productId,
            quantity
          }))
        })
      });

      setCart({});
      await loadOrders();
      setScreen("orders");

      Alert.alert(
        "Order placed",
        "Your HØmy order has been placed successfully."
      );
    } catch (e) {
      Alert.alert("Checkout", e.message);
    } finally {
      setBusy(false);
    }
  }

  const button = (label, onPress, secondary = false) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondary]}
    >
      <Text style={[
        styles.buttonText,
        secondary && styles.secondaryText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (screen === "account") {
    return (
      <ScrollView contentContainerStyle={styles.auth}>
        <Text style={styles.logo}>HØmy</Text>
        <Text style={styles.heading}>
          {register ? "Create account" : "Welcome back"}
        </Text>

        {register && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {button(
          busy ? "Please wait..." : register ? "Register" : "Sign in",
          authenticate
        )}

        {button(
          register ? "Already have an account? Sign in" : "Create a new account",
          () => setRegister(!register),
          true
        )}

        {button("Back", () => setScreen("home"), true)}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>HØmy</Text>
        <TouchableOpacity onPress={() => setScreen("account")}>
          <Text style={styles.headerLink}>
            {user ? user.name : "Sign in"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navigation}>
        {["home", "cart", "orders"].map(s => (
          <TouchableOpacity key={s} onPress={() => setScreen(s)}>
            <Text style={styles.navText}>
              {s === "home"
                ? "Explore"
                : s === "cart"
                  ? `Cart (${items.length})`
                  : "Orders"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {screen === "home" && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>
              A LITTLE HOME IN EVERY MEAL
            </Text>
            <Text style={styles.heroTitle}>
              South Indian flavours, made simple.
            </Text>
            <Text style={styles.muted}>
              Fresh meal kits delivered to your home.
            </Text>
          </View>

          <View style={styles.filters}>
            {["ALL", "VEG", "NON_VEG"].map(f => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)}>
                <Text style={[
                  styles.filter,
                  filter === f && styles.filterActive
                ]}>
                  {f === "ALL" ? "All" : f === "VEG" ? "Veg" : "Non-veg"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {shown.map(p => (
            <View style={styles.product} key={p.id}>
              <TouchableOpacity onPress={() => {
                setSelected(p);
                setScreen("detail");
              }}>
                <Image
                  source={{ uri: p.imageUrl }}
                  style={styles.productImage}
                />
              </TouchableOpacity>

              <View style={styles.productInfo}>
                <Text style={styles.foodType}>
                  {p.type === "VEG" ? "VEGETARIAN" : "NON-VEGETARIAN"}
                </Text>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.muted}>{p.description}</Text>

                <View style={styles.productBottom}>
                  <Text style={styles.price}>{money(p.pricePaise)}</Text>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => add(p.id)}
                  >
                    <Text style={styles.buttonText}>Add +</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {!shown.length && (
            <Text style={styles.muted}>No meal kits are listed yet.</Text>
          )}
        </ScrollView>
      )}

      {screen === "detail" && selected && (
        <ScrollView contentContainerStyle={styles.content}>
          <Image
            source={{ uri: selected.imageUrl }}
            style={styles.detailImage}
          />

          <Text style={styles.heading}>{selected.name}</Text>
          <Text style={styles.muted}>{selected.description}</Text>
          <Text style={styles.price}>{money(selected.pricePaise)}</Text>

          <Text style={styles.subheading}>Inside the kit</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(selected.images || []).map(img => (
              <Image
                key={img.id}
                source={{ uri: img.imageUrl }}
                style={styles.slideImage}
              />
            ))}
          </ScrollView>

          {(selected.ingredients || []).map(item => (
            <View style={styles.ingredient} key={item.id}>
              <Text>{item.name}</Text>
              <Text style={styles.muted}>{item.quantity}</Text>
            </View>
          ))}

          {button("Add to cart", () => {
            add(selected.id);
            setScreen("cart");
          })}

          {button("Back to meals", () => setScreen("home"), true)}
        </ScrollView>
      )}

      {screen === "cart" && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Your cart</Text>

          {items.map(([id, quantity]) => {
            const p = products.find(x => x.id === id);
            if (!p) return null;

            return (
              <View key={id} style={styles.cartRow}>
                <Image
                  source={{ uri: p.imageUrl }}
                  style={styles.cartImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text>{money(p.pricePaise)}</Text>
                </View>
                <TouchableOpacity onPress={() => remove(id)}>
                  <Text style={styles.quantity}>−</Text>
                </TouchableOpacity>
                <Text>{quantity}</Text>
                <TouchableOpacity onPress={() => add(id)}>
                  <Text style={styles.quantity}>+</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={styles.heading}>Subtotal: {money(subtotal)}</Text>
          <Text style={styles.muted}>
            Delivery: {delivery === 0 ? "Free" : money(delivery)}
          </Text>
          <Text style={styles.heading}>
            Total: {money(subtotal + delivery)}
          </Text>

          {button("Continue", () => setScreen("checkout"))}
        </ScrollView>
      )}

      {screen === "checkout" && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Delivery address</Text>

          <TextInput
            style={[styles.input, styles.addressInput]}
            placeholder="House, street, area, city, PIN code"
            multiline
            value={address}
            onChangeText={setAddress}
          />

          {button("Use current location", getLocation, true)}

          <Text style={styles.subheading}>Payment</Text>
          <Text style={styles.muted}>Cash on delivery</Text>

          <Text style={styles.heading}>
            Total: {money(subtotal + delivery)}
          </Text>

          {button(
            busy ? "Placing order..." : "Place order",
            checkout
          )}
        </ScrollView>
      )}

      {screen === "orders" && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Your orders</Text>

          {!token && button(
            "Sign in to view orders",
            () => setScreen("account")
          )}

          {orders.map(o => (
            <View style={styles.order} key={o.id}>
              <Text style={styles.productName}>{o.orderNumber}</Text>
              <Text style={styles.foodType}>{statusName(o.status)}</Text>
              <Text>{money(o.totalPaise)} · {o.paymentMethod}</Text>
              <Text style={styles.muted}>{o.address}</Text>

              {o.deliveryOtp && o.status !== "DELIVERED" && (
                <View style={styles.otpCard}>
                  <Text style={styles.otpTitle}>Delivery OTP</Text>
                  <Text style={styles.otpNumber}>{o.deliveryOtp}</Text>
                  <Text style={styles.muted}>
                    Share this code with the delivery partner only when your order arrives.
                  </Text>
                </View>
              )}

              {o.assignedPartner?.user?.phone && (
                <Text style={styles.muted}>
                  Partner phone: {o.assignedPartner.user.phone}
                </Text>
              )}

              {["PLACED", "CONFIRMED"].includes(o.status) &&
                button("Cancel order", async () => {
                  try {
                    await api(`/orders/${o.id}/cancel`, {
                      method: "POST"
                    });
                    await loadOrders();
                  } catch (e) {
                    Alert.alert("Cancel order", e.message);
                  }
                }, true)}
            </View>
          ))}
        </ScrollView>
      )}

      {user && button("Sign out", logout, true)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6ed" },
  header: {
    padding: 18,
    paddingTop: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  logo: {
    fontSize: 32,
    fontWeight: "900",
    color: "#536c48",
    letterSpacing: -2
  },
  headerLink: { color: "#536c48", fontWeight: "700" },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: "#e9efdc"
  },
  navText: { color: "#40533b", fontWeight: "700" },
  content: { padding: 17, paddingBottom: 40 },
  hero: {
    backgroundColor: "#e9efdc",
    padding: 24,
    borderRadius: 22,
    marginBottom: 20
  },
  eyebrow: {
    color: "#819072",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800"
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#293c2d",
    marginVertical: 12
  },
  heading: {
    fontSize: 25,
    fontWeight: "800",
    color: "#293c2d",
    marginVertical: 15
  },
  subheading: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 10,
    color: "#293c2d"
  },
  muted: { color: "#77816f", lineHeight: 20 },
  filters: { flexDirection: "row", gap: 15, marginBottom: 15 },
  filter: {
    padding: 10,
    borderRadius: 10,
    color: "#536c48",
    backgroundColor: "#e8eddf"
  },
  filterActive: { backgroundColor: "#536c48", color: "white" },
  product: {
    backgroundColor: "#fffef9",
    borderRadius: 17,
    overflow: "hidden",
    marginBottom: 18
  },
  productImage: { width: "100%", height: 220 },
  productInfo: { padding: 16 },
  foodType: {
    color: "#819072",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1
  },
  productName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#293c2d",
    marginVertical: 5
  },
  productBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12
  },
  price: { fontSize: 19, fontWeight: "800", color: "#405b3b" },
  smallButton: { backgroundColor: "#536c48", padding: 10, borderRadius: 10 },
  button: {
    backgroundColor: "#536c48",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 8
  },
  buttonText: { color: "white", fontWeight: "800" },
  secondary: { backgroundColor: "#e8eddf" },
  secondaryText: { color: "#40533b" },
  detailImage: { width: "100%", height: 260, borderRadius: 17 },
  slideImage: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginRight: 10
  },
  ingredient: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e8ebdf"
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12
  },
  cartImage: { width: 65, height: 60, borderRadius: 10 },
  quantity: { fontSize: 24, color: "#536c48", paddingHorizontal: 5 },
  order: {
    backgroundColor: "#fffef9",
    padding: 18,
    borderRadius: 14,
    marginVertical: 8
  },
  otpCard: {
    backgroundColor: "#e9efdc",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 7
  },
  otpTitle: { color: "#405b3b", fontWeight: "800" },
  otpNumber: {
    color: "#293c2d",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 5
  },
  input: {
    backgroundColor: "#fffef9",
    borderWidth: 1,
    borderColor: "#dce2d2",
    padding: 14,
    borderRadius: 11,
    marginVertical: 8
  },
  addressInput: { minHeight: 100, textAlignVertical: "top" },
  auth: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#f5f6ed"
  }
});
        
