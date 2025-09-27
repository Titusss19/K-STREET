import React, { useState, useEffect } from "react";
import axios from "axios";

const FoodHubPOS = () => {
  const [orderType, setOrderType] = useState("Dine In");
  const [cart, setCart] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false); // ✅ Discount flag

  const [products, setProducts] = useState([]); // Fetched from DB
  const [categories, setCategories] = useState([]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [changeAmount, setChangeAmount] = useState(0);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptContent, setReceiptContent] = useState("");

  // Fetch products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get("http://localhost:3002/items");
        setProducts(res.data);
        setCategories(["All", ...new Set(res.data.map((p) => p.category))]);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };
    fetchProducts();
  }, []);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // --- Cart functions ---
  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setPaymentAmount("");
    setDiscountApplied(false);
  };

  // --- Totals ---
  const calculateSubtotal = () =>
    cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const Tax = subtotal * 0.12;
    let total = subtotal + Tax;
    if (discountApplied) total *= 0.8; // Apply 20% discount
    return total;
  };

  const subtotal = calculateSubtotal();
  const Tax = subtotal * 0.12;
  const total = calculateTotal();
  const taxPercentage = subtotal > 0 ? (Tax / subtotal) * 100 : 0;

  // --- Payment ---
  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);

    if (!paymentAmount || amount <= 0) {
      setPaymentResult({
        type: "error",
        title: "Invalid Amount",
        message: "Please enter a valid payment amount.",
        required: total,
      });
      setShowPaymentModal(true);
      return;
    }

    if (amount >= total) {
      const change = amount - total;
      setChangeAmount(change);
      setPaymentResult({
        type: "success",
        title: "Payment Successful!",
        message: `Payment of P${amount.toFixed(2)} received.`,
        change: change,
      });
    } else {
      setPaymentResult({
        type: "error",
        title: "Insufficient Amount",
        message: `The amount entered is less than the total.`,
        required: total,
      });
    }

    setShowPaymentModal(true);
  };

  // --- Receipt ---
  const handlePrintReceipt = () => {
    const receipt = `
FOOD HUB RECEIPT
====================
Order Type: ${orderType}
Date: ${new Date().toLocaleString()}

Items:
${cart
  .map(
    (item) =>
      `${item.name} x${item.quantity} - P${(item.price * item.quantity).toFixed(
        2
      )}`
  )
  .join("\n")}

Subtotal: P${subtotal.toFixed(2)}
Tax: P${Tax.toFixed(2)}
${discountApplied ? "Discount (20%): Applied\n" : ""}
Total: P${total.toFixed(2)}
Amount Paid: P${parseFloat(paymentAmount).toFixed(2)}
Change: P${changeAmount.toFixed(2)}

Thank you for your order!
`;

    setReceiptContent(receipt);
    setShowReceiptModal(true);
    setShowPaymentModal(false);
    clearCart();
  };

  // --- Apply Discount ---
  const applyDiscount = () => {
    if (!discountApplied) setDiscountApplied(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold">FOOD HUB</h1>
              <p className="text-green-100 mt-1">
                {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xl font-semibold">Casher POS System</p>
              <div className="flex space-x-3 mt-3">
                <button
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    orderType === "Dine In"
                      ? "bg-white text-green-600 shadow-md"
                      : "bg-green-500 hover:bg-green-400"
                  }`}
                  onClick={() => setOrderType("Dine In")}
                >
                  Dine In
                </button>
                <button
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    orderType === "Take-Out"
                      ? "bg-white text-green-600 shadow-md"
                      : "bg-green-500 hover:bg-green-400"
                  }`}
                  onClick={() => setOrderType("Take-Out")}
                >
                  Take-Out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Product List Section */}
          <div className="lg:w-2/3 p-6 border-r border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Product List
            </h2>

            {/* Search and Category Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      activeCategory === category
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow duration-300"
                >
                  {/* Product Image */}
                  <div className="h-40 rounded-lg mb-3 overflow-hidden flex items-center justify-center bg-gray-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <span className="text-gray-500 font-medium">
                        No Image
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-gray-800 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {product.category}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-green-600 font-bold text-xl">
                      P{(product.price * 1.12).toFixed(2)}{" "}
                      {/* Price + 12% tax */}
                    </span>
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      onClick={() => addToCart(product)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary Section */}
          <div className="lg:w-1/3 p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Current Order
              </h2>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                onClick={clearCart}
              >
                Clear All
              </button>
            </div>

            {/* Discount Button */}
            <div className="mb-4">
              <button
                className={`w-full py-3 rounded-lg font-medium text-white ${
                  discountApplied
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
                onClick={applyDiscount}
                disabled={discountApplied}
              >
                Apply PWD/Senior Discount 20%
              </button>
            </div>

            {/* Cart Items */}
            <div className="mb-6 max-h-80 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">🛒</div>
                  <p className="text-lg font-medium">Empty Cart</p>
                  <p className="text-sm">Add items to get started</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center border-b border-gray-100 pb-4 last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          P{item.price} × {item.quantity}
                        </p>
                        <p className="text-green-600 font-semibold">
                          P{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <span className="text-lg font-bold">-</span>
                        </button>
                        <span className="font-semibold w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <span className="text-lg font-bold">+</span>
                        </button>
                        <button
                          className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors ml-2"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <span className="text-lg font-bold">×</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-medium">P{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Tax({taxPercentage.toFixed(1)}%)</span>
                  <span className="font-medium">P{Tax.toFixed(2)}</span>
                </div>
                {discountApplied && (
                  <div className="flex justify-between text-gray-700 font-semibold">
                    <span>Discount (20%)</span>
                    <span>P{((subtotal + Tax) * 0.2).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-3 text-gray-900">
                  <span>Total</span>
                  <span>P{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    className="bg-gray-200 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                    onClick={() => setPaymentAmount("100")}
                  >
                    P100
                  </button>
                  <button
                    className="bg-gray-200 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                    onClick={() => setPaymentAmount("500")}
                  >
                    P500
                  </button>
                  <button
                    className="bg-gray-200 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                    onClick={() => setPaymentAmount("1000")}
                  >
                    P1000
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter amount
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <button
                  className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  onClick={handlePayment}
                  disabled={cart.length === 0}
                >
                  Process Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Receipt Modal --- */}
      {showReceiptModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 items-center justify-center">
            <div className="p-4 bg-green-600 text-white rounded-t-2xl flex justify-between items-center">
              <h3 className="text-xl font-bold">Receipt</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                {receiptContent}
              </pre>
            </div>
            <div className="p-4 flex space-x-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700"
              >
                Print
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-medium hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Payment Modal --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div
              className={`p-6 rounded-t-2xl ${
                paymentResult.type === "success" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">
                  {paymentResult.title}
                </h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    if (paymentResult.type === "success") {
                      clearCart();
                    }
                  }}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div
                  className={`text-6xl mb-4 ${
                    paymentResult.type === "success"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {paymentResult.type === "success" ? "✓" : "⚠"}
                </div>
                <p className="text-gray-700 text-lg mb-2">
                  {paymentResult.message}
                </p>

                {paymentResult.type === "success" ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <p className="text-green-800 font-semibold">
                      Change:{" "}
                      <span className="text-2xl">
                        P{changeAmount.toFixed(2)}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <p className="text-red-800 font-semibold">
                      Total Amount Required:{" "}
                      <span className="text-2xl">
                        P{paymentResult.required.toFixed(2)}
                      </span>
                    </p>
                    <p className="text-red-600 text-sm mt-2">
                      Please enter at least P{paymentResult.required.toFixed(2)}{" "}
                      to complete the payment.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex space-x-3">
                {paymentResult.type === "error" && (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    if (paymentResult.type === "success") {
                      handlePrintReceipt();
                    } else {
                      setShowPaymentModal(false);
                    }
                  }}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    paymentResult.type === "success"
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {paymentResult.type === "success"
                    ? "Print Receipt"
                    : "Try Again"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodHubPOS;

