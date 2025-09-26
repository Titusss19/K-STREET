import React from 'react';
import { Clipboard, Home, ShoppingBag, ShoppingCart } from "lucide-react";

function Navbar({ 
  user, 
  activeView, 
  onViewChange, 
  onLogout,
  logoText = "FH",
  systemName = "Food Hub System",
  showWelcome = true 
}) {
  return (
    <header className="bg-white shadow-lg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left Section - Logo and System Name */}
          <div className="flex items-center space-x-5">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">{logoText}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{systemName}</h1>
          </div>

          {/* Right Section - User Info and Navigation */}
          <div className="flex items-center space-x-10">
            {/* Welcome Message */}
            {showWelcome && user && (
              <span className="text-gray-600 hidden md:block">
                Welcome, {user.email}
              </span>
            )}

            {/* Navigation Buttons */}
            <button
              onClick={() => onViewChange("dashboard")}
              className="px-1 py-1 rounded-lg font-medium transition-all duration-200 flex items-center justify-center "
            >
              <Home
                className={`w-6 h-6 transition-colors duration-200 
      ${
        activeView === "dashboard"
          ? "text-green-600"
          : "text-gray-600 hover:text-green-600"
      }`}
              />
            </button>

            <button
              onClick={() => onViewChange("pos")}
              className="px-1 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center "
            >
              <ShoppingCart
                className={`w-6 h-6 transition-colors duration-200 
      ${
        activeView === "pos"
          ? "text-green-600"
          : "text-gray-600 hover:text-green-600"
      }`}
              />
            </button>

            <button
              onClick={() => onViewChange("report")}
              className="px-1 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center "
            >
              <Clipboard
                className={`w-6 h-6 transition-colors duration-200 
      ${
        activeView === "report"
          ? "text-green-600"
          : "text-gray-600 hover:text-green-600"
      }`}
              />
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="bg-red-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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