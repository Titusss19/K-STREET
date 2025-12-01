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

// ------------------ USERS ------------------
app.get("/users", (req, res) => {
  db.execute(
    "SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC",
    (err, results) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.json(results);
    }
  );
});

// ------------------ ANNOUNCEMENTS ------------------
app.get("/announcements", (req, res) => {
  db.execute(
    "SELECT * FROM announcements ORDER BY created_at DESC",
    (err, results) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.json(results);
    }
  );
});

app.post("/announcements", (req, res) => {
  const { title, content, author } = req.body;

  if (!title || !content || !author) {
    return res.status(400).json({
      success: false,
      message: "Title, content, and author are required",
    });
  }

  db.execute(
    "INSERT INTO announcements (title, content, author) VALUES (?, ?, ?)",
    [title, content, author],
    (err, results) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.status(201).json({
        success: true,
        message: "Announcement created successfully",
        announcementId: results.insertId,
      });
    }
  );
});

app.put("/announcements/:id", (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "Title and content are required",
    });
  }

  db.execute(
    "UPDATE announcements SET title = ?, content = ? WHERE id = ?",
    [title, content, id],
    (err) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Announcement updated" });
    }
  );
});

app.delete("/announcements/:id", (req, res) => {
  const { id } = req.params;
  db.execute("DELETE FROM announcements WHERE id = ?", [id], (err) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: "Announcement deleted" });
  });
});

// ------------------ ITEMS ------------------
app.get("/items", (req, res) => {
  const query =
    "SELECT * FROM items WHERE description_type = 'k-street food' ORDER BY created_at DESC";

  db.execute(query, (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json(results);
  });
});

app.post("/items", (req, res) => {
  const { product_code, name, category, description_type, price, image } =
    req.body;

  console.log("=== BACKEND: CREATING ITEM ===");
  console.log("Request body:", req.body);

  // BAGO: Validation para sa flavor items
  if (description_type === "k-street Flavor") {
    // For flavor items, only these fields are required
    if (!product_code || !name || !category || !description_type || !image) {
      console.log("Missing fields for flavor item");
      return res.status(400).json({
        success: false,
        message:
          "Product code, name, category, description type, and image are required",
      });
    }
    // Price is optional for flavor items - set to 0 if not provided
    const finalPrice = Number(price) || 0;

    db.execute(
      "INSERT INTO items (product_code, name, category, description_type, price, image) VALUES (?, ?, ?, ?, ?, ?)",
      [product_code, name, category, description_type, finalPrice, image],
      (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: err.message,
          });
        }

        console.log("✅ FLAVOR ITEM CREATED SUCCESSFULLY!");
        console.log("Product Code:", product_code);
        console.log("Price (auto-set to 0):", finalPrice);

        res.status(201).json({
          success: true,
          id: results.insertId,
          product_code,
          name,
          category,
          description_type,
          price: finalPrice,
          image,
        });
      }
    );
  } else {
    // For non-flavor items, ALL fields including price are required
    if (
      !product_code ||
      !name ||
      !category ||
      !description_type ||
      !price ||
      !image
    ) {
      console.log("Missing fields for non-flavor item");
      return res.status(400).json({
        success: false,
        message: "All fields are required for non-flavor items",
      });
    }

    db.execute(
      "INSERT INTO items (product_code, name, category, description_type, price, image) VALUES (?, ?, ?, ?, ?, ?)",
      [product_code, name, category, description_type, Number(price), image],
      (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: err.message,
          });
        }

        console.log("✅ REGULAR ITEM CREATED SUCCESSFULLY!");
        console.log("Product Code:", product_code);

        res.status(201).json({
          success: true,
          id: results.insertId,
          product_code,
          name,
          category,
          description_type,
          price: Number(price),
          image,
        });
      }
    );
  }
});

// UPDATE ITEM ROUTE
app.put("/items/:id", (req, res) => {
  const { id } = req.params;
  const { product_code, name, category, description_type, price, image } =
    req.body;

  console.log("=== BACKEND: UPDATING ITEM ===");
  console.log("Item ID:", id);
  console.log("Request body:", req.body);

  if (!product_code || !name || !price) {
    return res.status(400).json({
      success: false,
      message: "Product code, name, and price are required",
    });
  }

  // Fetch current image
  const sqlGet = "SELECT image FROM items WHERE id = ?";
  db.query(sqlGet, [id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const existingImage = result[0]?.image;

    // Keep old image if no new one is provided
    const finalImage = image && image.trim() !== "" ? image : existingImage;

    // UPDATE ITEM WITHOUT CHECKING FOR DUPLICATE PRODUCT CODES
    const sqlUpdate = `
      UPDATE items 
      SET product_code=?, name=?, category=?, description_type=?, price=?, image=?
      WHERE id=?
    `;

    db.query(
      sqlUpdate,
      [product_code, name, category, description_type, price, finalImage, id],
      (err3, results) => {
        if (err3) {
          console.error("Update failed:", err3);
          return res.status(500).json({
            success: false,
            message: "Update failed",
          });
        }

        console.log("✅ ITEM UPDATED SUCCESSFULLY!");
        console.log("Updated item ID:", id);
        console.log("Product Code:", product_code);

        res.json({
          success: true,
          message: "Item updated successfully",
          id: parseInt(id),
        });
      }
    );
  });
});

