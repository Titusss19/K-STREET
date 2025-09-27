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
        .json({ success: false, message: "Lahat ng fields ay kailangan" });

    if (password !== confirmPassword)
      return res
        .status(400)
        .json({ success: false, message: "Hindi magkapareho ang password" });

    if (password.length < 6)
      return res
        .status(400)
        .json({
          success: false,
          message: "Password ay dapat hindi bababa sa 6 na karakter",
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
            .json({
              success: false,
              message: "May existing account na gamit ang email na ito",
            });

        const hashedPassword = await bcrypt.hash(password, 10);
        db.execute(
          "INSERT INTO users (email, password) VALUES (?, ?)",
          [email, hashedPassword],
          (err, results) => {
            if (err)
              return res
                .status(500)
                .json({
                  success: false,
                  message: "Error sa paggawa ng account",
                });
            res
              .status(201)
              .json({
                success: true,
                message: "Matagumpay na nagawa ang account!",
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
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });

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
          user: { id: user.id, email: user.email, created_at: user.created_at },
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
    (err, results) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Item updated" });
    }
  );
});

// Delete item
app.delete("/items/:id", (req, res) => {
  const { id } = req.params;
  db.execute("DELETE FROM items WHERE id = ?", [id], (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: "Item deleted" });
  });
});

// Test
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running!",
    endpoints: {
      register: "POST /register",
      login: "POST /login",
      users: "GET /users",
      items: "GET /items",
    },
  });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
