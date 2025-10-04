import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";

const FoodHubPOS = () => {
  const [orderType, setOrderType] = useState("Dine In");
  const [cart, setCart] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [changeAmount, setChangeAmount] = useState(0);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptContent, setReceiptContent] = useState("");
  const [storeOpen, setStoreOpen] = useState(false);

  const receiptRef = useRef();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check current store status on component mount
  useEffect(() => {
    checkCurrentStoreStatus();
  }, []);

  const checkCurrentStoreStatus = async () => {
    try {
      const res = await axios.get(
        "http://localhost:3002/store-hours/current-store-status"
      );
      setStoreOpen(res.data.isOpen);
    } catch (error) {
      console.error("Error checking store status:", error);
      setStoreOpen(false);
    }
  };

  const handleStoreToggle = async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      alert("Please login first");
      return;
    }

    const newStatus = !storeOpen;
    const action = newStatus ? "open" : "close";

    try {
      await axios.post("http://localhost:3002/store-hours/log-store-action", {
        userId: user.id,
        userEmail: user.email,
        action: action,
      });

      setStoreOpen(newStatus);
      console.log(`Store ${action}ed successfully by ${user.email}`);
    } catch (error) {
      console.error("Error updating store status:", error);
      alert("Failed to update store status");
    }
  };

  // Fetch products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get("http://localhost:3002/items");
        const productsWithNumberPrice = res.data.map((product) => ({
          ...product,
          price: Number(product.price) || 0,
        }));
        setProducts(productsWithNumberPrice);
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
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
          price: Number(product.price) || 0,
        },
      ]);
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
    cart.reduce(
      (total, item) => total + (Number(item.price) || 0) * item.quantity,
      0
    );

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * 0.12;
    let total = subtotal + tax;
    if (discountApplied) total *= 0.8;
    return total;
  };

  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.12;
  const total = calculateTotal();
  const taxPercentage = subtotal > 0 ? (tax / subtotal) * 100 : 0;

  /// --- Payment ---
  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);

    if (!paymentAmount || amount <= 0 || isNaN(amount)) {
      setPaymentResult({
        type: "error",
        title: "Invalid Amount",
        message: "Please enter a valid payment amount.",
        required: total,
      });
      setShowPaymentModal(true);
      return;
    }

    const currentSubtotal = calculateSubtotal();
    const currentTax = currentSubtotal * 0.12;
    const currentTotal = calculateTotal();

    if (amount < currentTotal) {
      setPaymentResult({
        type: "error",
        title: "Insufficient Amount",
        message: `The amount entered is less than the total.`,
        required: currentTotal,
      });
      setShowPaymentModal(true);
      return;
    }

    const change = amount - currentTotal;
    setChangeAmount(change);

    const receipt = `
FOOD HUB RECEIPT
=============================
Order Type: ${orderType}
Date: ${new Date().toLocaleString()}

Items:
${cart
  .map(
    (item) =>
      `${item.name} x${item.quantity} - P${(
        (Number(item.price) || 0) * item.quantity
      ).toFixed(2)}`
  )
  .join("\n")}

Subtotal: P${currentSubtotal.toFixed(2)}
Tax: P${currentTax.toFixed(2)}
${discountApplied ? "Discount (20%): Applied\n" : ""}
Total: P${currentTotal.toFixed(2)}
Amount Paid: P${amount.toFixed(2)}
Change: P${change.toFixed(2)}

Thank you for your order!
`;

    setReceiptContent(receipt);

    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?.id;

    if (!userId) {
      setPaymentResult({
        type: "error",
        title: "User Not Logged In",
        message: "Cannot process order without login.",
      });
      setShowPaymentModal(true);
      return;
    }

    try {
      // FIXED: Prepare order data with product names
      const productNames = cart.map((item) => item.name).join(", ");
      const itemsData = JSON.stringify(
        cart.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: (Number(item.price) || 0) * item.quantity,
        }))
      );

      const res = await axios.post("http://localhost:3002/orders", {
        userId,
        paidAmount: amount,
        total: currentTotal,
        discountApplied,
        changeAmount: change,
        orderType,
        productNames: productNames, // Dito papasok sa db
        items: itemsData, // Dito papasok sa db
      });

      console.log("Backend response:", res.data);

      setPaymentResult({
        type: "success",
        title: "Payment Successful!",
        message: `Payment of P${amount.toFixed(2)} received.`,
        change: change,
      });

      setShowPaymentModal(true);
    } catch (err) {
      console.error("Failed to save order:", err);
      setPaymentResult({
        type: "error",
        title: "Order Failed",
        message: "Could not save order. Please try again.",
      });
      setShowPaymentModal(true);
    }
  };
  
  // --- Apply Discount ---
  const applyDiscount = () => {
    if (!discountApplied) setDiscountApplied(true);
  };

  // --- Print Receipt ---
  const handlePrintReceipt = () => {
    const currentSubtotal = calculateSubtotal();
    const currentTax = currentSubtotal * 0.12;
    const currentTotal = calculateTotal();
    const currentAmountPaid = parseFloat(paymentAmount) || 0;
    const currentChange = currentAmountPaid - currentTotal;

    const printWindow = window.open("", "PRINT", "height=600,width=400");

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          margin: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          font-size: 14px;
          background: white;
          line-height: 1.4;
        }
        .receipt-container {
          text-align: center;
          width: 280px;
          max-width: 100%;
        }
        .receipt-header {
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 10px;
          border-bottom: 2px dashed #000;
          padding-bottom: 8px;
          width: 100%;
        }
        .receipt-content {
          text-align: center;
          width: 100%;
        }
        .receipt-line {
          width: 100%;
          margin: 4px 0;
          text-align: center;
        }
        .items-section {
          text-align: left;
          margin: 10px 0;
          width: 100%;
        }
        .item-line {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
          font-size: 13px;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 10px 0;
          width: 100%;
        }
        .summary-line {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
          font-size: 13px;
        }
        .total-line {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          font-weight: bold;
          font-size: 15px;
          border-top: 1px dashed #000;
          padding-top: 8px;
        }
        @media print {
          body {
            padding: 15px;
          }
          .receipt-container {
            width: 270px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">FOOD HUB RECEIPT</div>
        <div class="receipt-content">
          <div class="receipt-line">Order Type: ${orderType}</div>
          <div class="receipt-line">Date: ${new Date().toLocaleString()}</div>
          <div class="divider"></div>
          <div class="receipt-line" style="font-weight: bold; text-align: left;">ITEMS:</div>
          <div class="items-section">
            ${
              cart.length > 0
                ? cart
                    .map(
                      (item) => `
                  <div class="item-line">
                    <span>${item.name} x${item.quantity}</span>
                    <span>P${(
                      (Number(item.price) || 0) * item.quantity
                    ).toFixed(2)}</span>
                  </div>
                `
                    )
                    .join("")
                : '<div class="receipt-line">No items</div>'
            }
          </div>
          <div class="divider"></div>
          <div class="summary-line">
            <span>Subtotal:</span>
            <span>P${currentSubtotal.toFixed(2)}</span>
          </div>
          <div class="summary-line">
            <span>Tax:</span>
            <span>P${currentTax.toFixed(2)}</span>
          </div>
          ${
            discountApplied
              ? `
          <div class="summary-line">
            <span>Discount (20%):</span>
            <span>Applied</span>
          </div>
          `
              : ""
          }
          <div class="total-line">
            <span>Total:</span>
            <span>P${currentTotal.toFixed(2)}</span>
          </div>
          <div class="summary-line">
            <span>Amount Paid:</span>
            <span>P${currentAmountPaid.toFixed(2)}</span>
          </div>
          <div class="summary-line">
            <span>Change:</span>
            <span>P${currentChange.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="receipt-line" style="font-weight: bold; margin-top: 15px;">
            Thank you for your order!
          </div>
        </div>
      </div>
    </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // --- Save Receipt as PNG ---
  const handleSaveReceiptAsImage = () => {
    const currentSubtotal = calculateSubtotal();
    const currentTax = currentSubtotal * 0.12;
    const currentTotal = calculateTotal();
    const currentAmountPaid = parseFloat(paymentAmount) || 0;
    const currentChange = currentAmountPaid - currentTotal;

    const receiptElement = document.createElement("div");
    receiptElement.style.position = "fixed";
    receiptElement.style.top = "0";
    receiptElement.style.left = "0";
    receiptElement.style.width = "300px";
    receiptElement.style.padding = "25px 20px";
    receiptElement.style.background = "white";
    receiptElement.style.fontFamily = "'Courier New', monospace";
    receiptElement.style.fontSize = "14px";
    receiptElement.style.lineHeight = "1.4";
    receiptElement.style.textAlign = "center";
    receiptElement.style.border = "2px solid #000";
    receiptElement.style.zIndex = "9999";
    receiptElement.style.display = "flex";
    receiptElement.style.flexDirection = "column";
    receiptElement.style.alignItems = "center";
    receiptElement.style.justifyContent = "center";
    receiptElement.style.minHeight = "450px";
    receiptElement.style.color = "black";

    receiptElement.innerHTML = `
    <div style="text-align: center; width: 100%;">
      <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; border-bottom: 2px dashed #000; padding-bottom: 8px;">
        FOOD HUB RECEIPT
      </div>
      <div style="text-align: center; width: 100%;">
        <div style="margin-bottom: 3px;">Order Type: ${orderType}</div>
        <div style="margin-bottom: 15px;">Date: ${new Date().toLocaleString()}</div>
        <div style="border-top: 1px dashed #000; margin: 12px 0; width: 100%;"></div>
        <div style="font-weight: bold; text-align: left; margin-bottom: 8px;">ITEMS:</div>
        <div style="text-align: left; width: 100%; margin-bottom: 15px;">
          ${
            cart.length > 0
              ? cart
                  .map(
                    (item) => `
                <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                  <span>${item.name} x${item.quantity}</span>
                  <span>P${((Number(item.price) || 0) * item.quantity).toFixed(
                    2
                  )}</span>
                </div>
              `
                  )
                  .join("")
              : '<div style="text-align: center;">No items</div>'
          }
        </div>
        <div style="border-top: 1px dashed #000; margin: 12px 0; width: 100%;"></div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Subtotal:</span>
          <span>P${currentSubtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Tax:</span>
          <span>P${currentTax.toFixed(2)}</span>
        </div>
        ${
          discountApplied
            ? `
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Discount (20%):</span>
          <span>Applied</span>
        </div>
        `
            : ""
        }
        <div style="display: flex; justify-content: space-between; margin: 8px 0; font-weight: bold; font-size: 16px; border-top: 1px dashed #000; padding-top: 8px;">
          <span>Total:</span>
          <span>P${currentTotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Amount Paid:</span>
          <span>P${currentAmountPaid.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Change:</span>
          <span>P${currentChange.toFixed(2)}</span>
        </div>
        <div style="border-top: 1px dashed #000; margin: 15px 0; width: 100%;"></div>
        <div style="font-weight: bold; margin-top: 10px;">
          Thank you for your order!
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(receiptElement);

    const dynamicHeight = Math.max(450, receiptElement.scrollHeight);

    html2canvas(receiptElement, {
      width: 300,
      height: dynamicHeight,
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: "#ffffff",
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `receipt_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      document.body.removeChild(receiptElement);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Cashier POS System
              </h1>
              <p className="text-green-100 mt-2 text-sm font-medium">
                {currentTime.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </p>
              {/* Store Status */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-green-100 text-sm font-medium">
                  Store Status:
                </span>
                <button
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-lg ${
                    storeOpen
                      ? "bg-white text-green-600 hover:bg-green-50"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                  onClick={handleStoreToggle}
                >
                  {storeOpen ? "OPEN" : "CLOSED"}
                </button>
                <span className="text-green-100 text-sm">
                  {storeOpen ? "9:00 AM - 10:00 PM" : "Store Closed"}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className={`px-8 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                  orderType === "Dine In"
                    ? "bg-white text-green-600 shadow-xl scale-105"
                    : "bg-green bg-opacity-20 hover:bg-opacity-30 text-white"
                }`}
                onClick={() => setOrderType("Dine In")}
              >
                Dine In
              </button>
              <button
                className={`px-8 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                  orderType === "Take-Out"
                    ? "bg-white text-green-600 shadow-xl scale-105"
                    : "bg-green bg-opacity-20 hover:bg-opacity-30 text-white"
                }`}
                onClick={() => setOrderType("Take-Out")}
              >
                Take-Out
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Product List Section */}
          <div className="lg:w-2/3 p-6 border-r border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Product Catalog
            </h2>

            {/* Search and Category Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all shadow-sm ${
                      activeCategory === category
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group border-2 border-gray-100 rounded-2xl p-4 hover:shadow-2xl hover:border-green-200 transition-all duration-300 hover:scale-105"
                >
                  {/* Product Image */}
                  <div className="h-40 rounded-xl mb-3 overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="object-cover h-full w-full group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-gray-400 font-medium">
                        No Image
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 mb-1">
                    {product.name}
                  </h3>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full mb-3">
                    {product.category}
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="text-green-600 font-bold text-xl">
                      P{((Number(product.price) || 0) * 1.12).toFixed(2)}
                    </span>
                    <button
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                      onClick={() => addToCart(product)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary Section */}
          <div className="lg:w-1/3 p-6 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Current Order
              </h2>
              <button
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
                onClick={clearCart}
              >
                Clear All
              </button>
            </div>

            {/* Discount Button */}
            <div className="mb-4">
              <button
                className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all shadow-lg ${
                  discountApplied
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-green-500 hover:shadow-xl"
                }`}
                onClick={applyDiscount}
                disabled={discountApplied}
              >
                {discountApplied
                  ? "Discount Applied (20%)"
                  : "Apply PWD/Senior Discount 20%"}
              </button>
            </div>

            {/* Cart Items */}
            <div className="mb-6 max-h-80 overflow-y-auto border-2 border-gray-200 rounded-2xl bg-white shadow-inner">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-3">🛒</div>
                  <p className="text-lg font-semibold text-gray-500">
                    Empty Cart
                  </p>
                  <p className="text-sm mt-1">Add items to get started</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center border-b border-gray-100 pb-4 last:border-b-0 hover:bg-green-50 p-3 rounded-xl transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          P{(Number(item.price) || 0).toFixed(2)} ×{" "}
                          {item.quantity}
                        </p>
                        <p className="text-green-600 font-bold mt-1">
                          P
                          {((Number(item.price) || 0) * item.quantity).toFixed(
                            2
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-all font-bold text-lg shadow-sm hover:shadow-md"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          -
                        </button>
                        <span className="font-bold w-8 text-center text-lg">
                          {item.quantity}
                        </span>
                        <button
                          className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-all font-bold text-lg shadow-sm hover:shadow-md"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                        <button
                          className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition-all ml-1 font-bold text-lg shadow-sm hover:shadow-md"
                          onClick={() => removeFromCart(item.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="border-t-2 border-gray-200 pt-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-semibold">P{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">
                    Vat({taxPercentage.toFixed(1)}%)
                  </span>
                  <span className="font-semibold">P{tax.toFixed(2)}</span>
                </div>
                {discountApplied && (
                  <div className="flex justify-between text-amber-600 font-bold bg-amber-50 p-2 rounded-lg">
                    <span>Discount (20%)</span>
                    <span>-P{((subtotal + tax) * 0.2).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl border-t-2 border-gray-200 pt-4 text-gray-900">
                  <span>Total</span>
                  <span className="text-green-600">P{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    className="bg-gradient-to-br from-gray-100 to-gray-200 py-3.5 rounded-xl font-bold hover:from-gray-200 hover:to-gray-300 transition-all shadow-md hover:shadow-lg"
                    onClick={() => setPaymentAmount("100")}
                  >
                    P100
                  </button>
                  <button
                    className="bg-gradient-to-br from-gray-100 to-gray-200 py-3.5 rounded-xl font-bold hover:from-gray-200 hover:to-gray-300 transition-all shadow-md hover:shadow-lg"
                    onClick={() => setPaymentAmount("500")}
                  >
                    P500
                  </button>
                  <button
                    className="bg-gradient-to-br from-gray-100 to-gray-200 py-3.5 rounded-xl font-bold hover:from-gray-200 hover:to-gray-300 transition-all shadow-md hover:shadow-lg"
                    onClick={() => setPaymentAmount("1000")}
                  >
                    P1000
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Enter Payment Amount
                  </label>
                  <input
                    type="number"
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold transition-all"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <button
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-5 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl"
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
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-fadeIn">
            <div className="p-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-3xl flex justify-between items-center">
              <h3 className="text-2xl font-bold">Receipt</h3>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  clearCart();
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center transition-all text-3xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <pre
                ref={receiptRef}
                className="whitespace-pre-wrap font-mono text-sm text-gray-800 text-center leading-relaxed"
                style={{
                  fontFamily: "'Courier New', monospace",
                  textAlign: "center",
                }}
              >
                {receiptContent}
              </pre>
            </div>
            <div className="p-5 flex gap-3 border-t-2 border-gray-100">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
              >
                Print
              </button>
              <button
                onClick={handleSaveReceiptAsImage}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
              >
                Save PNG
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  clearCart();
                }}
                className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Payment Modal --- */}
      {showPaymentModal && paymentResult && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-fadeIn">
            <div
              className={`p-6 rounded-t-3xl ${
                paymentResult.type === "success"
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : "bg-gradient-to-r from-red-500 to-red-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">
                  {paymentResult.title}
                </h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center transition-all text-3xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div
                  className={`text-7xl mb-4 ${
                    paymentResult.type === "success"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {paymentResult.type === "success" ? "✓" : "⚠"}
                </div>
                <p className="text-gray-700 text-lg font-medium mb-4">
                  {paymentResult.message}
                </p>

                {paymentResult.type === "success" ? (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 mt-4">
                    <p className="text-green-800 font-semibold text-lg mb-1">
                      Change:
                    </p>
                    <p className="text-green-600 font-bold text-4xl">
                      P{changeAmount.toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-2xl p-5 mt-4">
                    <p className="text-red-800 font-semibold text-lg mb-1">
                      Total Amount Required:
                    </p>
                    <p className="text-red-600 font-bold text-3xl mb-3">
                      P{(paymentResult.required || 0).toFixed(2)}
                    </p>
                    <p className="text-red-600 text-sm">
                      Please enter at least P
                      {(paymentResult.required || 0).toFixed(2)} to complete the
                      payment.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3">
                {paymentResult.type === "error" && (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3.5 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    if (paymentResult.type === "success") {
                      setShowReceiptModal(true);
                      setShowPaymentModal(false);
                    } else {
                      setShowPaymentModal(false);
                    }
                  }}
                  className={`flex-1 py-3.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl ${
                    paymentResult.type === "success"
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                      : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  }`}
                >
                  {paymentResult.type === "success"
                    ? "View Receipt"
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
