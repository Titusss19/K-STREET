const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

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

// ============================
// MIDDLEWARE: USER BRANCH FILTERING
// ============================

// Middleware to extract user from request headers (assuming frontend sends user info)
const getUserFromRequest = (req, res, next) => {
  try {
    // Get user info from headers (frontend should send user info in headers)
    const userHeader = req.headers["user"];
    if (userHeader) {
      req.user = JSON.parse(userHeader);
    } else if (req.headers["x-user"]) {
      // Alternative header name
      req.user = JSON.parse(req.headers["x-user"]);
    } else if (req.body.user) {
      // Or from body for specific endpoints
      req.user = req.body.user;
    }
    next();
  } catch (error) {
    console.error("Error parsing user info:", error);
    req.user = null;
    next();
  }
};

// Middleware to check if user is authenticated and has a branch
const requireUserBranch = (req, res, next) => {
  if (!req.user || !req.user.branch) {
    return res.status(401).json({
      success: false,
      message: "User authentication required. Please login again.",
    });
  }
  next();
};

// Apply user middleware to all routes that need branch filtering
app.use(getUserFromRequest);

// ============================
// HELPER FUNCTIONS
// ============================

// Helper function to build WHERE clause for branch filtering
const buildBranchWhereClause = (userBranch, tableAlias = "") => {
  if (!userBranch) return { clause: "", params: [] };

  const prefix = tableAlias ? `${tableAlias}.` : "";
  return {
    clause: ` WHERE ${prefix}branch = ?`,
    params: [userBranch],
  };
};

// Helper function to add branch to queries
const addBranchToQuery = (baseQuery, userBranch, tableAlias = "") => {
  if (!userBranch) return baseQuery;

  const hasWhere = baseQuery.toUpperCase().includes("WHERE");
  const clause = hasWhere ? " AND" : " WHERE";
  const prefix = tableAlias ? `${tableAlias}.` : "";

  return `${baseQuery}${clause} ${prefix}branch = ?`;
};

// ============================
// AUTH ENDPOINTS
// ============================
app.post("/register", async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      confirmPassword,
      role,
      status,
      branch,
      void_pin,
    } = req.body;

    console.log("=== REGISTER REQUEST ===");
    console.log("Role:", role);
    console.log("Void PIN provided:", void_pin);

    // Validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // For Manager/Owner: Validate void_pin length
    if ((role === "manager" || role === "admin") && void_pin) {
      if (void_pin.length < 4 || void_pin.length > 6) {
        return res.status(400).json({
          success: false,
          message: "Void PIN must be 4-6 digits",
        });
      }
    }

    // Check if email already exists
    db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Server error",
          });
        }

        if (results.some((user) => user.email === email)) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Hash the void PIN if provided
        let hashedVoidPin = null;
        if (void_pin && void_pin.length >= 4) {
          hashedVoidPin = await bcrypt.hash(void_pin, 10);
          console.log("Hashed Void PIN for:", email);
        }

        // IMPORTANT: "admin" in frontend = "owner" in database
        let dbRole = role || "cashier";
        if (dbRole === "admin") {
          dbRole = "owner";
        }

        // Set username if not provided
        const finalUsername = username || email.split("@")[0];

        // Set default status
        const userStatus = status || "Active";

        // Set default branch
        const userBranch = branch || "main";

        db.execute(
          "INSERT INTO users (email, username, password, role, status, branch, void_pin) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            email,
            finalUsername,
            hashedPassword,
            dbRole,
            userStatus,
            userBranch,
            hashedVoidPin,
          ],
          (err, results) => {
            if (err) {
              console.error("Error creating account:", err);
              return res.status(500).json({
                success: false,
                message: "Error creating account: " + err.message,
              });
            }

            console.log("✅ Account created successfully:", {
              email: email,
              role: dbRole,
              hasVoidPin: !!hashedVoidPin,
            });

            res.status(201).json({
              success: true,
              message: "Account created successfully",
              userId: results.insertId,
              role: role,
            });
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Debug endpoint to see raw database data
app.get("/debug-users/:id", (req, res) => {
  const { id } = req.params;
  
  db.execute(
    "SELECT * FROM users WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error fetching user:", err);
        return res.status(500).json({ error: err.message });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("RAW DATABASE USER:", results[0]);
      res.json(results[0]);
    }
  );
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

        let frontendRole = user.role;
        if (frontendRole === "owner") {
          frontendRole = "admin";
        }

        res.json({
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            username: user.username || user.email.split("@")[0], // Use username or fallback
            role: frontendRole,
            status: user.status || "Active",
            branch: user.branch || "main",
          },
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============================
// STORE HOURS / STATUS
// ============================

// Check current store status with automatic branch filtering
app.get("/store-hours/current-store-status", requireUserBranch, (req, res) => {
  const userBranch = req.user.branch;

  console.log("Fetching store status for user branch:", userBranch);

  const query = `
    SELECT 
      s.*,
      u.email as action_by_email
    FROM store_status_log s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.branch = ?
    ORDER BY s.timestamp DESC LIMIT 1
  `;

  db.execute(query, [userBranch], (err, results) => {
    if (err) {
      console.error("Error fetching store status:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching store status",
      });
    }

    if (results.length === 0) {
      console.log("No store status found for branch:", userBranch);
      return res.json({
        isOpen: false,
        lastAction: null,
        message: "Store status not initialized",
      });
    }

    const lastAction = results[0];
    console.log("Found store status:", lastAction);

    res.json({
      isOpen: lastAction.action === "open",
      lastAction: {
        timestamp: lastAction.timestamp,
        action: lastAction.action,
        user_id: lastAction.user_id,
        branch: lastAction.branch,
        action_by_email: lastAction.action_by_email,
      },
    });
  });
});

// Log store action (open/close) - automatically uses user's branch
app.post("/store-hours/log-store-action", requireUserBranch, (req, res) => {
  const { userId, userEmail, action } = req.body;
  const userBranch = req.user.branch;

  console.log("Logging store action for user branch:", userBranch);

  if (!userId || !action) {
    return res.status(400).json({
      success: false,
      message: "User ID and action are required",
    });
  }

  const validActions = ["open", "close"];
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Action must be 'open' or 'close'",
    });
  }

  const query = `
    INSERT INTO store_status_log (user_id, user_email, action, branch)
    VALUES (?, ?, ?, ?)
  `;

  db.execute(query, [userId, userEmail, action, userBranch], (err, results) => {
    if (err) {
      console.error("Error logging store action:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to log store action",
        error: err.message,
      });
    }

    console.log("Store action logged successfully:", results.insertId);

    res.json({
      success: true,
      message: `Store ${action}ed successfully`,
      logId: results.insertId,
      timestamp: new Date().toISOString(),
      branch: userBranch,
    });
  });
});

