const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection - PALITAN MO NG SARILING CREDENTIALS
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // palitan ng username mo
  password: "", // palitan ng password mo
  database: "db", // palitan ng database name
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error("Database connection failed: ", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// Register endpoint
app.post("/register", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Lahat ng fields ay kailangan",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Hindi magkapareho ang password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password ay dapat hindi bababa sa 6 na karakter",
      });
    }

    // Check if user already exists
    const checkUserQuery = "SELECT * FROM users WHERE email = ?";

    db.execute(checkUserQuery, [email], async (err, results) => {
      if (err) {
        console.error("Database error: ", err);
        return res.status(500).json({
          success: false,
          message: "Server error",
        });
      }

      if (results.length > 0) {
        return res.status(400).json({
          success: false,
          message: "May existing account na gamit ang email na ito",
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const insertUserQuery =
        "INSERT INTO users (email, password, created_at) VALUES (?, ?, NOW())";

      db.execute(insertUserQuery, [email, hashedPassword], (err, results) => {
        if (err) {
          console.error("Error creating user: ", err);
          return res.status(500).json({
            success: false,
            message: "Error sa paggawa ng account",
          });
        }

        res.status(201).json({
          success: true,
          message: "Matagumpay na nagawa ang account!",
          userId: results.insertId,
        });
      });
    });
  } catch (error) {
    console.error("Registration error: ", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get all users endpoint
app.get("/users", (req, res) => {
  const getUsersQuery =
    "SELECT id, email, created_at FROM users ORDER BY created_at DESC";

  db.execute(getUsersQuery, (err, results) => {
    if (err) {
      console.error("Error fetching users: ", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching users",
      });
    }

    res.json({
      success: true,
      users: results,
    });
  });
});

// Test endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running!",
    endpoints: {
      register: "POST /register",
      users: "GET /users",
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


//LOGINN
// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Check if user exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    
    db.execute(checkUserQuery, [email], async (err, results) => {
      if (err) {
        console.error('Database error: ', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error' 
        });
      }

      if (results.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const user = results[0];
      
      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid password' 
        });
      }

      // Login successful
      res.json({ 
        success: true, 
        message: 'Login successful',
        user: { 
          id: user.id, 
          email: user.email,
          created_at: user.created_at
        }
      });
    });

  } catch (error) {
    console.error('Login error: ', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});