// DELETE ITEM ROUTE
app.delete("/items/:id", (req, res) => {
  const { id } = req.params;

  console.log("=== BACKEND: DELETING ITEM ===");
  console.log("Item ID to delete:", id);

  db.execute("DELETE FROM items WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    console.log("✅ ITEM DELETED SUCCESSFULLY!");
    console.log("Deleted item ID:", id);

    res.json({
      success: true,
      message: "Item deleted successfully",
      deletedId: id,
    });
  });
});

// ------------------ STORE HOURS LOGS ------------------
app.get("/store-hours-logs", (req, res) => {
  const query = `
    SELECT 
      shl.*,
      u.email as user_email
    FROM store_hours_logs shl
    LEFT JOIN users u ON shl.user_id = u.id
    ORDER BY shl.timestamp DESC
  `;

  db.execute(query, (err, results) => {
    if (err) {
      console.error("Error fetching store hours logs:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching store hours logs",
      });
    }
    res.json(results);
  });
});

// ------------------ ORDERS ------------------
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
        message: "Error fetching orders",
      });
    }
    res.json(results);
  });
});

app.post("/orders", (req, res) => {
  console.log("=== BACKEND: RECEIVING ORDER ===");

  const {
    userId,
    paidAmount,
    total,
    discountApplied,
    changeAmount,
    orderType,
    productNames,
    items,
    paymentMethod,
  } = req.body;

  console.log("Payment Method received:", paymentMethod);

  if (!userId || paidAmount === undefined || paidAmount === null) {
    return res.status(400).json({
      message: "Invalid order data: userId and paidAmount are required",
      received: req.body,
    });
  }

  const validPaymentMethods = ["Cash", "Gcash", "Gcash + Cash", "Grab"];
  const finalPaymentMethod = validPaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : "Cash";

  console.log("Final paymentMethod to save:", finalPaymentMethod);

  const query = `
    INSERT INTO orders (userId, paidAmount, total, discountApplied, changeAmount, orderType, productNames, items, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      productNames || "No items",
      items || "[]",
      finalPaymentMethod,
    ],
    (err, result) => {
      if (err) {
        console.error("Failed to save order:", err);
        return res.status(500).json({ message: "Failed to save order" });
      }

      console.log("✅ ORDER SAVED SUCCESSFULLY!");
      console.log("Payment Method Saved:", finalPaymentMethod);

      res.status(200).json({
        message: "Order saved successfully",
        orderId: result.insertId,
        paymentMethod: finalPaymentMethod,
      });
    }
  );
});

// ------------------ STORE HOURS ------------------
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
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error("Error logging store action:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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

// ------------------ ALL ITEMS (NO FILTER) ------------------
app.get("/all-items", (req, res) => {
  const query = "SELECT * FROM items ORDER BY created_at DESC";

  db.execute(query, (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json(results);
  });
});

// ------------------ INVENTORY ROUTES ------------------

// GET all inventory items
app.get("/inventory", (req, res) => {
  const query = "SELECT * FROM inventory_items ORDER BY created_at DESC";

  db.execute(query, (err, results) => {
    if (err) {
      console.error("Error fetching inventory items:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json(results);
  });
});

// CREATE inventory item - FIXED: Added total_price field
app.post("/inventory", (req, res) => {
  const {
    product_code,
    name,
    category,
    description,
    unit,
    current_stock,
    min_stock,
    supplier,
    price, // Price per item
    total_price, // Total price (price × quantity)
  } = req.body;

  console.log("=== BACKEND: CREATING INVENTORY ITEM ===");
  console.log("Request body:", req.body);

  if (!product_code || !name || !unit) {
    return res.status(400).json({
      success: false,
      message: "Product code, name, and unit are required",
    });
  }

  const query = `
    INSERT INTO inventory_items 
    (product_code, name, category, description, unit, current_stock, min_stock, supplier, price, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.execute(
    query,
    [
      product_code,
      name,
      category || "Raw Material",
      description || "",
      unit,
      current_stock || 0,
      min_stock || 0,
      supplier || "",
      price || 0,
      total_price || 0,
    ],
    (err, results) => {
      if (err) {
        console.error("Error creating inventory item:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      console.log("✅ INVENTORY ITEM CREATED SUCCESSFULLY!");

      res.status(201).json({
        success: true,
        id: results.insertId,
        message: "Inventory item created successfully",
      });
    }
  );
});

// UPDATE inventory item - FIXED: Added total_price field
app.put("/inventory/:id", (req, res) => {
  const { id } = req.params;
  const {
    product_code,
    name,
    category,
    description,
    unit,
    current_stock,
    min_stock,
    supplier,
    price, // Price per item
    total_price, // Total price
  } = req.body;

  console.log("=== BACKEND: UPDATING INVENTORY ITEM ===");
  console.log("Inventory ID:", id);
  console.log("Request body:", req.body);

  if (!product_code || !name || !unit) {
    return res.status(400).json({
      success: false,
      message: "Product code, name, and unit are required",
    });
  }

  const query = `
    UPDATE inventory_items 
    SET product_code=?, name=?, category=?, description=?, unit=?, 
        current_stock=?, min_stock=?, supplier=?, price=?, total_price=?
    WHERE id=?
  `;

  db.execute(
    query,
    [
      product_code,
      name,
      category || "Raw Material",
      description || "",
      unit,
      current_stock || 0,
      min_stock || 0,
      supplier || "",
      price || 0,
      total_price || 0,
      id,
    ],
    (err, results) => {
      if (err) {
        console.error("Error updating inventory item:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Inventory item not found" });
      }

      console.log("✅ INVENTORY ITEM UPDATED SUCCESSFULLY!");

      res.json({
        success: true,
        message: "Inventory item updated successfully",
      });
    }
  );
});

// DELETE inventory item
app.delete("/inventory/:id", (req, res) => {
  const { id } = req.params;

  console.log("=== BACKEND: DELETING INVENTORY ITEM ===");
  console.log("Inventory ID to delete:", id);

  db.execute(
    "DELETE FROM inventory_items WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error deleting inventory item:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Inventory item not found",
        });
      }

      console.log("✅ INVENTORY ITEM DELETED SUCCESSFULLY!");

      res.json({
        success: true,
        message: "Inventory item deleted successfully",
      });
    }
  );
});