// ============================
// USERS ENDPOINTS
// ============================

// Get users - ADMIN ONLY (can see all users)
// Get users - ADMIN ONLY (can see all users)
app.get("/users", (req, res) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "owner")) {
    db.execute(
      "SELECT id, email, username, role, status, branch, created_at, void_pin FROM users ORDER BY created_at DESC", // ADD void_pin
      (err, results) => {
        if (err)
          return res.status(500).json({ success: false, message: err.message });

        // BAGUHIN: I-convert ang database role to frontend role
        const convertedResults = results.map((user) => ({
          ...user,
          // IMPORTANT: Sa database "owner" = sa frontend "admin"
          role: user.role === "owner" ? "admin" : user.role,
          // Keep void_pin as is
          void_pin: user.void_pin,
        }));

        console.log("Users fetched:", convertedResults.length);
        console.log("Sample user:", convertedResults[0]);

        res.json(convertedResults);
      }
    );
  } else if (req.user && req.user.branch) {
    db.execute(
      "SELECT id, email, username, role, status, branch, created_at, void_pin FROM users WHERE branch = ? ORDER BY created_at DESC", // ADD void_pin
      [req.user.branch],
      (err, results) => {
        if (err)
          return res.status(500).json({ success: false, message: err.message });

        // BAGUHIN: Same conversion
        const convertedResults = results.map((user) => ({
          ...user,
          role: user.role === "owner" ? "admin" : user.role,
          void_pin: user.void_pin,
        }));

        res.json(convertedResults);
      }
    );
  } else {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
});

// ============================
// VOID PIN VERIFICATION (For Order Voiding)
// ============================

// Verify any manager/admin Void PIN without requiring specific user ID
// Pinalitan na: verify-manager-pin endpoint
app.post("/users/verify-manager-pin", requireUserBranch, async (req, res) => {
  const { void_pin } = req.body;
  const requestingUser = req.user;

  if (!void_pin) {
    return res.status(400).json({
      success: false,
      message: "Void PIN is required",
    });
  }

  console.log("=== VERIFYING VOID PIN ===");
  console.log("Requesting user:", requestingUser.email);
  console.log("User role:", requestingUser.role);
  console.log("Received PIN:", void_pin.substring(0, 2) + "**");

  // IMPORTANT: Hanapin ang SINO MANG user na may matching PIN
  let query;
  let params = [];

  // Kung admin/owner, hanapin sa lahat ng branches
  if (requestingUser.role === "admin" || requestingUser.role === "owner") {
    query = `
      SELECT id, email, role, void_pin, branch, username 
      FROM users 
      WHERE void_pin IS NOT NULL
    `;
    params = [];
  } else {
    // Kung non-admin (cashier/manager), hanapin sa same branch lang
    query = `
      SELECT id, email, role, void_pin, branch, username 
      FROM users 
      WHERE void_pin IS NOT NULL AND branch = ?
    `;
    params = [requestingUser.branch];
  }

  console.log("Query:", query);
  console.log("Params:", params);

  db.execute(query, params, async (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    console.log(`Found ${results.length} users with Void PIN`);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No accounts found with Void PIN" + 
                 (requestingUser.role !== "admin" && requestingUser.role !== "owner" ? 
                  " in your branch" : ""),
      });
    }

    // Try to match the PIN with ANY user that has a void PIN
    let matchedUser = null;
    let matchFound = false;
    
    for (const user of results) {
      try {
        if (user.void_pin) {
          const isMatch = await bcrypt.compare(void_pin, user.void_pin);
          if (isMatch) {
            matchedUser = {
              id: user.id,
              email: user.email,
              username: user.username,
              role: user.role === "owner" ? "admin" : user.role,
              branch: user.branch
            };
            matchFound = true;
            console.log("✅ PIN matched with user:", matchedUser.email);
            console.log("User role:", matchedUser.role);
            break;
          }
        }
      } catch (error) {
        console.error("Error comparing PIN for user:", user.email, error);
        continue;
      }
    }

    if (matchFound && matchedUser) {
      // IMPORTANT: Dapat ang PIN owner ay MANAGER o ADMIN/Owner
      if (matchedUser.role !== "manager" && matchedUser.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Void PIN must belong to a Manager or Owner account",
        });
      }

      res.json({
        success: true,
        message: "Void PIN verified successfully",
        authorized_by: matchedUser,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log("❌ No matching PIN found");
      res.status(401).json({
        success: false,
        message: "Invalid Void PIN. Please try again.",
      });
    }
  });
});

// Check if there are any managers/admins with Void PIN in the user's branch
app.get("/users/check-manager-pin-available", requireUserBranch, (req, res) => {
  let query;
  let params = [];

  if (req.user.role === "admin" || req.user.role === "owner") {
    // Admin can see all branches
    query = "SELECT COUNT(*) as count FROM users WHERE (role = 'manager' OR role = 'owner') AND void_pin IS NOT NULL";
  } else {
    // Non-admin can only see their branch
    query = "SELECT COUNT(*) as count FROM users WHERE (role = 'manager' OR role = 'owner') AND void_pin IS NOT NULL AND branch = ?";
    params = [req.user.branch];
  }
  
  db.execute(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    const count = results[0]?.count || 0;
    
    res.json({
      success: true,
      has_manager_with_pin: count > 0,
      count: count,
      message: count > 0 ? 
        "Manager/Owner accounts with PIN available" : 
        "No Manager/Owner accounts with PIN found" + 
        (req.user.role !== "admin" && req.user.role !== "owner" ? " in your branch" : "")
    });
  });
}); 


