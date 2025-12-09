import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Components/Navbar/Navbar";
import FoodHubPOS from "../POS/POS";
import Sales from "../Sales/Sales";
import Items from "../Items/Items";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Activity,
  DollarSign,
  Package,
  Plus,
  Bell,
  X,
  UserPlus,
  Edit,
  Trash2,
  Calendar,
  Shield,
  UserCheck,
  UserCog,
  RefreshCw,
  Building,
  Filter,
  ChevronDown,
  
} from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [timeIn, setTimeIn] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [orders, setOrders] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    type: "info",
    is_global: false,
  });
  const [employees, setEmployees] = useState([]);

  const [newUser, setNewUser] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "cashier",
    status: "Active",
    branch: "main",
    void_pin: "", // ADD THIS
  });

  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const userData = localStorage.getItem("user");
    if (!userData) return {};

    try {
      const user = JSON.parse(userData);
      return {
        user: JSON.stringify(user),
        "x-user": JSON.stringify(user),
        "Content-Type": "application/json",
      };
    } catch (error) {
      console.error("Error parsing user data:", error);
      return {};
    }
  };

  // Helper function to validate Void PIN
  const validateVoidPin = (pin) => {
    if (!pin || pin.trim() === "") {
      return { valid: false, message: "Void PIN is required" };
    }
    if (pin.length < 4) {
      return { valid: false, message: "Void PIN must be at least 4 digits" };
    }
    if (!/^\d+$/.test(pin)) {
      return { valid: false, message: "Void PIN must contain only numbers" };
    }
    return { valid: true, message: "Void PIN is valid" };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch("http://localhost:3002/users", {
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Users API Response:", data);

      if (Array.isArray(data)) {
        const transformedUsers = data.map((user) => ({
          id: user.id,
          email: user.email,
          username: user.username || "",
          role: user.role || "cashier",
          created_at: user.created_at,
          status: user.status || "Active",
          branch: user.branch || "main",
          void_pin: user.void_pin || null, // ADD THIS LINE
        }));
        setEmployees(transformedUsers);

        const uniqueBranches = [
          ...new Set(transformedUsers.map((u) => u.branch || "main")),
        ];
        setBranches(uniqueBranches);
      } else if (data.success && Array.isArray(data.users)) {
        const transformedUsers = data.users.map((user) => ({
          id: user.id,
          email: user.email,
          username: user.username || "",
          role: user.role || "cashier",
          created_at: user.created_at,
          status: user.status || "Active",
          branch: user.branch || "main",
          void_pin: user.void_pin || null, // ADD THIS LINE
        }));
        setEmployees(transformedUsers);

        const uniqueBranches = [
          ...new Set(transformedUsers.map((u) => u.branch || "main")),
        ];
        setBranches(uniqueBranches);
      } else {
        console.error("Unexpected users response format:", data);
        setEmployees([]);
        setBranches([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setEmployees([]);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const userBranch = user?.branch;
      const userRole = user?.role;

      console.log("Fetching announcements for:", {
        branch: userBranch,
        role: userRole,
        selectedBranchFilter: selectedBranchFilter,
      });

      let url = "http://localhost:3002/announcements";

      if (
        (userRole === "admin" || userRole === "owner") &&
        selectedBranchFilter !== "all"
      ) {
        url = `http://localhost:3002/announcements?branch=${selectedBranchFilter}`;
      } else if (userRole === "admin" || userRole === "owner") {
        url = "http://localhost:3002/announcements";
      } else {
        url = `http://localhost:3002/announcements?branch=${userBranch}`;
      }

      console.log("Fetching from URL:", url);

      const headers = getAuthHeaders();
      const response = await fetch(url, {
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Announcements API Response:", data);

      let announcementsData = [];

      if (Array.isArray(data)) {
        announcementsData = data;
      } else if (data.success && Array.isArray(data.announcements)) {
        announcementsData = data.announcements;
      } else {
        console.error("Unexpected announcements response format:", data);
        announcementsData = [];
      }

      const transformedAnnouncements = announcementsData.map(
        (announcement) => ({
          id: announcement.id,
          type: announcement.type || "info",
          title: announcement.title,
          message: announcement.message || announcement.content || "",
          time: getTimeAgo(announcement.created_at),
          icon: getAnnouncementIcon(announcement.type || "info"),
          color: getAnnouncementColor(announcement.type || "info"),
          created_at: announcement.created_at,
          branch: announcement.is_global
            ? "All Branches"
            : announcement.branch || "main",
          is_global: announcement.is_global || false,
          author: announcement.author || "Admin",
        })
      );

      setAnnouncements(transformedAnnouncements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  };
  // Add this to your useState declarations
  const [inventoryTotal, setInventoryTotal] = useState({
    totalValue: 0,
    itemCount: 0,
  });

  // Add this function to fetch inventory total
  const fetchInventoryTotal = async () => {
    try {
      const headers = getAuthHeaders();
      let url = "http://localhost:3002/inventory/total-value";

      // If admin and branch filter is selected, add branch parameter
      if (
        selectedBranchFilter !== "all" &&
        (user?.role === "admin" || user?.role === "owner")
      ) {
        url = `http://localhost:3002/inventory/total-value?branch=${selectedBranchFilter}`;
      }

      console.log("Fetching inventory total from:", url);

      const response = await fetch(url, {
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Inventory total API Response:", data);

      if (data.success) {
        setInventoryTotal({
          totalValue: data.totalValue || 0,
          itemCount: data.itemCount || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching inventory total:", error);
      setInventoryTotal({
        totalValue: 0,
        itemCount: 0,
      });
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const headers = getAuthHeaders();

      let url = "http://localhost:3002/orders";

      console.log("Fetching orders for branch filter:", selectedBranchFilter);
      console.log("User role:", user?.role);

      if (
        selectedBranchFilter !== "all" &&
        (user?.role === "admin" || user?.role === "owner")
      ) {
        url = `http://localhost:3002/orders?branch=${selectedBranchFilter}`;
        console.log("Using filtered URL:", url);
      } else if (user?.role !== "admin" && user?.role !== "owner") {
        url = `http://localhost:3002/orders?branch=${user?.branch || "main"}`;
        console.log("Non-admin user, using branch:", user?.branch);
      }

      console.log("Final URL:", url);

      const response = await fetch(url, {
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ordersData = await response.json();
      console.log("Orders API Response data count:", ordersData.length || 0);

      let ordersArray = [];

      if (Array.isArray(ordersData)) {
        ordersArray = ordersData;
      } else if (ordersData.success && Array.isArray(ordersData.orders)) {
        ordersArray = ordersData.orders;
      } else {
        console.error("Unexpected orders response format:", ordersData);
        ordersArray = [];
      }

      console.log(`Found ${ordersArray.length} orders for current filter`);

      if (ordersArray.length > 0) {
        ordersArray.slice(0, 3).forEach((order, index) => {
          console.log(`Sample Order ${index + 1}:`, {
            id: order.id,
            total: order.total,
            paidAmount: order.paidAmount,
            branch: order.branch,
            created_at: order.created_at,
          });
        });
      }

      setOrders(ordersArray);

      const uniqueBranches = [
        ...new Set(ordersArray.map((order) => order.branch || "main")),
      ];
      console.log("Unique branches from orders:", uniqueBranches);

      setBranches((prev) => {
        const combined = [...new Set([...prev, ...uniqueBranches])];
        console.log("All unique branches combined:", combined);
        return combined;
      });

      const processedData = processOrdersData(ordersArray);
      setSalesData(processedData);

      setTimeout(() => {
        const stats = calculateStats();
        console.log("Stats after fetch:", stats);
      }, 100);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setSalesData([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const processOrdersData = (orders) => {
    const today = new Date();
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      last7Days.push(date.toISOString().split("T")[0]);
    }

    const salesData = last7Days.map((date) => ({
      day: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      date: date,
      today: 0,
      yesterday: 0,
    }));

    orders.forEach((order) => {
      if (!order.created_at) return;

      const orderDate = new Date(order.created_at).toISOString().split("T")[0];
      const dayIndex = last7Days.indexOf(orderDate);

      if (dayIndex !== -1) {
        const orderTotal =
          parseFloat(order.total) || parseFloat(order.paidAmount) || 0;
        console.log(
          `Adding order ${order.id} total: ${orderTotal} for date: ${orderDate}`
        );
        salesData[dayIndex].today += orderTotal;
      }
    });

    for (let i = 1; i < salesData.length; i++) {
      salesData[i].yesterday = salesData[i - 1].today;
    }

    console.log("Processed sales data:", salesData);
    return salesData;
  };

  const calculateStats = () => {
    const today = new Date().toISOString().split("T")[0];
    console.log("\n=== CALCULATING STATS ===");
    console.log("Today's date:", today);
    console.log("Selected branch filter:", selectedBranchFilter);
    console.log("Total orders in state:", orders.length);
    console.log("Inventory total value:", inventoryTotal.totalValue);

    let filteredOrders = [...orders];

    if (selectedBranchFilter !== "all") {
      filteredOrders = orders.filter(
        (order) => (order.branch || "main") === selectedBranchFilter
      );
    }

    console.log(
      `Filtered orders count: ${filteredOrders.length} for branch: ${selectedBranchFilter}`
    );

    const todayOrders = filteredOrders.filter((order) => {
      if (!order.created_at) {
        return false;
      }

      try {
        const orderDate = new Date(order.created_at)
          .toISOString()
          .split("T")[0];
        const isToday = orderDate === today;
        return isToday;
      } catch (error) {
        console.error("Error parsing date for order:", order.id, error);
        return false;
      }
    });

    const todaySales = todayOrders.reduce((sum, order) => {
      const total =
        parseFloat(order.total) ||
        parseFloat(order.paidAmount) ||
        parseFloat(order.amount) ||
        0;
      return sum + total;
    }, 0);

    const todayTransactions = todayOrders.length;

    const totalSales = filteredOrders.reduce((sum, order) => {
      const total =
        parseFloat(order.total) ||
        parseFloat(order.paidAmount) ||
        parseFloat(order.amount) ||
        0;
      return sum + total;
    }, 0);

    console.log("Final calculated stats:", {
      todaySales: `₱${todaySales.toFixed(2)}`,
      todayTransactions,
      totalSales: `₱${totalSales.toFixed(2)}`,
      inventoryValue: `₱${inventoryTotal.totalValue.toFixed(2)}`,
      inventoryItemCount: inventoryTotal.itemCount,
    });
    console.log("=== END STATS CALCULATION ===\n");

    return {
      todaySales,
      todayTransactions,
      totalSales,
      inventoryValue: inventoryTotal.totalValue, // ADD THIS
      inventoryItemCount: inventoryTotal.itemCount, // ADD THIS
    };
  };

  const getAnnouncementIcon = (type) => {
    switch (type) {
      case "info":
        return Activity;
      case "success":
        return TrendingUp;
      case "warning":
        return Bell;
      default:
        return Activity;
    }
  };

  const getAnnouncementColor = (type) => {
    switch (type) {
      case "info":
        return "blue";
      case "success":
        return "green";
      case "warning":
        return "purple";
      default:
        return "blue";
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const storedTimeIn = localStorage.getItem("timeIn");

    if (!isLoggedIn || !userData) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (!storedTimeIn) {
      const now = new Date().toISOString();
      localStorage.setItem("timeIn", now);
      setTimeIn(now);
    } else {
      setTimeIn(storedTimeIn);
    }

    fetchUsers();
    fetchAnnouncements();
    fetchOrders();
    fetchInventoryTotal(); // ADD THIS
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      fetchOrders();
      fetchUsers();
      fetchInventoryTotal(); // ADD THIS
    }
  }, [user]);

  // Add this useEffect for branch filter changes
  useEffect(() => {
    if (user) {
      console.log("Branch filter changed to:", selectedBranchFilter);
      fetchOrders();
      fetchInventoryTotal(); // ADD THIS
    }
  }, [selectedBranchFilter]);

  useEffect(() => {
    if (user && selectedBranchFilter !== "all") {
      console.log(
        "Branch filter changed to:",
        selectedBranchFilter,
        "fetching orders..."
      );
      const timer = setTimeout(() => {
        fetchOrders();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [selectedBranchFilter, user]);

  useEffect(() => {
    if (user) {
      console.log("Branch filter changed, fetching announcements...");
      fetchAnnouncements();
    }
  }, [selectedBranchFilter, user]);

  useEffect(() => {
    if (orders.length > 0) {
      console.log("Orders updated, recalculating stats...");
      console.log("Current branch filter:", selectedBranchFilter);

      const stats = calculateStats();
      console.log("Recalculated stats:", stats);
    }
  }, [selectedBranchFilter, orders]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("timeIn");
    navigate("/login");
  };

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const handleAddAnnouncement = async () => {
    if (newAnnouncement.title && newAnnouncement.message) {
      try {
        const headers = getAuthHeaders();
        const response = await fetch("http://localhost:3002/announcements", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            title: newAnnouncement.title,
            content: newAnnouncement.message,
            author: user?.email || "Admin",
            type: newAnnouncement.type,
          }),
        });

        const data = await response.json();

        if (data.success || data.announcementId) {
          fetchAnnouncements();
          setNewAnnouncement({
            title: "",
            message: "",
            type: "info",
          });
          setShowAnnouncementModal(false);

          if (user?.role === "admin" || user?.role === "owner") {
            alert(
              "Global announcement posted successfully! Visible to ALL branches."
            );
          } else {
            alert("Announcement posted successfully to your branch!");
          }
        } else {
          alert(data.message || "Failed to post announcement");
        }
      } catch (error) {
        console.error("Error posting announcement:", error);
        alert("Error posting announcement. Please try again.");
      }
    }
  };

  const handleAddUser = async () => {
    if (
      newUser.email &&
      newUser.username &&
      newUser.password &&
      newUser.confirmPassword &&
      newUser.branch
    ) {
      if (newUser.password !== newUser.confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      if (newUser.password.length < 6) {
        alert("Password must be at least 6 characters!");
        return;
      }

      // Validate Void PIN for Manager/Admin
      if (newUser.role === "manager" || newUser.role === "admin") {
        if (!newUser.void_pin || newUser.void_pin.trim() === "") {
          alert("Manager/Owner accounts must have a Void PIN.");
          return;
        }

        if (newUser.void_pin.length < 4) {
          alert("Void PIN must be at least 4 digits.");
          return;
        }

        if (!/^\d+$/.test(newUser.void_pin)) {
          alert("Void PIN must contain only numbers.");
          return;
        }
      }

      try {
        const headers = getAuthHeaders();
        const response = await fetch("http://localhost:3002/register", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            email: newUser.email,
            username: newUser.username,
            password: newUser.password,
            confirmPassword: newUser.confirmPassword,
            role: newUser.role,
            status: newUser.status,
            branch: newUser.branch,
            void_pin:
              newUser.role === "manager" || newUser.role === "admin"
                ? newUser.void_pin
                : null,
          }),
        });

        const data = await response.json();

        if (data.success) {
          fetchUsers();
          setNewUser({
            email: "",
            username: "",
            password: "",
            confirmPassword: "",
            role: "cashier",
            status: "Active",
            branch: "main",
            void_pin: "",
          });
          setShowAddUserModal(false);
          alert("User added successfully!");
        } else {
          alert(data.message || "Failed to add user");
        }
      } catch (error) {
        console.error("Error adding user:", error);
        alert("Error adding user. Please try again.");
      }
    } else {
      alert("Please fill all fields including branch!");
    }
  };

  const handleEditEmployee = (employee) => {
    // Allow admin, owner, and manager
    if (
      user?.role !== "admin" &&
      user?.role !== "owner" &&
      user?.role !== "manager"
    ) {
      alert("You don't have permission to edit users.");
      return;
    }

    setSelectedEmployee({
      ...employee,
      username: employee.username || "",
      void_pin: "", // Always empty for security
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async () => {
    if (selectedEmployee) {
      try {
        // Validate: Only manager/admin can set Void PIN
        if (selectedEmployee.void_pin && selectedEmployee.void_pin.length > 0) {
          if (selectedEmployee.role === "cashier") {
            alert("Cashier accounts cannot have a Void PIN.");
            return;
          }

          if (selectedEmployee.void_pin.length < 4) {
            alert("Void PIN must be at least 4 digits.");
            return;
          }

          // Check if PIN contains only numbers
          if (!/^\d+$/.test(selectedEmployee.void_pin)) {
            alert("Void PIN must contain only numbers.");
            return;
          }
        }

        const headers = getAuthHeaders();
        const response = await fetch(
          `http://localhost:3002/users/${selectedEmployee.id}`,
          {
            method: "PUT",
            headers: headers,
            body: JSON.stringify({
              email: selectedEmployee.email,
              username: selectedEmployee.username || "",
              role: selectedEmployee.role,
              status: selectedEmployee.status,
              branch: selectedEmployee.branch,
              void_pin: selectedEmployee.void_pin || null, // Send void_pin
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          fetchUsers();
          setShowEditModal(false);
          setSelectedEmployee(null);
          alert("User updated successfully!");
        } else {
          alert(data.message || "Failed to update user");
        }
      } catch (error) {
        console.error("Error updating user:", error);
        alert("Error updating user. Please try again.");
      }
    }
  };

  const handleDeleteEmployee = (employee) => {
    // Allow admin, owner, and manager
    if (
      user?.role !== "admin" &&
      user?.role !== "owner" &&
      user?.role !== "manager"
    ) {
      alert("You don't have permission to delete users.");
      return;
    }

    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const confirmDeleteEmployee = async () => {
    if (selectedEmployee) {
      try {
        const headers = getAuthHeaders();
        const response = await fetch(
          `http://localhost:3002/users/${selectedEmployee.id}`,
          {
            method: "DELETE",
            headers: headers,
          }
        );

        const data = await response.json();

        if (data.success) {
          fetchUsers();
          setShowDeleteModal(false);
          setSelectedEmployee(null);
          alert("User deleted successfully!");
        } else {
          alert(data.message || "Failed to delete user");
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Error deleting user. Please try again.");
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "Never") return "Never";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString || dateString === "Never") return "Just now";

    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  };

  // Format number with commas for thousands separator
  // Format number with commas for thousands separator - UPDATED
  const formatNumber = (num) => {
    // Convert to number if it's not already
    const number = typeof num === "string" ? parseFloat(num) : num;

    if (isNaN(number)) return "0";

    // For money (with 2 decimal places)
    if (number % 1 !== 0) {
      return number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    // For whole numbers (like item count)
    return number.toLocaleString("en-US");
  };

  // For peso formatting specifically (with ₱ sign)
  // Sa Dashboard component, tiyakin na gumagana ang formatPeso
  const formatPeso = (amount) => {
    const number = typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(number)) return "₱0.00";

    return `₱${number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <Shield size={14} />;
      case "manager":
        return <UserCog size={14} />;
      case "cashier":
        return <UserCheck size={14} />;
      default:
        return <UserCheck size={14} />;
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "admin":
        return "Owner";
      case "manager":
        return "Manager";
      case "cashier":
        return "Cashier";
      default:
        return role;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        user={user}
        activeView={activeView}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
        showWelcome={true}
      />
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        {activeView === "dashboard" ? (
          <div className="max-w-7xl mx-auto">
            {/* Welcome Message */}
            <div
              className="mb-6 rounded-xl shadow-lg p-6"
              style={{ backgroundColor: "#F64E60" }}
            >
              <h1 className="text-2xl font-bold text-white">
                Welcome, {user?.username || user?.email || "User"}!
              </h1>
              <p className="text-blue-100 mt-1">
                Here's what's happening with your business today.
              </p>
              {user?.branch && (
                <div className="mt-2 flex items-center gap-2">
                  <Building size={16} className="text-blue-200" />
                  <span className="text-blue-200 text-sm">
                    Branch: {user.branch}
                  </span>
                </div>
              )}
            </div>

            {/* Header with Branch Filter Dropdown */}
            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800"></h1>
              <div className="flex gap-2 items-center">
                {(user?.role === "admin" || user?.role === "owner") && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        const dropdown =
                          document.getElementById("branchDropdown");
                        dropdown.classList.toggle("hidden");
                      }}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all hover:shadow"
                    >
                      <Filter size={16} />
                      {selectedBranchFilter === "all"
                        ? "All Branches"
                        : selectedBranchFilter}
                      <ChevronDown size={16} className="transition-transform" />
                    </button>

                    <div
                      id="branchDropdown"
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 hidden"
                    >
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setSelectedBranchFilter("all");
                            document
                              .getElementById("branchDropdown")
                              .classList.add("hidden");
                            setTimeout(() => {
                              fetchOrders();
                            }, 100);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                            selectedBranchFilter === "all"
                              ? "bg-red-50 text-red-600 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          <Building size={14} />
                          All Branches
                          {selectedBranchFilter === "all" && (
                            <span className="ml-auto text-red-500">✓</span>
                          )}
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>

                        {branches.map((branch) => (
                          <button
                            key={branch}
                            onClick={() => {
                              setSelectedBranchFilter(branch);
                              document
                                .getElementById("branchDropdown")
                                .classList.add("hidden");
                              setTimeout(() => {
                                fetchOrders();
                              }, 100);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                              selectedBranchFilter === branch
                                ? "bg-red-50 text-red-600 font-medium"
                                : "text-gray-700"
                            }`}
                          >
                            <Building size={14} className="text-gray-400" />
                            {branch}
                            {selectedBranchFilter === branch && (
                              <span className="ml-auto text-red-500">✓</span>
                            )}
                          </button>
                        ))}

                        {branches.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            No branches found
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    fetchOrders();
                    fetchUsers();
                    fetchAnnouncements();
                  }}
                  disabled={ordersLoading || loading || announcementsLoading}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                  <RefreshCw
                    size={18}
                    className={
                      ordersLoading || loading || announcementsLoading
                        ? "animate-spin"
                        : ""
                    }
                  />
                  Refresh All
                </button>
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all hover:shadow">
                  <Package size={16} />
                  Attendance
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Card 1: Gross Sales */}
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200 transform transition-all hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-pink-200 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-pink-600" size={24} />
                  </div>
                  {(user?.role === "admin" || user?.role === "owner") &&
                    selectedBranchFilter !== "all" && (
                      <span className="text-xs bg-white px-2 py-1 rounded-full font-medium text-pink-600 border border-pink-300">
                        {selectedBranchFilter}
                      </span>
                    )}
                </div>
                {ordersLoading ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw
                      size={20}
                      className="animate-spin text-pink-600"
                    />
                    <span className="ml-2 text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                      ₱{formatNumber(stats.totalSales)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Gross Sales
                    </div>
                    <div className="text-xs text-pink-600 font-medium">
                      {selectedBranchFilter === "all"
                        ? "All branches"
                        : selectedBranchFilter}
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Today Transactions */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 transform transition-all hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="text-orange-600" size={24} />
                  </div>
                  {(user?.role === "admin" || user?.role === "owner") &&
                    selectedBranchFilter !== "all" && (
                      <span className="text-xs bg-white px-2 py-1 rounded-full font-medium text-orange-600 border border-orange-300">
                        {selectedBranchFilter}
                      </span>
                    )}
                </div>
                {ordersLoading ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw
                      size={20}
                      className="animate-spin text-orange-600"
                    />
                    <span className="ml-2 text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                      {formatNumber(stats.todayTransactions)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Today Transactions
                    </div>
                    <div className="text-xs text-orange-600 font-medium">
                      ₱{formatNumber(stats.todaySales)} today
                    </div>
                  </>
                )}
              </div>

              {/* Card 3: Inventory Value */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 transform transition-all hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                    <Package className="text-blue-600" size={24} />
                  </div>
                  {(user?.role === "admin" || user?.role === "owner") &&
                    selectedBranchFilter !== "all" && (
                      <span className="text-xs bg-white px-2 py-1 rounded-full font-medium text-blue-600 border border-blue-300">
                        {selectedBranchFilter}
                      </span>
                    )}
                </div>
                {ordersLoading ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw
                      size={20}
                      className="animate-spin text-blue-600"
                    />
                    <span className="ml-2 text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                      {formatPeso(inventoryTotal.totalValue)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Inventory Value
                    </div>
                    <div className="text-xs text-blue-600 font-medium">
                      {formatNumber(inventoryTotal.itemCount)} items in stock
                    </div>
                  </>
                )}
              </div>

              {/* Card 4: Active Employees */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 transform transition-all hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                    <Users className="text-purple-600" size={24} />
                  </div>
                  {(user?.role === "admin" || user?.role === "owner") &&
                    selectedBranchFilter !== "all" && (
                      <span className="text-xs bg-white px-2 py-1 rounded-full font-medium text-purple-600 border border-purple-300">
                        {selectedBorderFilter}
                      </span>
                    )}
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {formatNumber(
                    employees.filter((e) => e.status === "Active").length
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Active Employees
                </div>
                <div className="text-xs text-purple-600 font-medium">
                  Currently working
                </div>
              </div>
            </div>

            {/* Main Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Bell className="text-gray-700" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">
                      Announcements
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={fetchAnnouncements}
                      disabled={announcementsLoading}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                      title="Refresh Announcements"
                    >
                      <RefreshCw
                        size={16}
                        className={announcementsLoading ? "animate-spin" : ""}
                      />
                    </button>
                    <button
                      onClick={() => setShowAnnouncementModal(true)}
                      className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                    >
                      <Plus className="text-white" size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {announcementsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <RefreshCw
                        size={24}
                        className="animate-spin text-blue-500"
                      />
                      <span className="ml-2 text-gray-600">
                        Loading announcements...
                      </span>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No announcements yet
                    </div>
                  ) : (
                    announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className={`${
                          announcement.is_global
                            ? "bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300"
                            : `bg-${announcement.color}-50 border border-${announcement.color}-200`
                        } rounded-lg p-4 hover:shadow-md transition-all transform hover:-translate-y-0.5`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                              announcement.is_global
                                ? "bg-gradient-to-br from-purple-500 to-pink-500"
                                : `bg-gradient-to-br from-${announcement.color}-400 to-${announcement.color}-600`
                            }`}
                          >
                            <announcement.icon
                              className="text-white"
                              size={18}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-800 text-sm mb-1">
                                  {announcement.title}
                                </h4>
                                {announcement.is_global && (
                                  <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full font-bold">
                                    GLOBAL
                                  </span>
                                )}
                              </div>
                              {announcement.branch &&
                                !announcement.is_global && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                    {announcement.branch}
                                  </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {announcement.message}
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 font-medium">
                                {announcement.time}
                              </span>
                              <span className="text-xs text-gray-500">
                                by {announcement.author}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  System Users
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
                  >
                    <RefreshCw
                      size={18}
                      className={loading ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>

                  {/* "Add User" button - visible only to admin/owner/manager */}
                  {(user?.role === "admin" ||
                    user?.role === "owner" ||
                    user?.role === "manager") && (
                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                    >
                      <UserPlus size={18} />
                      Add User
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw size={24} className="animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Loading users...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          ID
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Username
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Void PIN
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Branch
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Account Created
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Actions
                          {user?.role !== "admin" && user?.role !== "owner" && (
                            <span className="text-xs font-normal text-gray-500 ml-2">
                              (Read only)
                            </span>
                          )}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {employees.length === 0 ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="py-8 text-center text-gray-500"
                          >
                            No users found
                          </td>
                        </tr>
                      ) : (
                        employees.map((employee) => (
                          <tr
                            key={employee.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-4 px-4 text-sm text-gray-600 font-medium">
                              {employee.id}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div>
                                  <span className="text-sm font-medium text-gray-800 block">
                                    {employee.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div>
                                  <span className="text-sm font-medium text-gray-800 block">
                                    {employee.username}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                                  employee.role === "admin"
                                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                                    : employee.role === "manager"
                                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                                    : "bg-green-100 text-green-700 border border-green-200"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {getRoleIcon(employee.role)}
                                  {getRoleDisplayName(employee.role)}
                                </div>
                              </span>
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1">
                                {employee.role === "cashier" ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    Not Required
                                  </span>
                                ) : employee.void_pin ? (
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                      <Shield size={10} className="mr-1" />
                                      PIN Set
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                      <Shield size={10} className="mr-1" />
                                      PIN Required
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
                                <Building size={12} className="mr-1" />
                                {employee.branch || "main"}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                {formatDate(employee.created_at)}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                                  employee.status === "Active"
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : "bg-gray-100 text-gray-700 border border-gray-200"
                                }`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full mr-2 ${
                                    employee.status === "Active"
                                      ? "bg-green-500"
                                      : "bg-gray-400"
                                  }`}
                                ></div>
                                {employee.status}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                {/* Show Edit/Delete buttons for admin/owner/manager */}
                                {user?.role === "admin" ||
                                user?.role === "owner" ||
                                user?.role === "manager" ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleEditEmployee(employee)
                                      }
                                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                      title="Edit User"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteEmployee(employee)
                                      }
                                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                      title="Delete User"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-500 italic px-3 py-1.5 bg-gray-100 rounded-full">
                                    View only
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeView === "pos" ? (
          user?.role !== "admin" && user?.role !== "owner" ? (
            <FoodHubPOS />
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-red-600 mb-4">
                  Access Restricted
                </h2>
                <p className="text-gray-600">
                  Owner/Admin accounts cannot access POS. Please use a Cashier
                  or Manager account.
                </p>
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )
        ) : activeView === "sales" ? (
          <Sales />
        ) : activeView === "Items" ? (
          <Items />
        ) : null}
      </main>

      {/* Add Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                New Announcement
              </h2>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={newAnnouncement.type}
                  onChange={(e) =>
                    setNewAnnouncement({
                      ...newAnnouncement,
                      type: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Purple)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) =>
                    setNewAnnouncement({
                      ...newAnnouncement,
                      title: e.target.value,
                    })
                  }
                  placeholder="Enter announcement title"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={newAnnouncement.message}
                  onChange={(e) =>
                    setNewAnnouncement({
                      ...newAnnouncement,
                      message: e.target.value,
                    })
                  }
                  placeholder="Enter announcement message"
                  rows="4"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                ></textarea>
              </div>

              {user?.role === "admin" || user?.role === "owner" ? (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border-2 border-purple-300">
                  <p className="text-sm text-purple-700 font-bold">
                    <span className="font-extrabold">GLOBAL ANNOUNCEMENT</span>{" "}
                    - This will be visible to ALL branches automatically
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    (As Owner/Admin, your posts are automatically global)
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">
                    This announcement will be posted to:{" "}
                    <span className="font-bold">{user?.branch}</span> branch
                    only
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAnnouncement}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                >
                  Post Announcement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal - Only accessible to admin/owner */}
      {showAddUserModal &&
        (user?.role === "admin" ||
          user?.role === "owner" ||
          user?.role === "manager") && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Add New User
                </h2>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        email: e.target.value,
                      })
                    }
                    placeholder="Enter email address"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        username: e.target.value,
                      })
                    }
                    placeholder="Enter username"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        password: e.target.value,
                      })
                    }
                    placeholder="Enter password (min. 6 characters)"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Confirm password"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Owner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={newUser.branch}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        branch: e.target.value,
                      })
                    }
                    placeholder="Enter branch name (e.g., Main, Branch1, Branch2)"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={newUser.status}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        status: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddUser}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                  >
                    Add User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {showEditModal &&
        selectedEmployee &&
        (user?.role === "admin" ||
          user?.role === "owner" ||
          user?.role === "manager") && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Edit User</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                  }}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={selectedEmployee.username || ""}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        username: e.target.value,
                      })
                    }
                    placeholder="Enter username"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be displayed in the welcome message
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={selectedEmployee.email}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={selectedEmployee.role}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        role: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Owner</option>
                  </select>
                </div>

                {/* VOID PIN FIELD FOR EXISTING USER - ADD THIS SECTION */}
                {(selectedEmployee.role === "manager" ||
                  selectedEmployee.role === "admin") && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
                        <Shield size={16} />
                        Void PIN (Required for Order Voiding)
                      </h4>
                      {selectedEmployee.void_pin && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✓ Currently Set
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={selectedEmployee.void_pin || ""}
                      onChange={(e) =>
                        setSelectedEmployee({
                          ...selectedEmployee,
                          void_pin: e.target.value,
                        })
                      }
                      placeholder="Enter new PIN or leave blank to keep existing"
                      className="w-full px-4 py-2.5 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    />
                    <div className="mt-2 text-xs text-yellow-600 space-y-1">
                      <div className="flex items-center gap-1">
                        {selectedEmployee.void_pin &&
                        selectedEmployee.void_pin.length >= 4 ? (
                          <span className="text-green-600">
                            ✓ Minimum 4 digits
                          </span>
                        ) : (
                          <span>• Minimum 4 digits (if setting new PIN)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {selectedEmployee.void_pin &&
                        /^\d+$/.test(selectedEmployee.void_pin) ? (
                          <span className="text-green-600">✓ Only numbers</span>
                        ) : (
                          <span>• Only numbers allowed</span>
                        )}
                      </div>
                      <div className="text-gray-500 italic">
                        • Leave empty to keep current PIN
                      </div>
                    </div>
                  </div>
                )}

                {selectedEmployee.role === "cashier" && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <Shield size={14} className="inline mr-1" />
                      <strong>Note:</strong> Cashier accounts don't require a
                      Void PIN.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={selectedEmployee.branch || "main"}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        branch: e.target.value,
                      })
                    }
                    placeholder="Enter branch name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={selectedEmployee.status}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        status: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Account Information
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>ID:</strong> {selectedEmployee.id}
                    </p>
                    <p>
                      <strong>Created:</strong>{" "}
                      {formatDate(selectedEmployee.created_at)}
                    </p>
                    {selectedEmployee.role === "manager" ||
                    selectedEmployee.role === "admin" ? (
                      selectedEmployee.void_pin ? (
                        <p className="text-green-600">
                          <strong>Void PIN:</strong> Set (●●●●)
                        </p>
                      ) : (
                        <p className="text-red-600">
                          <strong>Void PIN:</strong> Required - Please set a PIN
                        </p>
                      )
                    ) : (
                      <p className="text-gray-500">
                        <strong>Void PIN:</strong> Not required for Cashier
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedEmployee(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateEmployee}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Delete Confirmation Modal - Only accessible to admin/owner */}
      {showDeleteModal &&
        selectedEmployee &&
        (user?.role === "admin" ||
          user?.role === "owner" ||
          user?.role === "manager") && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Delete User</h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEmployee(null);
                  }}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                  <Trash2 className="text-red-600" size={32} />
                </div>
                <p className="text-center text-gray-700 mb-2">
                  Are you sure you want to delete this user?
                </p>
                <p className="text-center text-sm text-gray-600">
                  <strong>{selectedEmployee.email}</strong>
                </p>
                <p className="text-center text-xs text-gray-500 mt-1">
                  Role: {getRoleDisplayName(selectedEmployee.role)}
                </p>
                <p className="text-center text-xs text-gray-500 mt-1">
                  Branch: {selectedEmployee.branch || "main"}
                </p>
                <p className="text-center text-sm text-gray-500 mt-1">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEmployee(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEmployee}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
