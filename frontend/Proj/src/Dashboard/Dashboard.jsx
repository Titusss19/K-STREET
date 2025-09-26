import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Components/Navbar/Navbar";
import FoodHubPOS from "../POS/POS"; // ✅ Correct import path

// Updated Dashboard Component with POS Integration
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (!isLoggedIn || !userData) {
      navigate("/login");
      return;
    }

    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Navigation Header */}
      <Navbar
        user={user}
        activeView={activeView}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
        logoText="FH"
        systemName="Food Hub System"
        showWelcome={true}
      />

      {/* Main Content */}
      <main className="py-8">
        {activeView === "dashboard" ? (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-8">
                User Dashboard
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl">
                    <h3 className="font-semibold text-green-800 mb-4">
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="font-medium text-gray-600">
                          User ID:
                        </label>
                        <p className="text-gray-800 text-lg">{user.id}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">
                          Email:
                        </label>
                        <p className="text-gray-800 text-lg">{user.email}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">
                          Member since:
                        </label>
                        <p className="text-gray-800 text-lg">
                          {new Date(user.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl">
                    <h3 className="font-semibold text-blue-800 mb-4">
                      Quick Stats
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Today's Orders:</span>
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full font-bold">
                          0
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Total Revenue:</span>
                        <span className="text-green-600 font-bold text-lg">
                          P0.00
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Active Tables:</span>
                        <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold">
                          0
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl">
                    <h3 className="font-semibold text-purple-800 mb-4">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setActiveView("pos")}
                        className="bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
                      >
                        New Order
                      </button>
                      <button className="bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors">
                        View Reports
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <FoodHubPOS />
        )}
      </main>
    </div>
  );
}
