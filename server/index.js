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

// Register - FIXED VERSION
app.post("/register", async (req, res) => {
  try {
    const { email, password, confirmPassword, role, status } = req.body;

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

        // Use role and status from request, or default values
        const userRole = role || "cashier";
        const userStatus = status || "Active";

        db.execute(
          "INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)",
          [email, hashedPassword, userRole, userStatus],
          (err, results) => {
            if (err) {
              console.error("Error creating account:", err);
              return res
                .status(500)
                .json({ success: false, message: "Error creating account" });
            }
            res.status(201).json({
              success: true,
              message: "Account created successfully",
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

// Login - UPDATED TO INCLUDE ROLE
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
          user: {
            id: user.id,
            email: user.email,
            role: user.role || "cashier",
            status: user.status || "Active",
          },
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get all users - FIXED VERSION
app.get("/users", (req, res) => {
  db.execute(
    "SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res
          .status(500)
          .json({ success: false, message: "Error fetching users" });
      }
      res.json({ success: true, users: results });
    }
  );
});

// Update user - NEW ENDPOINT
app.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const { email, role, status } = req.body;

  if (!email || !role || !status) {
    return res.status(400).json({
      success: false,
      message: "Email, role, and status are required",
    });
  }

  db.execute(
    "UPDATE users SET email = ?, role = ?, status = ? WHERE id = ?",
    [email, role, status, id],
    (err, results) => {
      if (err) {
        console.error("Error updating user:", err);
        return res.status(500).json({
          success: false,
          message: "Error updating user",
        });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "User updated successfully",
      });
    }
  );
});

// Delete user - NEW ENDPOINT
app.delete("/users/:id", (req, res) => {
  const { id } = req.params;

  db.execute("DELETE FROM users WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error deleting user:", err);
      return res.status(500).json({
        success: false,
        message: "Error deleting user",
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  });
});

// ------------------ ANNOUNCEMENTS ------------------

// Get all announcements - NEW ENDPOINT
app.get("/announcements", (req, res) => {
  db.execute(
    "SELECT * FROM announcements ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("Error fetching announcements:", err);
        return res.status(500).json({
          success: false,
          message: "Error fetching announcements",
        });
      }
      res.json({ success: true, announcements: results });
    }
  );
});

// Create announcement - NEW ENDPOINT
app.post("/announcements", (req, res) => {
  const { title, message, type } = req.body;

  if (!title || !message || !type) {
    return res.status(400).json({
      success: false,
      message: "Title, message, and type are required",
    });
  }

  db.execute(
    "INSERT INTO announcements (title, message, type) VALUES (?, ?, ?)",
    [title, message, type],
    (err, results) => {
      if (err) {
        console.error("Error creating announcement:", err);
        return res.status(500).json({
          success: false,
          message: "Error creating announcement",
        });
      }

      res.status(201).json({
        success: true,
        message: "Announcement created successfully",
        announcementId: results.insertId,
      });
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

// Get all orders - NEW ENDPOINT
app.get("/orders", (req, res) => {
  const query = `
    SELECT 
      o.*,
      u.email as cashier
    FROM orders o
    LEFT JOIN users u ON o.userId = u.id
    ORDER BY o.created_at DESC
  `;
  
  db.execute(query, (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching orders"
      });
    }
    
    console.log(`Fetched ${results.length} orders from database`);
    res.json(results);
  });
});

// Save order - FIXED VERSION
app.post("/orders", (req, res) => {
  const {
    userId,
    paidAmount,
    total,
    discountApplied,
    changeAmount,
    orderType,
    productNames,
    items,
  } = req.body;

  console.log("Received order data:", req.body);

  if (!userId || paidAmount === undefined || paidAmount === null) {
    return res.status(400).json({
      message: "Invalid order data: userId and paidAmount are required",
      received: req.body,
    });
  }

  // FIXED: Ensure we have default values
  const query = `
    INSERT INTO orders (userId, paidAmount, total, discountApplied, changeAmount, orderType, productNames, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      userId,
      paidAmount || 0,
      total || 0,
      discountApplied ? 1 : 0,
      changeAmount || 0,
      orderType || "Dine In",
      productNames || "No items", // Default value if null
      items || "[]", // Default value if null
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

// ------------------ STORE HOURS ------------------

// Log store open/close action
app.post("/store-hours/log-store-action", async (req, res) => {
  try {
    const { userId, userEmail, action } = req.body;

    if (!userId || !userEmail || !action) {
      return res.status(400).json({
        error: "Missing required fields: userId, userEmail, action",
      });
    }

    if (!["open", "close"].includes(action)) {
      return res
        .status(400)
        .json({ error: 'Invalid action. Must be "open" or "close"' });
    }

    const query = `
      INSERT INTO store_hours_logs (user_id, user_email, action) 
      VALUES (?, ?, ?)
    `;

    db.query(query, [userId, userEmail, action], (err, result) => {
      if (err) {
        console.error("Error logging store action:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      res.json({
        success: true,
        message: `Store ${action} logged successfully`,
        logId: result.insertId,
      });
    });
  } catch (error) {
    console.error("Error logging store action:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get store action history
app.get("/store-hours/store-action-history", async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM store_hours_logs 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;

    db.query(query, [parseInt(limit), parseInt(offset)], (err, logs) => {
      if (err) {
        console.error("Error fetching store action history:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      // Get total count for pagination
      db.query(
        "SELECT COUNT(*) as total FROM store_hours_logs",
        (err, countResult) => {
          if (err) {
            console.error("Error counting store actions:", err);
            return res.status(500).json({ error: "Internal server error" });
          }

          const total = countResult[0].total;

          res.json({
            logs,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(total / limit),
              totalItems: total,
              itemsPerPage: parseInt(limit),
            },
          });
        }
      );
    });
  } catch (error) {
    console.error("Error fetching store action history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current store status (latest action)
app.get("/store-hours/current-store-status", async (req, res) => {
  try {
    const query = `
      SELECT * FROM store_hours_logs 
      ORDER BY timestamp DESC 
      LIMIT 1
    `;

    db.query(query, (err, latestLog) => {
      if (err) {
        console.error("Error fetching current store status:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      res.json({
        isOpen: latestLog.length > 0 ? latestLog[0].action === "open" : false,
        lastAction: latestLog[0] || null,
      });
    });
  } catch (error) {
    console.error("Error fetching current store status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------ Test ------------------
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running!",
    endpoints: {
      auth: {
        register: "POST /register",
        login: "POST /login",
        users: "GET /users",
        updateUser: "PUT /users/:id",
        deleteUser: "DELETE /users/:id",
      },
      announcements: {
        get: "GET /announcements",
        create: "POST /announcements",
      },
      items: "GET /items",
      orders: {
        get: "GET /orders",
        create: "POST /orders",
      },
      storeHours: {
        logAction: "POST /store-hours/log-store-action",
        getHistory: "GET /store-hours/store-action-history",
        getStatus: "GET /store-hours/current-store-status",
      },
    },
  });
});

// Start server
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
