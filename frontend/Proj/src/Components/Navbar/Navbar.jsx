import React from "react";
import { Clipboard, Home, Newspaper, ShoppingCart } from "lucide-react";

function Navbar({
  user,
  activeView,
  onViewChange,
  onLogout,
  logoText = "FH",
  systemName = "Food Hub System",
  showWelcome = true,
}) {
  // Check user role
  const isAdminOrOwner = user?.role === "admin" || user?.role === "owner";
  const isCashier = user?.role === "cashier";
  const isManager = user?.role === "manager";

  return (
    <header className="bg-white shadow-lg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left Section - Logo and System Name */}
          <div className="flex items-center space-x-5">
            <div className="w-15 h-12 flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                <img
                  src="https://github.com/Titusss19/K-STREET/blob/main/frontend/Proj/src/assets/kslogo.png?raw=true"
                  alt="K-Street Logo"
                  className="h-20 w-auto"
                />
              </span>
            </div>
            <h1 className="text-2xl font-medium" style={{ color: "red" }}>
              K - STREET
            </h1>
          </div>

          {/* Right Section - User Info and Navigation */}
          <div className="flex items-center space-x-10">
            {/* Dashboard Button - Visible to all */}
            <button
              onClick={() => onViewChange("dashboard")}
              className="px-1 py-1 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
              title="Dashboard"
            >
              <Home
                className={`w-6 h-6 transition-colors duration-200 
                  ${
                    activeView === "dashboard"
                      ? "text-red-600"
                      : "text-gray-600 hover:text-red-600"
                  }`}
              />
            </button>

            {/* POS Button - Hide if user is owner/admin */}
            {!isAdminOrOwner && (
              <button
                onClick={() => onViewChange("pos")}
                className="px-1 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                title="Point of Sale"
              >
                <ShoppingCart
                  className={`w-6 h-6 transition-colors duration-200 
                    ${
                      activeView === "pos"
                        ? "text-red-600"
                        : "text-gray-600 hover:text-red-600"
                    }`}
                />
              </button>
            )}

            {/* Sales Button - Show for ALL users including cashier */}
            {/* Changed condition to show for all: isAdminOrOwner || isManager || isCashier */}
            {(isAdminOrOwner || isManager || isCashier) && (
              <button
                onClick={() => onViewChange("sales")}
                className="px-1 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                title="Sales Reports"
              >
                <Clipboard
                  className={`w-6 h-6 transition-colors duration-200 
                    ${
                      activeView === "sales"
                        ? "text-red-600"
                        : "text-gray-600 hover:text-red-600"
                    }`}
                />
              </button>
            )}

            {/* Items Button - Hide for cashier, show for manager/admin/owner */}
            {(isAdminOrOwner || isManager) && (
              <button
                onClick={() => onViewChange("Items")}
                className="px-1 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                title="Inventory"
              >
                <Newspaper
                  className={`w-6 h-6 transition-colors duration-200 
                    ${
                      activeView === "Items"
                        ? "text-red-600"
                        : "text-gray-600 hover:text-red-600"
                    }`}
                />
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="bg-red-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
