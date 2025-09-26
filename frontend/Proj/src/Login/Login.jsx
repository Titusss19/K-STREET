import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post("http://localhost:3002/login", {
        email: formData.email,
        password: formData.password,
      });

      if (response.data.success) {
        setMessage("Login successful!");

        // Save user data to localStorage
        localStorage.setItem("user", JSON.stringify(response.data.user));
        localStorage.setItem("isLoggedIn", "true");

        // If remember me is checked, save email
        if (formData.remember) {
          localStorage.setItem("rememberedEmail", formData.email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        // Redirect to dashboard after 1 second
        setTimeout(() => {
          window.location.href = "/Dashboard";
        }, 2000);
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.response && error.response.data) {
        setMessage(error.response.data.message);
      } else if (error.code === "ECONNREFUSED") {
        setMessage(
          "Backend server is not running. Please start the server first."
        );
      } else {
        setMessage("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Check for remembered email on component mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setFormData((prev) => ({
        ...prev,
        email: rememberedEmail,
        remember: true,
      }));
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Your Company"
          src="https://github.com/kouyshi/capstone/blob/main/logo%20png/1.png?raw=true"
          className="mx-auto h-30 w-auto"
        />
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-600">
          Sign in to your account
        </h2>
        <p className="mt-1 text-center font-small tracking-tight text-gray-500">
          Enter details to login.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {/* Message Alert */}
        {message && (
          <div
            className={`p-3 mb-4 rounded text-center ${
              message.includes("successful")
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="mt-2 block w-full rounded-md border px-3 py-1.5 border-gray-300 text-gray-500 bg-gray-100 placeholder:text-gray-400 focus:outline-red-500"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="text-sm">
                <a
                  href="#"
                  className="font-semibold text-red-500 hover:text-red-400"
                >
                  Forgot password?
                </a>
              </div>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className="mt-2 block w-full rounded-md border px-3 py-1.5 border-gray-300 text-gray-500 bg-gray-100 placeholder:text-gray-400 focus:outline-red-500"
            />
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label
                htmlFor="remember"
                className="ml-2 block text-sm text-gray-700"
              >
                Remember me
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {/* Redirect to Register */}
          <div className="mt-4 text-center text-sm text-gray-600">
            Not a member?{" "}
            <Link
              to="/register"
              className="font-semibold text-red-600 hover:text-red-400"
            >
              Click to Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