// GET single inventory item by ID - ADD THIS
app.get("/inventory/:id", (req, res) => {
  const { id } = req.params;

  console.log("=== BACKEND: FETCHING SINGLE INVENTORY ITEM ===");
  console.log("Inventory ID:", id);

  const query = "SELECT * FROM inventory_items WHERE id = ?";

  db.execute(query, [id], (err, results) => {
    if (err) {
      console.error("Error fetching inventory item:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    console.log("✅ INVENTORY ITEM FETCHED SUCCESSFULLY!");
    
    res.json({
      success: true,
      data: results[0],
    });
  });
});

// UPDATE inventory item
app.put("/inventory/:id", (req, res) => {
  const { id } = req.params;
  const {
    product_code,
    name,
    category,
    description,
    unit,
    current_stock,
    min_stock,
    cost_per_unit,
    supplier,
    price, // PALITAN: total_price → price
  } = req.body;

  console.log("=== BACKEND: UPDATING INVENTORY ITEM ===");
  console.log("Inventory ID:", id);
  console.log("Request body:", req.body);

  if (!product_code || !name || !unit) {
    return res.status(400).json({
      success: false,
      message: "Product code, name, and unit are required",
    });
  }

  const query = `
    UPDATE inventory_items 
    SET product_code=?, name=?, category=?, description=?, unit=?, 
        current_stock=?, min_stock=?, cost_per_unit=?, supplier=?, price=?
    WHERE id=?
  `;

  db.execute(
    query,
    [
      product_code,
      name,
      category,
      description,
      unit,
      current_stock,
      min_stock,
      cost_per_unit,
      supplier,
      price, // PALITAN: total_price → price
      id,
    ],
    (err, results) => {
      if (err) {
        console.error("Error updating inventory item:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Inventory item not found" });
      }

      console.log("✅ INVENTORY ITEM UPDATED SUCCESSFULLY!");

      res.json({
        success: true,
        message: "Inventory item updated successfully",
      });
    }
  );
});

// DELETE inventory item
app.delete("/inventory/:id", (req, res) => {
  const { id } = req.params;

  console.log("=== BACKEND: DELETING INVENTORY ITEM ===");
  console.log("Inventory ID to delete:", id);

  db.execute(
    "DELETE FROM inventory_items WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error deleting inventory item:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Inventory item not found",
        });
      }

      console.log("✅ INVENTORY ITEM DELETED SUCCESSFULLY!");

      res.json({
        success: true,
        message: "Inventory item deleted successfully",
      });
    }
  );
});

// ------------------ Test ------------------
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running!",
    endpoints: {
      auth: {
        register: "POST /register",
        login: "POST /login",
      },
      users: "GET /users",
      announcements: {
        get: "GET /announcements",
        create: "POST /announcements",
        update: "PUT /announcements/:id",
        delete: "DELETE /announcements/:id",
      },
      items: {
        get: "GET /items",
        create: "POST /items",
        update: "PUT /items/:id",
        delete: "DELETE /items/:id",
      },
      inventory: {
        get: "GET /inventory",
        create: "POST /inventory",
        update: "PUT /inventory/:id",
        delete: "DELETE /inventory/:id",
      },
      addons: {
        get: "GET /addons",
        create: "POST /addons",
        getForItem: "GET /items/:id/addons",
      },
      upgrades: {
        get: "GET /upgrades",
        create: "POST /upgrades",
        getForItem: "GET /items/:id/upgrades",
      },
      orders: {
        get: "GET /orders",
        create: "POST /orders",
      },
      storeHours: {
        logAction: "POST /store-hours/log-store-action",
        getStatus: "GET /store-hours/current-store-status",
      },
    },
  });
});

// Start server
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
