const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "db",
});

db.connect((err) => {
  if (err) console.error("Database connection failed: ", err);
  else console.log("Connected to MySQL database");
});

// ------------------ AUTH ------------------

// Register
app.post("/register", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if (!email || !password || !confirmPassword)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });

    if (password !== confirmPassword)
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });

    if (password.length < 6)
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });

    db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        if (err)
          return res
            .status(500)
            .json({ success: false, message: "Server error" });
        if (results.length > 0)
          return res
            .status(400)
            .json({ success: false, message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        db.execute(
          "INSERT INTO users (email, password) VALUES (?, ?)",
          [email, hashedPassword],
          (err, results) => {
            if (err)
              return res
                .status(500)
                .json({ success: false, message: "Error creating account" });
            res.status(201).json({
              success: true,
              message: "Account created",
              userId: results.insertId,
            });
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Login
app.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });

    db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        if (err)
          return res
            .status(500)
            .json({ success: false, message: "Server error" });
        if (results.length === 0)
          return res
            .status(400)
            .json({ success: false, message: "User not found" });

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid)
          return res
            .status(400)
            .json({ success: false, message: "Invalid password" });

        res.json({
          success: true,
          message: "Login successful",
          user: { id: user.id, email: user.email },
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get all users
app.get("/users", (req, res) => {
  db.execute(
    "SELECT id, email, created_at FROM users ORDER BY created_at DESC",
    (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Error fetching users" });
      res.json({ success: true, users: results });
    }
  );
});

// ------------------ ITEMS ------------------

// Get all items
app.get("/items", (req, res) => {
  db.execute("SELECT * FROM items ORDER BY created_at DESC", (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json(results);
  });
});

// Add item
app.post("/items", (req, res) => {
  const { name, category, price, image } = req.body;
  if (!name || !category || !price || !image)
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });

  db.execute(
    "INSERT INTO items (name, category, price, image) VALUES (?, ?, ?, ?)",
    [name, category, price, image],
    (err, results) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res
        .status(201)
        .json({ id: results.insertId, name, category, price, image });
    }
  );
});

// Update item
app.put("/items/:id", (req, res) => {
  const { id } = req.params;
  const { name, category, price, image } = req.body;
  db.execute(
    "UPDATE items SET name = ?, category = ?, price = ?, image = ? WHERE id = ?",
    [name, category, price, image, id],
    (err) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Item updated" });
    }
  );
});

// Delete item
app.delete("/items/:id", (req, res) => {
  const { id } = req.params;
  db.execute("DELETE FROM items WHERE id = ?", [id], (err) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: "Item deleted" });
  });
});

// ------------------ ORDERS ------------------

// Save order - FIXED VERSION
app.post("/orders", (req, res) => {
  const {
    userId,
    paidAmount, // Changed from paymentAmount to paidAmount
    total,
    discountApplied,
    changeAmount,
    orderType,
  } = req.body;

  console.log("Received order data:", req.body);

  if (!userId || paidAmount === undefined || paidAmount === null) {
    return res.status(400).json({
      message: "Invalid order data: userId and paidAmount are required",
      received: req.body,
    });
  }

  const query = `
    INSERT INTO orders (userId, paidAmount, total, discountApplied, changeAmount, orderType)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      userId,
      paidAmount,
      total || 0,
      discountApplied ? 1 : 0,
      changeAmount || 0,
      orderType || "Dine In",
    ],
    (err, result) => {
      if (err) {
        console.error("Failed to save order:", err);
        return res.status(500).json({ message: "Failed to save order" });
      }
      res.status(200).json({
        message: "Order saved successfully",
        orderId: result.insertId,
      });
    }
  );
});

// ------------------ Test ------------------
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running!",
    endpoints: {
      register: "POST /register",
      login: "POST /login",
      users: "GET /users",
      items: "GET /items",
      orders: "POST /orders",
    },
  });
});

// Start server
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