// ============================
// UPDATE USER ENDPOINT
// ============================
app.put("/users/:id", requireUserBranch, async (req, res) => {
  const { id } = req.params;
  const { email, username, role, status, branch, void_pin } = req.body;
  const userBranch = req.user.branch;
  const userRole = req.user.role;

  console.log("=== UPDATING USER ===");
  console.log("Target user ID:", id);
  console.log("Updating user data:", req.body);
  console.log("Requesting user role:", userRole);
  console.log("Requesting user branch:", userBranch);

  // Check permissions
  if (userRole !== "admin" && userRole !== "owner" && userRole !== "manager") {
    return res.status(403).json({
      success: false,
      message: "You don't have permission to update users",
    });
  }

  // First, get the existing user to check permissions
  const getQuery = "SELECT * FROM users WHERE id = ?";
  
  db.execute(getQuery, [id], async (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Database error" 
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existingUser = results[0];
    console.log("Existing user data:", {
      id: existingUser.id,
      role: existingUser.role,
      branch: existingUser.branch,
      has_void_pin: !!existingUser.void_pin
    });

    // Check if non-admin is trying to update user from different branch
    if (userRole !== "admin" && userRole !== "owner") {
      if (existingUser.branch !== userBranch) {
        return res.status(403).json({
          success: false,
          message: "You can only update users in your own branch",
        });
      }
    }

    // Convert frontend role to database role
    let dbRole = role;
    if (dbRole === "admin") {
      dbRole = "owner"; // Frontend "admin" = database "owner"
    }

    // Handle void_pin if provided
    let hashedVoidPin = existingUser.void_pin; // Keep existing if not changed
    
    if (void_pin && void_pin.trim() !== "") {
      console.log("New void_pin provided, updating...");
      
      // Validate void_pin length for manager/admin
      if ((dbRole === "manager" || dbRole === "owner") && void_pin) {
        if (void_pin.length < 4) {
          return res.status(400).json({
            success: false,
            message: "Void PIN must be at least 4 digits",
          });
        }
        
        if (!/^\d+$/.test(void_pin)) {
          return res.status(400).json({
            success: false,
            message: "Void PIN must contain only numbers",
          });
        }
      }
      
      // Hash the new void_pin
      hashedVoidPin = await bcrypt.hash(void_pin, 10);
    } else if (void_pin === null || void_pin === "") {
      // If void_pin is explicitly set to empty, remove it
      console.log("Removing void_pin");
      hashedVoidPin = null;
    }

    // Prepare update query
    let updateQuery;
    let updateParams;

    if (userRole === "admin" || userRole === "owner") {
      // Admin/Owner can update any field including branch
      updateQuery = `
        UPDATE users 
        SET email = ?, username = ?, role = ?, status = ?, branch = ?, void_pin = ?
        WHERE id = ?
      `;
      updateParams = [
        email,
        username || "",
        dbRole,
        status || "Active",
        branch || "main",
        hashedVoidPin,
        id
      ];
    } else {
      // Manager can only update certain fields within their branch
      updateQuery = `
        UPDATE users 
        SET email = ?, username = ?, role = ?, status = ?, void_pin = ?
        WHERE id = ? AND branch = ?
      `;
      updateParams = [
        email,
        username || "",
        dbRole,
        status || "Active",
        hashedVoidPin,
        id,
        userBranch
      ];
    }

    console.log("Executing update query:", updateQuery);
    console.log("With params:", updateParams);

    db.execute(updateQuery, updateParams, (err, results) => {
      if (err) {
        console.error("Error updating user:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to update user",
          error: err.message 
        });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found or you don't have permission to update",
        });
      }

      console.log("✅ User updated successfully");
      
      // Get updated user data
      const selectQuery = "SELECT * FROM users WHERE id = ?";
      db.execute(selectQuery, [id], (err, updatedResults) => {
        if (err || updatedResults.length === 0) {
          return res.json({
            success: true,
            message: "User updated successfully",
            userId: id
          });
        }

        const updatedUser = updatedResults[0];
        
        res.json({
          success: true,
          message: "User updated successfully",
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            role: updatedUser.role === "owner" ? "admin" : updatedUser.role, // Convert back for frontend
            status: updatedUser.status,
            branch: updatedUser.branch,
            created_at: updatedUser.created_at,
            void_pin: updatedUser.void_pin ? "●●●●" : null
          }
        });
      });
    });
  });
});

app.post("/register", async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      confirmPassword,
      role,
      status,
      branch,
      void_pin,
    } = req.body;

    console.log("=== REGISTER REQUEST ===");
    console.log("Role:", role);
    console.log("Void PIN provided:", void_pin);

    // Validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // For Manager/Owner: Validate void_pin length
    if ((role === "manager" || role === "admin") && void_pin) {
      if (void_pin.length < 4 || void_pin.length > 6) {
        return res.status(400).json({
          success: false,
          message: "Void PIN must be 4-6 digits",
        });
      }
    }

    // Check if email already exists
    db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Server error",
          });
        }

        if (results.some((user) => user.email === email)) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Hash the void PIN if provided
        let hashedVoidPin = null;
        if (void_pin && void_pin.length >= 4) {
          hashedVoidPin = await bcrypt.hash(void_pin, 10);
          console.log("Hashed Void PIN for:", email);
        }

        // IMPORTANT: "admin" in frontend = "owner" in database
        let dbRole = role || "cashier";
        if (dbRole === "admin") {
          dbRole = "owner";
        }

        // Set username if not provided
        const finalUsername = username || email.split("@")[0];

        // Set default status
        const userStatus = status || "Active";

        // Set default branch
        const userBranch = branch || "main";

        db.execute(
          "INSERT INTO users (email, username, password, role, status, branch, void_pin) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            email,
            finalUsername,
            hashedPassword,
            dbRole,
            userStatus,
            userBranch,
            hashedVoidPin,
          ],
          (err, results) => {
            if (err) {
              console.error("Error creating account:", err);
              return res.status(500).json({
                success: false,
                message: "Error creating account: " + err.message,
              });
            }

            console.log("✅ Account created successfully:", {
              email: email,
              role: dbRole,
              hasVoidPin: !!hashedVoidPin,
            });

            res.status(201).json({
              success: true,
              message: "Account created successfully",
              userId: results.insertId,
              role: role,
            });
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

app.delete("/users/:id", requireUserBranch, (req, res) => {
  const { id } = req.params;
  const userBranch = req.user.branch;

  // Only allow deleting users in the same branch unless admin
  let query;
  let params;

 if (req.user.role === "admin" || req.user.role === "owner") {
   query = "DELETE FROM users WHERE id = ?";
   params = [id];
 } else {
   query = "DELETE FROM users WHERE id = ? AND branch = ?";
   params = [id, userBranch];
 }

  db.execute(query, params, (err) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: "User deleted" });
  });
});

