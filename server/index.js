const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increase limit for large data

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "db",
  charset: "utf8mb4",
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

  if (description_type === "k-street Flavor") {
    if (!product_code || !name || !category || !description_type || !image) {
      console.log("Missing fields for flavor item");
      return res.status(400).json({
        success: false,
        message:
          "Product code, name, category, description type, and image are required",
      });
    }
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
    const finalImage = image && image.trim() !== "" ? image : existingImage;

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

// VOID ORDER ENDPOINT
app.put("/orders/:id/void", (req, res) => {
  const { id } = req.params;
  const { is_void, void_reason, voided_by, voided_at } = req.body;

  console.log("=== BACKEND: VOIDING ORDER ===");
  console.log("Order ID:", id);
  console.log("Void data:", req.body);

  if (!void_reason) {
    return res.status(400).json({
      success: false,
      message: "Void reason is required",
    });
  }

  const query = `
    UPDATE orders 
    SET is_void = ?, 
        void_reason = ?, 
        voided_by = ?, 
        voided_at = ?,
        updated_at = NOW()
    WHERE id = ?
  `;

  const values = [
    is_void || 1,
    void_reason,
    voided_by || "Admin",
    voided_at || new Date().toISOString().slice(0, 19).replace("T", " "),
    id,
  ];

  db.execute(query, values, (err, results) => {
    if (err) {
      console.error("Error voiding order:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to void order",
        error: err.message,
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log("✅ ORDER VOIDED SUCCESSFULLY!");
    console.log("Order ID:", id);
    console.log("Void Reason:", void_reason);

    res.json({
      success: true,
      message: "Order voided successfully",
      orderId: id,
    });
  });
});

app.post("/orders", (req, res) => {
  console.log("=== BACKEND: RECEIVING ORDER ===");
  console.log("Full request body:", JSON.stringify(req.body, null, 2));

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

  // Validation
  if (!userId || paidAmount === undefined || paidAmount === null) {
    console.error("Missing required fields: userId or paidAmount");
    return res.status(400).json({
      success: false,
      message: "Invalid order data: userId and paidAmount are required",
      received: req.body,
    });
  }

  const validPaymentMethods = ["Cash", "Gcash", "Gcash + Cash", "Grab"];
  const finalPaymentMethod = validPaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : "Cash";

  console.log("Final paymentMethod to save:", finalPaymentMethod);

  // Handle items - ensure it's a JSON string
  let itemsString;
  try {
    if (typeof items === "string") {
      itemsString = items;
    } else if (Array.isArray(items)) {
      itemsString = JSON.stringify(items);
    } else if (typeof items === "object" && items !== null) {
      itemsString = JSON.stringify(items);
    } else {
      itemsString = "[]";
    }
  } catch (error) {
    console.error("Error stringifying items:", error);
    itemsString = "[]";
  }

  // FIXED: First, check if the orders table has voided_by_id column
  const checkTableQuery = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'db' 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'voided_by_id'
  `;

  db.execute(checkTableQuery, (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Error checking table structure:", checkErr);
      // Proceed with basic insert without voided_by_id
      insertOrder(false);
    } else {
      // If column exists, include it with NULL
      const hasVoidedById = checkResults.length > 0;
      insertOrder(hasVoidedById);
    }
  });

  function insertOrder(includeVoidedById) {
    // Build dynamic query based on table structure
    let query;
    let values;

    if (includeVoidedById) {
      query = `
        INSERT INTO orders 
        (userId, paidAmount, total, discountApplied, changeAmount, orderType, 
         productNames, items, payment_method, voided_by_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      values = [
        parseInt(userId) || 0,
        parseFloat(paidAmount) || 0,
        parseFloat(total) || 0,
        discountApplied ? 1 : 0,
        parseFloat(changeAmount) || 0,
        orderType || "Dine In",
        productNames || "No items",
        itemsString,
        finalPaymentMethod,
        null, // voided_by_id
      ];
    } else {
      // If voided_by_id doesn't exist, use simpler query
      query = `
        INSERT INTO orders 
        (userId, paidAmount, total, discountApplied, changeAmount, orderType, 
         productNames, items, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      values = [
        parseInt(userId) || 0,
        parseFloat(paidAmount) || 0,
        parseFloat(total) || 0,
        discountApplied ? 1 : 0,
        parseFloat(changeAmount) || 0,
        orderType || "Dine In",
        productNames || "No items",
        itemsString,
        finalPaymentMethod,
      ];
    }

    console.log("Using query:", query);
    console.log("SQL values:", values);

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("❌ FAILED TO SAVE ORDER:");
        console.error("SQL Error:", err.code);
        console.error("SQL Message:", err.sqlMessage);
        console.error("Full error:", err);

        // Try alternative: Remove foreign key constraint temporarily
        if (err.code === "ER_NO_REFERENCED_ROW_2" || err.errno === 1452) {
          console.log("⚠️ Foreign key constraint error detected.");
          console.log("Trying alternative insert...");
          insertOrderWithFallback();
          return;
        }

        return res.status(500).json({
          success: false,
          message: "Failed to save order to database",
          error: err.message,
          sqlError: err.sqlMessage,
        });
      }

      console.log("✅ ORDER SAVED SUCCESSFULLY!");
      console.log("Order ID:", result.insertId);
      console.log("Payment Method Saved:", finalPaymentMethod);

      res.status(200).json({
        success: true,
        message: "Order saved successfully",
        orderId: result.insertId,
        paymentMethod: finalPaymentMethod,
      });
    });
  }

  function insertOrderWithFallback() {
    // Try with simpler query that excludes problematic columns
    const fallbackQuery = `
      INSERT INTO orders 
      (userId, paidAmount, total, discountApplied, changeAmount, orderType, 
       productNames, items, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const fallbackValues = [
      parseInt(userId) || 0,
      parseFloat(paidAmount) || 0,
      parseFloat(total) || 0,
      discountApplied ? 1 : 0,
      parseFloat(changeAmount) || 0,
      orderType || "Dine In",
      productNames || "No items",
      itemsString,
      finalPaymentMethod,
    ];

    console.log("Trying fallback query:", fallbackQuery);
    console.log("Fallback values:", fallbackValues);

    db.query(fallbackQuery, fallbackValues, (fallbackErr, fallbackResult) => {
      if (fallbackErr) {
        console.error("❌ FALLBACK ALSO FAILED:");
        console.error("SQL Error:", fallbackErr.code);
        console.error("SQL Message:", fallbackErr.sqlMessage);

        // Last resort: Try without foreign key constraints
        const emergencyQuery = `
          INSERT INTO orders 
          (userId, paidAmount, total, orderType, productNames, items)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const emergencyValues = [
          parseInt(userId) || 0,
          parseFloat(paidAmount) || 0,
          parseFloat(total) || 0,
          orderType || "Dine In",
          productNames || "No items",
          itemsString,
        ];

        db.query(
          emergencyQuery,
          emergencyValues,
          (emergencyErr, emergencyResult) => {
            if (emergencyErr) {
              console.error("❌ EMERGENCY INSERT FAILED TOO!");
              return res.status(500).json({
                success: false,
                message:
                  "Database error. Please check your orders table structure.",
                error: emergencyErr.message,
              });
            }

            console.log("⚠️ ORDER SAVED WITH EMERGENCY QUERY");
            res.status(200).json({
              success: true,
              message: "Order saved (with limited fields)",
              orderId: emergencyResult.insertId,
            });
          }
        );
        return;
      }

      console.log("✅ ORDER SAVED WITH FALLBACK QUERY!");
      res.status(200).json({
        success: true,
        message: "Order saved successfully",
        orderId: fallbackResult.insertId,
        paymentMethod: finalPaymentMethod,
      });
    });
  }
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

// CREATE inventory item
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
    price,
    total_price,
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

// GET single inventory item by ID
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

// UPDATE inventory item - SINGLE VERSION (REMOVED DUPLICATE)
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
    price,
    total_price,
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
      orders: {
        get: "GET /orders",
        create: "POST /orders",
        void: "PUT /orders/:id/void",
      },
      storeHours: {
        logAction: "POST /store-hours/log-store-action",
        getStatus: "GET /store-hours/current-store-status",
      },
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// Start server
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
