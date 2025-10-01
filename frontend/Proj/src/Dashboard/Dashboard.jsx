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

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    type: "info",
  });

  const [employees, setEmployees] = useState([]);

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "cashier",
    status: "Active",
  });

  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3002/users");
      const data = await response.json();

      if (data.success) {
        const transformedUsers = data.users.map((user) => ({
          id: user.id,
          email: user.email,
          role: user.role || "cashier",
          created_at: user.created_at,
          status: user.status || "Active",
        }));

        setEmployees(transformedUsers);
      } else {
        console.error("Failed to fetch users:", data.message);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const response = await fetch("http://localhost:3002/announcements");
      const data = await response.json();

      if (data.success) {
        const transformedAnnouncements = data.announcements.map(
          (announcement) => ({
            id: announcement.id,
            type: announcement.type,
            title: announcement.title,
            message: announcement.message,
            time: getTimeAgo(announcement.created_at),
            icon: getAnnouncementIcon(announcement.type),
            color: getAnnouncementColor(announcement.type),
            created_at: announcement.created_at,
          })
        );

        setAnnouncements(transformedAnnouncements);
      } else {
        console.error("Failed to fetch announcements:", data.message);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await fetch("http://localhost:3002/orders");
      const ordersData = await response.json();

      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
        const processedData = processOrdersData(ordersData);
        setSalesData(processedData);
      } else {
        console.error("Failed to fetch orders:", ordersData);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
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
      const orderDate = new Date(order.created_at).toISOString().split("T")[0];
      const dayIndex = last7Days.indexOf(orderDate);

      if (dayIndex !== -1) {
        salesData[dayIndex].today += parseFloat(order.total) || 0;
      }
    });

    for (let i = 1; i < salesData.length; i++) {
      salesData[i].yesterday = salesData[i - 1].today;
    }

    return salesData;
  };

  const calculateStats = () => {
    const today = new Date().toISOString().split("T")[0];

    const todaySales = orders
      .filter(
        (order) =>
          new Date(order.created_at).toISOString().split("T")[0] === today
      )
      .reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);

    const todayTransactions = orders.filter(
      (order) =>
        new Date(order.created_at).toISOString().split("T")[0] === today
    ).length;

    const totalSales = orders.reduce(
      (sum, order) => sum + (parseFloat(order.total) || 0),
      0
    );

    return {
      todaySales,
      todayTransactions,
      totalSales,
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

    setUser(JSON.parse(userData));

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
  }, [navigate]);

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
        const response = await fetch("http://localhost:3002/announcements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: newAnnouncement.title,
            message: newAnnouncement.message,
            type: newAnnouncement.type,
          }),
        });

        const data = await response.json();

        if (data.success) {
          fetchAnnouncements();
          setNewAnnouncement({ title: "", message: "", type: "info" });
          setShowAnnouncementModal(false);
          alert("Announcement posted successfully!");
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
    if (newUser.email && newUser.password && newUser.confirmPassword) {
      if (newUser.password !== newUser.confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      if (newUser.password.length < 6) {
        alert("Password must be at least 6 characters!");
        return;
      }

      try {
        const response = await fetch("http://localhost:3002/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: newUser.email,
            password: newUser.password,
            confirmPassword: newUser.confirmPassword,
            role: newUser.role,
            status: newUser.status,
          }),
        });

        const data = await response.json();

        if (data.success) {
          fetchUsers();
          setNewUser({
            email: "",
            password: "",
            confirmPassword: "",
            role: "cashier",
            status: "Active",
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
    }
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async () => {
    if (selectedEmployee) {
      try {
        const response = await fetch(
          `http://localhost:3002/users/${selectedEmployee.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: selectedEmployee.email,
              role: selectedEmployee.role,
              status: selectedEmployee.status,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          fetchUsers(); // Refresh the list
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
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const confirmDeleteEmployee = async () => {
    if (selectedEmployee) {
      try {
        const response = await fetch(
          `http://localhost:3002/users/${selectedEmployee.id}`,
          {
            method: "DELETE",
          }
        );

        const data = await response.json();

        if (data.success) {
          fetchUsers(); // Refresh the list
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
        return "Administrator";
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
            <div className="mb-6 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6">
              <h1 className="text-2xl font-bold text-white">
                Welcome, {user?.email || "User"}!
              </h1>
              <p className="text-blue-100 mt-1">
                Here's what's happening with your business today.
              </p>
            </div>

            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">
                Today's Sales
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={fetchOrders}
                  disabled={ordersLoading}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                  <RefreshCw
                    size={18}
                    className={ordersLoading ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all hover:shadow">
                  <Package size={16} />
                  Export
                </button>
              </div>
            </div>

            {/* Stats Cards - UPDATED: 3 cards na lang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Total Sales */}
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200 transform transition-all hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-pink-200 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-pink-600" size={24} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  ₱{stats.totalSales.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 mb-2">Total Sales</div>
                <div className="text-xs text-pink-600 font-medium">
                  All time revenue
                </div>
              </div>

              {/* Today's Sales */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 transform transition-all hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="text-orange-600" size={24} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {stats.todayTransactions}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Today Transactions
                </div>
                <div className="text-xs text-orange-600 font-medium">
                  ₱{stats.todaySales.toFixed(2)} today
                </div>
              </div>

              {/* Active Employees */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 transform transition-all hover:scale-105 hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                    <Users className="text-purple-600" size={24} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {employees.filter((e) => e.status === "Active").length}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Active Employees
                </div>
                <div className="text-xs text-purple-600 font-medium">
                  Currently working
                </div>
              </div>
            </div>

            {/* Main Grid - UPDATED: Announcements lang ang natira */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
              {/* Announcements - Full width na */}
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
                        className={`bg-${announcement.color}-50 border border-${announcement.color}-200 rounded-lg p-4 hover:shadow-md transition-all transform hover:-translate-y-0.5`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 bg-gradient-to-br from-${announcement.color}-400 to-${announcement.color}-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}
                          >
                            <announcement.icon
                              className="text-white"
                              size={18}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 text-sm mb-1">
                              {announcement.title}
                            </h4>
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {announcement.message}
                            </p>
                            <span className="text-xs text-gray-500 font-medium">
                              {announcement.time}
                            </span>
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
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                  >
                    <UserPlus size={18} />
                    Add User
                  </button>
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
                          Role
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
                            colSpan="6"
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
                                <button
                                  onClick={() => handleEditEmployee(employee)}
                                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                  title="Edit User"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteEmployee(employee)}
                                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 size={16} />
                                </button>
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
          <FoodHubPOS />
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
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Add New User</h2>
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
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
                  <option value="admin">Administrator</option>
                </select>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEmployee && (
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