// ============================
// VOID PIN VERIFICATION
// ============================

// Verify Void PIN for a user
app.post("/users/:id/verify-void-pin", requireUserBranch, async (req, res) => {
  const { id } = req.params;
  const { void_pin } = req.body;
  const userBranch = req.user.branch;

  if (!void_pin) {
    return res.status(400).json({
      success: false,
      message: "Void PIN is required",
    });
  }

  // First, check if the requesting user has permission
  if (req.user.role !== "admin" && req.user.role !== "owner" && req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "You don't have permission to verify Void PIN",
    });
  }

  // Get the user's stored void PIN
  const query = "SELECT void_pin, role FROM users WHERE id = ?";
  
  db.execute(query, [id], async (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = results[0];
    
    // Check if user has a Void PIN set
    if (!user.void_pin) {
      return res.status(400).json({
        success: false,
        message: "User does not have a Void PIN set",
      });
    }

    // Verify the PIN
    try {
      const isMatch = await bcrypt.compare(void_pin, user.void_pin);
      
      if (isMatch) {
        res.json({
          success: true,
          message: "Void PIN verified successfully",
          role: user.role,
        });
      } else {
        res.status(401).json({
          success: false,
          message: "Invalid Void PIN",
        });
      }
    } catch (error) {
      console.error("Error verifying Void PIN:", error);
      res.status(500).json({
        success: false,
        message: "Error verifying Void PIN",
      });
    }
  });
});

// Check if user has Void PIN
app.get("/users/:id/has-void-pin", requireUserBranch, (req, res) => {
  const { id } = req.params;

  const query = "SELECT void_pin, role FROM users WHERE id = ?";
  
  db.execute(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = results[0];
    
    res.json({
      success: true,
      has_void_pin: !!user.void_pin,
      role: user.role,
    });
  });
});

/// ============================
// ANNOUNCEMENTS - FIXED VERSION
// ============================

// Get announcements - show global announcements to all, branch-specific to respective branches

