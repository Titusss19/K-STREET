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
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageCircle,
  MoreVertical,
  Clock,
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

  // NEW: Feedback Modals State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    title: "",
    message: "",
    type: "success", // success, error, warning
  });

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
    void_pin: "",
  });

  // VOIDED ORDERS STATE
  const [voidedOrders, setVoidedOrders] = useState([]);
  const [voidedSummary, setVoidedSummary] = useState({
    voided_count: 0,
    total_voided_amount: 0,
  });

  const navigate = useNavigate();

  // Helper function to show feedback modal
  const showFeedback = (title, message, type = "success") => {
    setFeedbackData({ title, message, type });
    setShowFeedbackModal(true);
  };

  // Helper function to close feedback modal
  const closeFeedback = () => {
    setShowFeedbackModal(false);
    setFeedbackData({ title: "", message: "", type: "success" });
  };

  // Feedback Modal Component
  const FeedbackModal = () => {
    if (!showFeedbackModal) return null;

    const config = {
      success: {
        icon: CheckCircle,
        iconColor: "text-green-500",
        bgColor: "bg-green-100",
        textColor: "text-green-800",
        buttonColor: "bg-green-500 hover:bg-green-600",
        borderColor: "border-green-200",
      },
      error: {
        icon: XCircle,
        iconColor: "text-red-500",
        bgColor: "bg-red-100",
        textColor: "text-red-800",
        buttonColor: "bg-red-500 hover:bg-red-600",
        borderColor: "border-red-200",
      },
      warning: {
        icon: AlertCircle,
        iconColor: "text-yellow-500",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-800",
        buttonColor: "bg-yellow-500 hover:bg-yellow-600",
        borderColor: "border-yellow-200",
      },
    };

    const { icon, iconColor, bgColor, textColor, buttonColor, borderColor } =
      config[feedbackData.type] || config.success;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
          <div
            className={`${bgColor} ${borderColor} border-2 rounded-xl p-4 mb-6`}
          >
            <div className="flex items-center justify-center mb-4">
              <div
                className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center`}
              >
                {React.createElement(icon, { size: 40, className: iconColor })}
              </div>
            </div>
            <h3 className={`text-xl font-bold text-center mb-2 ${textColor}`}>
              {feedbackData.title}
            </h3>
            <p className="text-center text-gray-700">{feedbackData.message}</p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={closeFeedback}
              className={`px-6 py-3 ${buttonColor} text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105`}
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to check if void_pin is valid
  const hasValidVoidPin = (employee) => {
    if (!employee || !employee.void_pin) return false;
    if (typeof employee.void_pin !== "string") return false;
    if (employee.void_pin.trim() === "") return false;
    if (employee.void_pin === "null") return false;
    if (employee.void_pin === "undefined") return false;
    return true;
  };

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

      if (Array.isArray(data)) {
        const transformedUsers = data.map((user) => ({
          id: user.id,
          email: user.email,
          username: user.username || "",
          role: user.role || "cashier",
          created_at: user.created_at,
          status: user.status || "Active",
          branch: user.branch || "main",
          void_pin: user.void_pin || null,
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
          void_pin: user.void_pin || null,
        }));
        setEmployees(transformedUsers);

        const uniqueBranches = [
          ...new Set(transformedUsers.map((u) => u.branch || "main")),
        ];
        setBranches(uniqueBranches);
      } else {
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

      const headers = getAuthHeaders();
      const response = await fetch(url, {
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let announcementsData = [];

      if (Array.isArray(data)) {
        announcementsData = data;
      } else if (data.success && Array.isArray(data.announcements)) {
        announcementsData = data.announcements;
      } else {
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

  const [inventoryTotal, setInventoryTotal] = useState({
    totalValue: 0,
    itemCount: 0,
  });

  const fetchInventoryTotal = async () => {
    try {
      const headers = getAuthHeaders();
      let url = "http://localhost:3002/inventory/total-value";

      if (
        selectedBranchFilter !== "all" &&
        (user?.role === "admin" || user?.role === "owner")
      ) {
        url = `http://localhost:3002/inventory/total-value?branch=${selectedBranchFilter}`;
      }

      const response = await fetch(url, {
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

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

      if (
        selectedBranchFilter !== "all" &&
        (user?.role === "admin" || user?.role === "owner")
      ) {
        url = `http://localhost:3002/orders?branch=${selectedBranchFilter}`;
      } else if (user?.role !== "admin" && user?.role !== "owner") {
        url = `http://localhost:3002/orders?branch=${user?.branch || "main"}`;
      }

      const response = await fetch(url, {
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ordersData = await response.json();

      let ordersArray = [];

      if (Array.isArray(ordersData)) {
        ordersArray = ordersData;
      } else if (ordersData.success && Array.isArray(ordersData.orders)) {
        ordersArray = ordersData.orders;
      } else {
        ordersArray = [];
      }

      // Set orders including voided
      setOrders(ordersArray);

      // Extract voided orders
      const voidedOrdersArray = ordersArray.filter(
        (order) => order.is_void === 1 || order.is_void === true
      );
      setVoidedOrders(voidedOrdersArray);

      // Calculate voided summary
      const voidedSummary = {
        voided_count: voidedOrdersArray.length,
        total_voided_amount: voidedOrdersArray.reduce((sum, order) => {
          const orderTotal =
            parseFloat(order.total) || parseFloat(order.paidAmount) || 0;
          return sum + orderTotal;
        }, 0),
      };
      setVoidedSummary(voidedSummary);

      // Process sales data (exclude voided orders)
      const nonVoidedOrders = ordersArray.filter(
        (order) => !(order.is_void === 1 || order.is_void === true)
      );
      const processedData = processOrdersData(nonVoidedOrders);
      setSalesData(processedData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setVoidedOrders([]);
      setVoidedSummary({
        voided_count: 0,
        total_voided_amount: 0,
      });
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
        salesData[dayIndex].today += orderTotal;
      }
    });

    for (let i = 1; i < salesData.length; i++) {
      salesData[i].yesterday = salesData[i - 1].today;
    }

    return salesData;
  };

  const calculateStats = () => {
    const today = new Date().toISOString().split("T")[0];

    let filteredOrders = [...orders];
    let filteredVoidedOrders = [...voidedOrders];

    if (selectedBranchFilter !== "all") {
      filteredOrders = orders.filter(
        (order) => (order.branch || "main") === selectedBranchFilter
      );
      filteredVoidedOrders = voidedOrders.filter(
        (order) => (order.branch || "main") === selectedBranchFilter
      );
    }

    // CALCULATE GROSS SALES (Lahat ng orders, kasama voided)
    const grossSales = filteredOrders.reduce((sum, order) => {
      const total =
        parseFloat(order.total) || parseFloat(order.paidAmount) || 0;
      return sum + total;
    }, 0);

    // CALCULATE VOIDED AMOUNT
    const voidedAmount = filteredVoidedOrders.reduce((sum, order) => {
      if (order.is_void === 1 || order.is_void === true) {
        const orderTotal =
          parseFloat(order.total) || parseFloat(order.paidAmount) || 0;
        return sum + orderTotal;
      }
      return sum;
    }, 0);

    // NET SALES = GROSS SALES - VOIDED AMOUNT
    const netSales = grossSales - voidedAmount;

    // Today's calculations
    const todayOrders = filteredOrders.filter((order) => {
      if (!order.created_at) return false;

      try {
        const orderDate = new Date(order.created_at)
          .toISOString()
          .split("T")[0];
        const isToday = orderDate === today;

        if (order.is_void === 1 || order.is_void === true) {
          return false;
        }

        return isToday;
      } catch (error) {
        return false;
      }
    });

    // Today's voided orders
    const todayVoidedOrders = filteredVoidedOrders.filter((order) => {
      if (!order.created_at && !order.voided_at) return false;

      try {
        const orderDate = new Date(order.created_at || order.voided_at)
          .toISOString()
          .split("T")[0];
        const isToday = orderDate === today;
        const isVoided = order.is_void === 1 || order.is_void === true;

        return isToday && isVoided;
      } catch (error) {
        return false;
      }
    });

    // Today's gross sales (kasama voided for today)
    const todayGrossSales = filteredOrders
      .filter((order) => {
        if (!order.created_at) return false;

        try {
          const orderDate = new Date(order.created_at)
            .toISOString()
            .split("T")[0];
          return orderDate === today;
        } catch (error) {
          return false;
        }
      })
      .reduce((sum, order) => {
        const total =
          parseFloat(order.total) || parseFloat(order.paidAmount) || 0;
        return sum + total;
      }, 0);

    // Today's voided amount
    const todayVoidedAmount = todayVoidedOrders.reduce((sum, order) => {
      const orderTotal =
        parseFloat(order.total) || parseFloat(order.paidAmount) || 0;
      return sum + orderTotal;
    }, 0);

    // Today's net sales
    const todayNetSales = todayGrossSales - todayVoidedAmount;

    // Transactions count (exclude voided)
    const todayTransactions = todayOrders.length;

    // Total transactions count (exclude voided)
    const totalTransactions = filteredOrders.filter(
      (order) => !(order.is_void === 1 || order.is_void === true)
    ).length;

    return {
      // BAGO: Gross Sales (lahat ng orders)
      grossSales: grossSales,

      // BAGO: Net Sales (gross minus voided)
      netSales: netSales,

      // BAGO: Voided Amount
      voidedAmount: voidedAmount,

      todaySales: todayNetSales, // net sales for today
      todayGrossSales: todayGrossSales, // gross sales for today
      todayVoidedAmount: todayVoidedAmount, // voided amount for today
      todayTransactions: todayTransactions,
      totalSales: netSales, // use net sales as total sales

      inventoryValue: inventoryTotal.totalValue,
      inventoryItemCount: inventoryTotal.itemCount,
      totalTransactions: totalTransactions,

      // Stats for display
      voidedOrdersCount: filteredVoidedOrders.filter(
        (order) => order.is_void === 1 || order.is_void === true
      ).length,
      todayVoidedOrdersCount: todayVoidedOrders.length,
    };
  };

  const getAnnouncementIcon = (type) => {
    switch (type) {
      case "info":
        return MessageCircle;
      case "success":
        return CheckCircle;
      case "warning":
        return AlertCircle;
      default:
        return MessageCircle;
    }
  };

  const getAnnouncementColor = (type) => {
    switch (type) {
      case "info":
        return "text-blue-500";
      case "success":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      default:
        return "text-blue-500";
    }
  };

  const getAnnouncementBgColor = (type) => {
    switch (type) {
      case "info":
        return "bg-blue-50";
      case "success":
        return "bg-green-50";
      case "warning":
        return "bg-yellow-50";
      default:
        return "bg-blue-50";
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
    fetchInventoryTotal();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      fetchOrders();
      fetchUsers();
      fetchInventoryTotal();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchInventoryTotal();
    }
  }, [selectedBranchFilter]);

  useEffect(() => {
    if (user && selectedBranchFilter !== "all") {
      const timer = setTimeout(() => {
        fetchOrders();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [selectedBranchFilter, user]);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [selectedBranchFilter, user]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("timeIn");
    navigate("/login");
  };

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  // Function to navigate to Attendance page
  const handleGoToAttendance = () => {
    navigate("/attendance");
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
            showFeedback(
              "Success!",
              "Global announcement posted successfully! Visible to ALL branches.",
              "success"
            );
          } else {
            showFeedback(
              "Success!",
              "Announcement posted successfully to your branch!",
              "success"
            );
          }
        } else {
          showFeedback(
            "Error",
            data.message || "Failed to post announcement",
            "error"
          );
        }
      } catch (error) {
        console.error("Error posting announcement:", error);
        showFeedback(
          "Error",
          "Error posting announcement. Please try again.",
          "error"
        );
      }
    } else {
      showFeedback(
        "Warning",
        "Please fill in both title and message fields.",
        "warning"
      );
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
        showFeedback("Error", "Passwords do not match!", "error");
        return;
      }

      if (newUser.password.length < 6) {
        showFeedback(
          "Error",
          "Password must be at least 6 characters!",
          "error"
        );
        return;
      }

      // Validate Void PIN for Manager/Admin
      if (newUser.role === "manager" || newUser.role === "admin") {
        if (!newUser.void_pin || newUser.void_pin.trim() === "") {
          showFeedback(
            "Warning",
            "Manager/Owner accounts must have a Void PIN.",
            "warning"
          );
          return;
        }

        if (newUser.void_pin.length < 4) {
          showFeedback("Error", "Void PIN must be at least 4 digits.", "error");
          return;
        }

        if (!/^\d+$/.test(newUser.void_pin)) {
          showFeedback("Error", "Void PIN must contain only numbers.", "error");
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
          showFeedback("Success!", "User added successfully!", "success");
        } else {
          showFeedback("Error", data.message || "Failed to add user", "error");
        }
      } catch (error) {
        console.error("Error adding user:", error);
        showFeedback("Error", "Error adding user. Please try again.", "error");
      }
    } else {
      showFeedback(
        "Warning",
        "Please fill all fields including branch!",
        "warning"
      );
    }
  };

  const handleEditEmployee = (employee) => {
    if (
      user?.role !== "admin" &&
      user?.role !== "owner" &&
      user?.role !== "manager"
    ) {
      showFeedback(
        "Access Denied",
        "You don't have permission to edit users.",
        "error"
      );
      return;
    }

    setSelectedEmployee({
      ...employee,
      username: employee.username || "",
      void_pin: "",
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async () => {
    if (selectedEmployee) {
      try {
        if (selectedEmployee.void_pin && selectedEmployee.void_pin.length > 0) {
          if (selectedEmployee.role === "cashier") {
            showFeedback(
              "Error",
              "Cashier accounts cannot have a Void PIN.",
              "error"
            );
            return;
          }

          if (selectedEmployee.void_pin.length < 4) {
            showFeedback(
              "Error",
              "Void PIN must be at least 4 digits.",
              "error"
            );
            return;
          }

          if (!/^\d+$/.test(selectedEmployee.void_pin)) {
            showFeedback(
              "Error",
              "Void PIN must contain only numbers.",
              "error"
            );
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
              void_pin: selectedEmployee.void_pin || null,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          // Wait for fetchUsers to complete before closing modal
          await fetchUsers();
          setShowEditModal(false);
          setSelectedEmployee(null);
          showFeedback("Success!", "User updated successfully!", "success");
        } else {
          showFeedback(
            "Error",
            data.message || "Failed to update user",
            "error"
          );
        }
      } catch (error) {
        console.error("Error updating user:", error);
        showFeedback(
          "Error",
          "Error updating user. Please try again.",
          "error"
        );
      }
    }
  };

  const handleDeleteEmployee = (employee) => {
    if (
      user?.role !== "admin" &&
      user?.role !== "owner" &&
      user?.role !== "manager"
    ) {
      showFeedback(
        "Access Denied",
        "You don't have permission to delete users.",
        "error"
      );
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
          showFeedback("Success!", "User deleted successfully!", "success");
        } else {
          showFeedback(
            "Error",
            data.message || "Failed to delete user",
            "error"
          );
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        showFeedback(
          "Error",
          "Error deleting user. Please try again.",
          "error"
        );
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

  const formatNumber = (num) => {
    const number = typeof num === "string" ? parseFloat(num) : num;

    if (isNaN(number)) return "0";

    if (number % 1 !== 0) {
      return number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return number.toLocaleString("en-US");
  };

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
              style={{ backgroundColor: "#FF001B" }}
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

                {/* Buttons section - Attendance button added here */}
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

                {/* Attendance Button - Mag-navigate sa Attendance.jsx */}
                <button
                  onClick={handleGoToAttendance}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Clock size={16} />
                  Attendance
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Card 1: Gross Sales */}
              <div
                className=" rounded-xl p-6  transform transition-all hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: "#FF5C6E" }}
              >
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
                    <div className="text-3xl font-bold text-white mb-1">
                      ₱{formatNumber(stats.grossSales)}
                    </div>
                    <div className="text-sm text-white mb-2">Net Sales</div>
                    <div className="text-xs text-white font-medium">
                      <p>All Time</p>
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Net Sales */}
              <div
                className=" rounded-xl p-6  transform transition-all hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: "#FEC600" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
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
                    <div className="text-3xl font-bold text-white mb-1">
                      ₱{formatNumber(stats.netSales)}
                    </div>
                    <div className="text-sm text-white mb-2">Net Sales</div>
                    <div className="text-xs text-white font-medium">
                      Voided: -₱
                      {formatNumber(stats.voidedAmount)}
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Today Transactions */}
              <div
                className=" rounded-xl p-6 borde transform transition-all hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: "#1E2C2E" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
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
                    <span className="ml-2 text-white">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white mb-1">
                      {formatNumber(stats.todayTransactions)}
                    </div>
                    <div className="text-sm text-white mb-2">
                      Today Transactions
                    </div>
                    <div className="text-xs text-white font-medium">
                      Net: ₱{formatNumber(stats.todaySales)} today
                      {stats.todayVoidedAmount > 0 && (
                        <span className="block text-orange-300">
                          Voided: -₱{formatNumber(stats.todayVoidedAmount)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Card 3: Inventory Value */}
              <div
                className="rounded-xl p-6 border border-black transform transition-all hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: "#4B3D79" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                    <Package className="text-blue-600" size={24} />
                  </div>
                  {(user?.role === "admin" || user?.role === "owner") &&
                    selectedBranchFilter !== "all" && (
                      <span className="text-xs bg-white px-2 py-1 rounded-full font-medium text-red-600 border border-red-300">
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
                    <span className="ml-2 text-white">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white mb-1">
                      {formatPeso(inventoryTotal.totalValue)}
                    </div>
                    <div className="text-sm text-white mb-2">
                      Inventory Value
                    </div>
                    <div className="text-xs text-white font-medium">
                      {formatNumber(inventoryTotal.itemCount)} items in stock
                    </div>
                  </>
                )}
              </div>

              {/* Card 4: Active Employees */}
              <div
                className="rounded-xl p-6 transform transition-all hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: "#A3C47C" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                    <Users className="text-purple-600" size={24} />
                  </div>
                  {(user?.role === "admin" || user?.role === "owner") &&
                    selectedBranchFilter !== "all" && (
                      <span className="text-xs bg-white px-2 py-1 rounded-full font-medium text-purple-600 border border-purple-300">
                        {selectedBranchFilter}
                      </span>
                    )}
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {formatNumber(
                    employees.filter((e) => e.status === "Active").length
                  )}
                </div>
                <div className="text-sm text-white mb-2">Active Employees</div>
                <div className="text-xs text-white font-medium">
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
                      className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 hover:from-black hover:to-black rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                    >
                      <Plus className="text-white" size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {announcementsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <RefreshCw
                        size={24}
                        className="animate-spin text-red-500"
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
                        className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        {/* Announcement Header */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <h4 className="font-semibold text-gray-800 text-sm">
                                  {announcement.author}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {announcement.time}
                                  </span>
                                  {announcement.is_global && (
                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                      Global
                                    </span>
                                  )}
                                  {!announcement.is_global &&
                                    announcement.branch && (
                                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                        {announcement.branch}
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Announcement Content */}
                        <div className="p-4">
                          <h3 className="font-bold text-gray-800 text-lg mb-2">
                            {announcement.title}
                          </h3>
                          <p className="text-gray-700 text-sm mb-3">
                            {announcement.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getAnnouncementBgColor(
                                announcement.type
                              )} ${getAnnouncementColor(announcement.type)}`}
                            >
                              <announcement.icon size={12} />
                              <span>
                                {announcement.type === "info"
                                  ? "Information"
                                  : announcement.type === "success"
                                  ? "Good News"
                                  : "Important Notice"}
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
                  <RefreshCw size={24} className="animate-spin text-red-500" />
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
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {employees.length === 0 ? (
                        <tr>
                          <td
                            colSpan="9"
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
                                    ? "bg-blue-100 text-red-700 border border-red-200"
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
                                ) : hasValidVoidPin(employee) ? (
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
                                {user?.role === "admin" ||
                                user?.role === "owner" ||
                                user?.role === "manager" ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleEditEmployee(employee)
                                      }
                                      className="p-2 bg-blue-50 hover:bg-red-100 text-blue-600 rounded-lg transition-colors"
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
                  <option value="warning">Warning (Yellow)</option>
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
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border-2 border-blue-200">
                  <p className="text-sm text-blue-700 font-bold">
                    <span className="font-extrabold">GLOBAL ANNOUNCEMENT</span>{" "}
                    - This will be visible to ALL branches automatically
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    (As Owner/Admin, your posts are automatically global)
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200">
                  <p className="text-sm text-gray-700 font-medium">
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

      {/* Add User Modal */}
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

      {/* Edit User Modal */}
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
                      hasValidVoidPin(selectedEmployee) ? (
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
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-600 hover:from-red-600 hover:to-red-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Delete Confirmation Modal */}
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

      {/* Feedback Modal */}
      <FeedbackModal />
    </div>
  );
}