app.get("/announcements", requireUserBranch, (req, res) => {
  const userBranch = req.user.branch;
  const userRole = req.user.role;
  const requestedBranch = req.query.branch; // Get branch from query parameter

  console.log("Fetching announcements:", {
    userBranch: userBranch,
    userRole: userRole,
    requestedBranch: requestedBranch
  });

  let query;
  let params = [];

  // Kapag admin/owner at may specific branch filter
  if ((userRole === "admin" || userRole === "owner") && requestedBranch) {
    query = `
      SELECT * FROM announcements 
      WHERE is_global = TRUE OR branch = ?
      ORDER BY 
        CASE WHEN is_global = TRUE THEN 1 ELSE 2 END,
        created_at DESC
    `;
    params = [requestedBranch];
  }
  // Kapag admin/owner at WALANG branch filter (default: lahat ng announcements)
  else if (userRole === "admin" || userRole === "owner") {
    query = `
      SELECT * FROM announcements 
      ORDER BY 
        CASE WHEN is_global = TRUE THEN 1 ELSE 2 END,
        created_at DESC
    `;
    params = [];
  }
  // Para sa non-admin users
  else {
    query = `
      SELECT * FROM announcements 
      WHERE is_global = TRUE OR branch = ?
      ORDER BY 
        CASE WHEN is_global = TRUE THEN 1 ELSE 2 END,
        created_at DESC
    `;
    params = [userBranch];
  }

  console.log("Executing query:", query);
  console.log("With params:", params);

  db.execute(query, params, (err, results) => {
    if (err) {
      console.error("Error fetching announcements:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    console.log(`Found ${results.length} announcements`);
    res.json(results);
  });
});
// Create announcement - automatically global for admin/owner - FIXED
app.post("/announcements", requireUserBranch, (req, res) => {
  const { title, content, author, type } = req.body;
  const userBranch = req.user.branch;
  const userRole = req.user.role;

  console.log("Creating announcement:", { 
    title, 
    author, 
    userRole,
    userBranch 
  });

  if (!title || !content || !author) {
    return res.status(400).json({
      success: false,
      message: "Title, content, and author are required",
    });
  }

  // AUTOMATICALLY GLOBAL FOR ADMIN/OWNER, BRANCH-SPECIFIC FOR OTHERS
  let finalIsGlobal = false;
  let finalBranch = userBranch;

  if (userRole === "admin" || userRole === "owner") {
    finalIsGlobal = true;  // AUTO-GLOBAL for admin/owner
    finalBranch = null;    // No specific branch
    console.log("Admin/Owner posting - MAKING IT GLOBAL");
  } else {
    console.log("Non-admin posting - BRANCH SPECIFIC:", userBranch);
  }

  const query = `
    INSERT INTO announcements (title, message, author, type, branch, is_global)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.execute(
    query,
    [title, content, author, type || "info", finalBranch, finalIsGlobal],
    (err, results) => {
      if (err) {
        console.error("Error creating announcement:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      console.log("Announcement created successfully:", {
        id: results.insertId,
        is_global: finalIsGlobal,
        branch: finalBranch,
        for_admin_owner: (userRole === "admin" || userRole === "owner") ? "GLOBAL" : "BRANCH_ONLY"
      });

      res.status(201).json({
        success: true,
        message: "Announcement created successfully",
        announcementId: results.insertId,
        is_global: finalIsGlobal,
        is_admin_owner: (userRole === "admin" || userRole === "owner")
      });
    }
  );
});

// Update announcement - check permissions - FIXED
app.put("/announcements/:id", requireUserBranch, (req, res) => {
  const { id } = req.params;
  const { title, content, type, is_global } = req.body;
  const userBranch = req.user.branch;
  const userRole = req.user.role;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "Title and content are required",
    });
  }

  // First, get the existing announcement to check permissions
  const getQuery = "SELECT * FROM announcements WHERE id = ?";
  
  db.execute(getQuery, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    const existingAnnouncement = results[0];
    
    // Check permissions
    // Admin/Owner can edit any announcement
    // Non-admin can only edit their branch announcements (not global ones)
    if (userRole !== "admin" && userRole !== "owner") {
      if (existingAnnouncement.is_global || existingAnnouncement.branch !== userBranch) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to edit this announcement",
        });
      }
    }

    // Determine if we need to update global status
    let updateQuery;
    let updateParams;

    if (userRole === "admin" || userRole === "owner") {
      // Admin can change global status
      const newIsGlobal = is_global ? 1 : 0;
      const newBranch = is_global ? null : userBranch;
      
      updateQuery = `
        UPDATE announcements 
        SET title = ?, message = ?, type = ?, is_global = ?, branch = ?
        WHERE id = ?
      `;
      updateParams = [title, content, type || "info", newIsGlobal, newBranch, id];
    } else {
      // Non-admin can only update content, not global status
      updateQuery = `
        UPDATE announcements 
        SET title = ?, message = ?, type = ?
        WHERE id = ?
      `;
      updateParams = [title, content, type || "info", id];
    }

    db.execute(updateQuery, updateParams, (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Announcement not found",
        });
      }

      res.json({ 
        success: true, 
        message: "Announcement updated",
        is_global: is_global || existingAnnouncement.is_global
      });
    });
  });
});

// Update announcement - check permissions
app.put("/announcements/:id", requireUserBranch, (req, res) => {
  const { id } = req.params;
  const { title, content, type, is_global } = req.body;
  const userBranch = req.user.branch;
  const userRole = req.user.role;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "Title and content are required",
    });
  }

  // First, get the existing announcement to check permissions
  const getQuery = "SELECT * FROM announcements WHERE id = ?";
  
  db.execute(getQuery, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    const existingAnnouncement = results[0];
    
    // Check permissions
    // Admin/Owner can edit any announcement
    // Non-admin can only edit their branch announcements (not global ones)
    if (userRole !== "admin" && userRole !== "owner") {
      if (existingAnnouncement.is_global || existingAnnouncement.branch !== userBranch) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to edit this announcement",
        });
      }
    }

    // Determine if we need to update global status
    let updateQuery;
    let updateParams;

    if (userRole === "admin" || userRole === "owner") {
      // Admin can change global status
      const newIsGlobal = is_global ? 1 : 0;
      const newBranch = is_global ? null : userBranch;
      
      updateQuery = `
        UPDATE announcements 
        SET title = ?, content = ?, type = ?, is_global = ?, branch = ?
        WHERE id = ?
      `;
      updateParams = [title, content, type || "info", newIsGlobal, newBranch, id];
    } else {
      // Non-admin can only update content, not global status
      updateQuery = `
        UPDATE announcements 
        SET title = ?, content = ?, type = ?
        WHERE id = ?
      `;
      updateParams = [title, content, type || "info", id];
    }

    db.execute(updateQuery, updateParams, (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Announcement not found",
        });
      }

      res.json({ 
        success: true, 
        message: "Announcement updated",
        is_global: is_global || existingAnnouncement.is_global
      });
    });
  });
});

// Delete announcement - check permissions
app.delete("/announcements/:id", requireUserBranch, (req, res) => {
  const { id } = req.params;
  const userBranch = req.user.branch;
  const userRole = req.user.role;

  // First, get the announcement to check permissions
  const getQuery = "SELECT * FROM announcements WHERE id = ?";
  
  db.execute(getQuery, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    const announcement = results[0];
    
    // Check permissions
    // Admin/Owner can delete any announcement
    // Non-admin can only delete their branch announcements (not global ones)
    if (userRole !== "admin" && userRole !== "owner") {
      if (announcement.is_global || announcement.branch !== userBranch) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to delete this announcement",
        });
      }
    }

    // Delete the announcement
    const deleteQuery = "DELETE FROM announcements WHERE id = ?";
    db.execute(deleteQuery, [id], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      
      res.json({ 
        success: true, 
        message: "Announcement deleted",
        was_global: announcement.is_global
      });
    });
  });
});

// ============================
// INVENTORY TOTAL VALUE ENDPOINT
// ============================

// Sa server-side code, i-update ang GET /inventory/total-value endpoint
app.get("/inventory/total-value", requireUserBranch, (req, res) => {
  const userBranch = req.user.branch;
  const { branch } = req.query;

  console.log("=== FETCHING INVENTORY TOTAL VALUE ===");

  let query;
  let params = [];

  if (branch && branch !== "all" && 
      (req.user.role === "admin" || req.user.role === "owner")) {
    // Query para sa specific branch (admin/owner)
    query = `
      SELECT 
        IFNULL(SUM(total_price), 0) as total_value,
        COUNT(*) as item_count
      FROM inventory_items 
      WHERE branch = ?
    `;
    params = [branch];
  } else if (req.user.role === "admin" || req.user.role === "owner") {
    // Query para sa lahat ng branches (admin/owner)
    query = `
      SELECT 
        IFNULL(SUM(total_price), 0) as total_value,
        COUNT(*) as item_count
      FROM inventory_items 
    `;
    params = [];
  } else {
    // Query para sa non-admin users (own branch lang)
    query = `
      SELECT 
        IFNULL(SUM(total_price), 0) as total_value,
        COUNT(*) as item_count
      FROM inventory_items 
      WHERE branch = ?
    `;
    params = [userBranch];
  }

  console.log("Query:", query);
  console.log("Params:", params);

  db.execute(query, params, (err, results) => {
    if (err) {
      console.error("Error:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching inventory total value",
        error: err.message,
      });
    }

    console.log("Result:", results[0]);

    const totalValue = results[0]?.total_value || 0;
    const itemCount = results[0]?.item_count || 0;

    res.json({
      success: true,
      totalValue: parseFloat(totalValue),
      itemCount: parseInt(itemCount),
      branch: branch || userBranch,
    });
  });
});

// Add debug endpoint to see raw data
app.get("/inventory/debug", requireUserBranch, (req, res) => {
  const userBranch = req.user.branch;
  const { branch } = req.query;
  
  const query = `
    SELECT 
      id,
      name,
      category,
      price,
      current_stock,
      total_price,
      (price * current_stock) as manual_calculation,
      branch
    FROM inventory_items 
    WHERE branch = ?
    ORDER BY id
  `;
  
  const targetBranch = branch || userBranch;
  
  db.execute(query, [targetBranch], (err, results) => {
    if (err) {
      console.error("Error debugging inventory:", err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`DEBUG: Found ${results.length} items for branch ${targetBranch}`);
    results.forEach(item => {
      console.log(`  ${item.name}: price=${item.price}, stock=${item.current_stock}, total_price=${item.total_price}, manual=${item.manual_calculation}`);
    });
    
    res.json(results);
  });
});

// ============================
// ITEMS ENDPOINTS
// ============================

// Get all items - automatically filtered by user's branch
app.get("/all-items", requireUserBranch, (req, res) => {
  const userBranch = req.user.branch;

  const query = `
    SELECT * FROM items 
    WHERE branch = ? 
    ORDER BY created_at DESC
  `;

  db.execute(query, [userBranch], (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json(results);
  });
});

// Get items - automatically filtered by user's branch
app.get("/items", requireUserBranch, (req, res) => {
  const userBranch = req.user.branch;

  const query = `
    SELECT * FROM items 
    WHERE branch = ? 
    ORDER BY created_at DESC
  `;

  db.execute(query, [userBranch], (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json(results);
  });
});

// Create item - automatically uses user's branch
app.post("/items", requireUserBranch, (req, res) => {
  const { product_code, name, category, description_type, price, image } =
    req.body;
  const userBranch = req.user.branch;

  console.log("=== BACKEND: CREATING ITEM ===");
  console.log("User branch:", userBranch);
  console.log("Request body:", req.body);

  if (description_type === "k-street Flavor") {
    if (!product_code || !name || !category || !description_type || !image) {
      console.log("Missing fields for flavor item");
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    const finalPrice = Number(price) || 0;

    db.execute(
      "INSERT INTO items (product_code, name, category, description_type, price, image, branch) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        product_code,
        name,
        category,
        description_type,
        finalPrice,
        image,
        userBranch,
      ],
      (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: err.message,
          });
        }

        console.log("✅ FLAVOR ITEM CREATED SUCCESSFULLY!");
        res.status(201).json({
          success: true,
          id: results.insertId,
          product_code,
          name,
          category,
          description_type,
          price: finalPrice,
          image,
          branch: userBranch,
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
        message: "All fields are required",
      });
    }

    db.execute(
      "INSERT INTO items (product_code, name, category, description_type, price, image, branch) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        product_code,
        name,
        category,
        description_type,
        Number(price),
        image,
        userBranch,
      ],
      (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: err.message,
          });
        }

        console.log("✅ REGULAR ITEM CREATED SUCCESSFULLY!");
        res.status(201).json({
          success: true,
          id: results.insertId,
          product_code,
          name,
          category,
          description_type,
          price: Number(price),
          image,
          branch: userBranch,
        });
      }
    );
  }
});

// Update item - only if it belongs to user's branch
app.put("/items/:id", requireUserBranch, (req, res) => {
  const { id } = req.params;
  const { product_code, name, category, description_type, price, image } =
    req.body;
  const userBranch = req.user.branch;

  console.log("=== BACKEND: UPDATING ITEM ===");
  console.log("Item ID:", id);
  console.log("User branch:", userBranch);
  console.log("Request body:", req.body);

  if (!product_code || !name || !price) {
    return res.status(400).json({
      success: false,
      message: "Product code, name, and price are required",
    });
  }

  const sqlGet = "SELECT image FROM items WHERE id = ? AND branch = ?";
  db.query(sqlGet, [id, userBranch], (err, result) => {
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
        message: "Item not found or you don't have permission to edit it",
      });
    }

    const existingImage = result[0]?.image;
    const finalImage = image && image.trim() !== "" ? image : existingImage;

    const sqlUpdate = `
      UPDATE items 
      SET product_code=?, name=?, category=?, description_type=?, price=?, image=?
      WHERE id=? AND branch=?
    `;

    db.query(
      sqlUpdate,
      [
        product_code,
        name,
        category,
        description_type,
        price,
        finalImage,
        id,
        userBranch,
      ],
      (err3, results) => {
        if (err3) {
          console.error("Update failed:", err3);
          return res.status(500).json({
            success: false,
            message: "Update failed",
          });
        }

        if (results.affectedRows === 0) {
          return res.status(403).json({
            success: false,
            message: "You don't have permission to update this item",
          });
        }

        console.log("✅ ITEM UPDATED SUCCESSFULLY!");
        res.json({
          success: true,
          message: "Item updated successfully",
          id: parseInt(id),
        });
      }
    );
  });
});

// Delete item - only if it belongs to user's branch
app.delete("/items/:id", requireUserBranch, (req, res) => {
  const { id } = req.params;
  const userBranch = req.user.branch;

  console.log("=== BACKEND: DELETING ITEM ===");
  console.log("Item ID to delete:", id);
  console.log("User branch:", userBranch);

  db.execute(
    "DELETE FROM items WHERE id = ? AND branch = ?",
    [id, userBranch],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Item not found or you don't have permission to delete it",
        });
      }

      console.log("✅ ITEM DELETED SUCCESSFULLY!");
      res.json({
        success: true,
        message: "Item deleted successfully",
        deletedId: id,
      });
    }
  );
});

// ============================
// ORDERS ENDPOINTS
// ============================

// Get orders - automatically filtered by user's branch
// Get orders - automatically filtered by user's branch
app.get("/orders", requireUserBranch, (req, res) => {
  const userBranch = req.user.branch;
  const userRole = req.user.role;

  console.log(`=== FETCHING ORDERS ===`);
  console.log(`User role: ${userRole}`);
  console.log(`User branch: ${userBranch}`);
  console.log(`Query parameter branch: ${req.query.branch}`);
  console.log(`Request headers user:`, req.user);

  let query;
  let params = [];

  // If query parameter has branch filter
  if (req.query.branch) {
    console.log(`Using branch filter from query: ${req.query.branch}`);
    
    if (req.query.branch === "all") {
      // Show all orders for all branches (admin only)
      if (userRole === "admin" || userRole === "owner") {
        query = `
          SELECT 
            o.*,
            u.email as cashier
          FROM orders o
          LEFT JOIN users u ON o.userId = u.id
          ORDER BY o.created_at DESC
        `;
        console.log("Admin viewing all orders from all branches");
      } else {
        // Non-admin can only see their own branch even if they request "all"
        query = `
          SELECT 
            o.*,
            u.email as cashier
          FROM orders o
          LEFT JOIN users u ON o.userId = u.id
          WHERE o.branch = ?
          ORDER BY o.created_at DESC
        `;
        params = [userBranch];
        console.log("Non-admin restricted to own branch:", userBranch);
      }
    } else {
      // Specific branch requested
      if (userRole === "admin" || userRole === "owner") {
        // Admin can view any specific branch
        query = `
          SELECT 
            o.*,
            u.email as cashier
          FROM orders o
          LEFT JOIN users u ON o.userId = u.id
          WHERE o.branch = ?
          ORDER BY o.created_at DESC
        `;
        params = [req.query.branch];
        console.log("Admin viewing specific branch:", req.query.branch);
      } else {
        // Non-admin can only view their own branch
        if (req.query.branch === userBranch) {
          query = `
            SELECT 
              o.*,
              u.email as cashier
            FROM orders o
            LEFT JOIN users u ON o.userId = u.id
            WHERE o.branch = ?
            ORDER BY o.created_at DESC
          `;
          params = [userBranch];
          console.log("Non-admin viewing own branch:", userBranch);
        } else {
          // Non-admin trying to view different branch - return empty
          console.log("Non-admin trying to view different branch. Returning empty array.");
          return res.json([]);
        }
      }
    }
  } else {
    // No branch query parameter - use default behavior
    if (userRole === "admin" || userRole === "owner") {
      // Admin sees all orders by default
      query = `
        SELECT 
          o.*,
          u.email as cashier
        FROM orders o
        LEFT JOIN users u ON o.userId = u.id
        ORDER BY o.created_at DESC
      `;
      console.log("Admin viewing all orders (no branch filter)");
    } else {
      // Non-admin sees only their branch
      query = `
        SELECT 
          o.*,
          u.email as cashier
        FROM orders o
        LEFT JOIN users u ON o.userId = u.id
        WHERE o.branch = ?
        ORDER BY o.created_at DESC
      `;
      params = [userBranch];
      console.log("Non-admin viewing own branch:", userBranch);
    }
  }

  console.log(`Executing query: ${query}`);
  console.log(`With params:`, params);

  db.execute(query, params, (err, results) => {
    if (err) {
      console.error("❌ Error fetching orders:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching orders",
        error: err.message,
      });
    }

    console.log(`✅ Found ${results.length} orders`);

    if (results.length > 0) {
      console.log(`Sample order data:`, {
        id: results[0].id,
        total: results[0].total,
        branch: results[0].branch,
        created_at: results[0].created_at,
        paidAmount: results[0].paidAmount,
      });
      
      // Log all unique branches found
      const branchesFound = [...new Set(results.map(order => order.branch || "main"))];
      console.log(`Branches found in results: ${branchesFound.join(", ")}`);
    }

    // Ensure each order has total field
    const formattedResults = results.map((order) => ({
      ...order,
      total: parseFloat(order.total) || parseFloat(order.paidAmount) || 0,
      paidAmount: parseFloat(order.paidAmount) || 0,
      changeAmount: parseFloat(order.changeAmount) || 0,
      discountApplied: order.discountApplied || 0,
      is_void: order.is_void || 0,
    }));

    res.json(formattedResults);
  });
});

// Void order - only if it belongs to user's branch
app.put("/orders/:id/void", requireUserBranch, (req, res) => {
  const { id } = req.params;
  const { is_void, void_reason, voided_by, voided_at } = req.body;
  const userBranch = req.user.branch;

  console.log("=== BACKEND: VOIDING ORDER ===");
  console.log("Order ID:", id);
  console.log("User branch:", userBranch);
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
    WHERE id = ? AND branch = ?
  `;

  const values = [
    is_void || 1,
    void_reason,
    voided_by || "Admin",
    voided_at || new Date().toISOString().slice(0, 19).replace("T", " "),
    id,
    userBranch,
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
        message: "Order not found or you don't have permission to void it",
      });
    }

    console.log("✅ ORDER VOIDED SUCCESSFULLY!");
    res.json({
      success: true,
      message: "Order voided successfully",
      orderId: id,
    });
  });
});

// Create order - automatically uses user's branch

 // Create order - automatically uses user's branch
app.post("/orders", requireUserBranch, (req, res) => {
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
  const userBranch = req.user.branch;

  console.log("User branch:", userBranch);
  console.log("Payment Method received:", paymentMethod);
  console.log("Discount applied (single field):", discountApplied);

  if (!userId || paidAmount === undefined) {
    console.error("Missing required fields: userId or paidAmount");
    return res.status(400).json({
      success: false,
      message: "Invalid order data: userId and paidAmount are required",
    });
  }

  const validPaymentMethods = ["Cash", "Gcash", "Gcash + Cash", "Grab"];
  const finalPaymentMethod = validPaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : "Cash";

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

  const query = `
    INSERT INTO orders 
    (userId, paidAmount, total, discountApplied, changeAmount, orderType, 
     productNames, items, payment_method, branch)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    parseInt(userId) || 0,
    parseFloat(paidAmount) || 0,
    parseFloat(total) || 0,
    discountApplied ? 1 : 0, // Ito na lang ang gamitin
    parseFloat(changeAmount) || 0,
    orderType || "Dine In",
    productNames || "No items",
    itemsString,
    finalPaymentMethod,
    userBranch,
  ];

  console.log("Using query:", query);
  console.log("SQL values:", values);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("❌ FAILED TO SAVE ORDER:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to save order to database",
        error: err.message,
      });
    }

    console.log("✅ ORDER SAVED SUCCESSFULLY!");
    console.log("Order ID:", result.insertId);
    console.log("Branch:", userBranch);
    console.log("Discount saved (single field):", discountApplied);

    res.status(200).json({
      success: true,
      message: "Order saved successfully",
      orderId: result.insertId,
      branch: userBranch,
    });
  });
});

// ============================
// INVENTORY ENDPOINTS
// ============================

// Get inventory items - automatically filtered by user's branch
app.get("/inventory", requireUserBranch, (req, res) => {
  const userBranch = req.user.branch;

  const query = `
    SELECT * FROM inventory_items 
    WHERE branch = ? 
    ORDER BY created_at DESC
  `;

  db.execute(query, [userBranch], (err, results) => {
    if (err) {
      console.error("Error fetching inventory items:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json(results);
  });
});

// Create inventory item - automatically uses user's branch
app.post("/inventory", requireUserBranch, (req, res) => {
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
  const userBranch = req.user.branch;

  console.log("=== BACKEND: CREATING INVENTORY ITEM ===");
  console.log("User branch:", userBranch);
  console.log("Request body:", req.body);

  if (!product_code || !name || !unit) {
    return res.status(400).json({
      success: false,
      message: "Product code, name, and unit are required",
    });
  }

  const query = `
    INSERT INTO inventory_items 
    (product_code, name, category, description, unit, current_stock, min_stock, supplier, price, total_price, branch)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      userBranch,
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
        branch: userBranch,
      });
    }
  );
});

// Update inventory item - only if it belongs to user's branch
app.put("/inventory/:id", requireUserBranch, (req, res) => {
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
  const userBranch = req.user.branch;

  console.log("=== BACKEND: UPDATING INVENTORY ITEM ===");
  console.log("Inventory ID:", id);
  console.log("User branch:", userBranch);
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
    WHERE id=? AND branch=?
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
      userBranch,
    ],
    (err, results) => {
      if (err) {
        console.error("Error updating inventory item:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Inventory item not found or you don't have permission to edit it",
        });
      }

      console.log("✅ INVENTORY ITEM UPDATED SUCCESSFULLY!");
      res.json({
        success: true,
        message: "Inventory item updated successfully",
      });
    }
  );
});

// Delete inventory item - only if it belongs to user's branch
app.delete("/inventory/:id", requireUserBranch, (req, res) => {
  const { id } = req.params;
  const userBranch = req.user.branch;

  console.log("=== BACKEND: DELETING INVENTORY ITEM ===");
  console.log("Inventory ID to delete:", id);
  console.log("User branch:", userBranch);

  db.execute(
    "DELETE FROM inventory_items WHERE id = ? AND branch = ?",
    [id, userBranch],
    (err, results) => {
      if (err) {
        console.error("Error deleting inventory item:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Inventory item not found or you don't have permission to delete it",
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

// ============================
// STORE HOURS LOGS (For Cashier Reports)
// ============================

// Get store hours logs - automatically filtered by user's branch
app.get("/store-hours-logs", requireUserBranch, (req, res) => {
  const userBranch = req.user.branch;

  const query = `
    SELECT 
      s.*,
      u.email as user_email
    FROM store_status_log s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.branch = ?
    ORDER BY s.timestamp DESC
  `;

  db.execute(query, [userBranch], (err, results) => {
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

// ============================
// ADMIN-ONLY ENDPOINTS (Cross-branch access)
// ============================
// ============================
// ADMIN: GET ALL STORE HOURS LOGS (Cross-branch)
// ============================
app.get("/admin/all-store-hours-logs", (req, res) => {
  // Check if user is admin/owner
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "owner")) {
    return res.status(403).json({
      success: false,
      message: "Admin/Owner access required",
    });
  }

  const query = `
    SELECT 
      s.*,
      u.email as user_email
    FROM store_status_log s
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.timestamp DESC
  `;

  db.execute(query, (err, results) => {
    if (err) {
      console.error("Error fetching all store hours logs:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching all store hours logs",
      });
    }
    res.json(results);
  });
});

// Get all data across all branches (ADMIN ONLY)
// Sa /admin/all-items endpoint
app.get("/admin/all-items", (req, res) => {
  // BAGO: Tanggapin ang parehong "admin" at "owner" na roles
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "owner")) {
    return res.status(403).json({
      success: false,
      message: "Admin/Owner access required",
    });
  }

  db.execute(
    "SELECT * FROM items ORDER BY branch, created_at DESC",
    (err, results) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.json(results);
    }
  );
});

app.get("/admin/all-orders", (req, res) => {
  // BAGO: Accept both "admin" and "owner" roles
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "owner")) {
    return res.status(403).json({
      success: false,
      message: "Admin/Owner access required",
    });
  }

  console.log(`=== ADMIN FETCHING ALL ORDERS ===`);
  console.log(`Admin user:`, req.user.email);
  console.log(`Admin role:`, req.user.role);

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
      console.error("❌ Error fetching all orders:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching orders",
      });
    }

    console.log(
      `✅ Admin found ${results.length} total orders across all branches`
    );

    const formattedResults = results.map((order) => ({
      ...order,
      total: parseFloat(order.total) || parseFloat(order.paidAmount) || 0,
      paidAmount: parseFloat(order.paidAmount) || 0,
    }));

    res.json(formattedResults);
  });
});

app.get("/admin/all-inventory", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  db.execute(
    "SELECT * FROM inventory_items ORDER BY branch, created_at DESC",
    (err, results) => {
      if (err) {
        console.error("Error fetching all inventory items:", err);
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json(results);
    }
  );
});

// ============================
// TEST ENDPOINT
// ============================

app.get("/", (req, res) => {
  res.json({
    message: "Backend is running!",
    features: {
      branch_filtering: "Automatic branch-based data filtering enabled",
      user_authentication: "User info required from headers",
      endpoints: {
        auth: {
          register: "POST /register",
          login: "POST /login",
        },
        store_hours: {
          current_status: "GET /store-hours/current-store-status",
          log_action: "POST /store-hours/log-store-action",
          logs: "GET /store-hours-logs",
        },
        items: "GET /items (branch-filtered)",
        orders: "GET /orders (branch-filtered)",
        inventory: "GET /inventory (branch-filtered)",
        announcements: "GET /announcements (branch-filtered)",
        users: "GET /users",
        admin: {
          all_items: "GET /admin/all-items",
          all_orders: "GET /admin/all-orders",
          all_inventory: "GET /admin/all-inventory",
        },
      },
    },
    note: "All data endpoints automatically filter by user's branch. Send user info in 'user' header as JSON string.",
  });
});

// ============================
// ERROR HANDLING
// ============================

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.url} not found`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ============================
// START SERVER
// ============================

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
