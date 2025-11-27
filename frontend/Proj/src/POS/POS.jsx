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
  const [addons, setAddons] = useState([]);
  const [upgrades, setUpgrades] = useState([]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [changeAmount, setChangeAmount] = useState(0);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptContent, setReceiptContent] = useState("");
  const [storeOpen, setStoreOpen] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const [showAddonsModal, setShowAddonsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedUpgrades, setSelectedUpgrades] = useState(null);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // BAGO: State para sa success modal ng store open
  const [showStoreSuccessModal, setShowStoreSuccessModal] = useState(false);
  const [storeActionTime, setStoreActionTime] = useState("");

  const receiptRef = useRef();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all data on component mount
  useEffect(() => {
    checkCurrentStoreStatus();
    fetchProducts();
    fetchAddons();
    fetchUpgrades();
  }, []);

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

  // Fetch addons na "k-street add sides" lang
  const fetchAddons = async () => {
    try {
      const res = await axios.get("http://localhost:3002/all-items");
      // Filter only items with description_type = "k-street add sides"
      const addonsItems = res.data.filter(
        (item) => item.description_type === "k-street add sides"
      );
      setAddons(addonsItems);
    } catch (err) {
      console.error("Failed to fetch addons:", err);
      // Fallback: try the regular addons endpoint
      try {
        const fallbackRes = await axios.get("http://localhost:3002/addons");
        setAddons(fallbackRes.data);
      } catch (fallbackErr) {
        console.error("Failed to fetch fallback addons:", fallbackErr);
      }
    }
  };

  // BAGO: Fetch upgrades na kaparehas ng product_code pero "k-street upgrades" ang description_type
  const fetchUpgrades = async () => {
    try {
      const res = await axios.get("http://localhost:3002/all-items");
      // Filter only items with description_type = "k-street upgrades"
      const upgradesItems = res.data.filter(
        (item) => item.description_type === "k-street upgrades"
      );
      setUpgrades(upgradesItems);
    } catch (err) {
      console.error("Failed to fetch upgrades:", err);
      // Fallback: try the regular upgrades endpoint
      try {
        const fallbackRes = await axios.get("http://localhost:3002/upgrades");
        setUpgrades(fallbackRes.data);
      } catch (fallbackErr) {
        console.error("Failed to fetch fallback upgrades:", fallbackErr);
      }
    }
  };

  const checkCurrentStoreStatus = async () => {
    try {
      const res = await axios.get(
        "http://localhost:3002/store-hours/current-store-status"
      );
      setStoreOpen(res.data.isOpen);
      if (res.data.lastAction) {
        setLastActionTime(res.data.lastAction.timestamp);
      }
    } catch (error) {
      console.error("Error checking store status:", error);
      setStoreOpen(false);
    }
  };

  // BAGO: COMPLETE handleStoreToggle function
  const handleStoreToggle = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      alert("Please login first");
      return;
    }

    const newStatus = !storeOpen;
    const action = newStatus ? "open" : "close";

    try {
      const response = await axios.post(
        "http://localhost:3002/store-hours/log-store-action",
        {
          userId: user.id,
          userEmail: user.email,
          action: action,
        }
      );

      setStoreOpen(newStatus);
      setLastActionTime(new Date().toISOString());

      // Ipakita ang success modal para sa both open at close
      const actionTime = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setStoreActionTime(actionTime);
      setShowStoreSuccessModal(true);
    } catch (error) {
      console.error("Error updating store status:", error);
      alert("Failed to update store status");
    }
  };

  // Format time display
  const formatStoreTime = (timestamp) => {
    if (!timestamp) return "N/A";

    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

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
    // Check kung closed ang store
    if (!storeOpen) {
      alert(
        "Store is currently closed. Please open the store first before adding items to cart."
      );
      return;
    }

    setSelectedProduct(product);
    setSelectedAddons([]);
    setSelectedUpgrades(null);
    setSpecialInstructions("");
    setShowAddonsModal(true);
  };

  const confirmAddToCart = () => {
    if (!selectedProduct) return;

    const cartItem = {
      ...selectedProduct,
      quantity: 1,
      price: Number(selectedProduct.price) || 0,
      selectedAddons: [...selectedAddons],
      selectedUpgrade: selectedUpgrades,
      specialInstructions: specialInstructions,
      finalPrice: calculateFinalPrice(
        selectedProduct,
        selectedAddons,
        selectedUpgrades
      ),
    };

    const existingItemIndex = cart.findIndex(
      (item) =>
        item.id === cartItem.id &&
        JSON.stringify(item.selectedAddons) ===
          JSON.stringify(cartItem.selectedAddons) &&
        ((!item.selectedUpgrade && !cartItem.selectedUpgrade) ||
          (item.selectedUpgrade &&
            cartItem.selectedUpgrade &&
            item.selectedUpgrade.id === cartItem.selectedUpgrade.id)) &&
        item.specialInstructions === cartItem.specialInstructions
    );

    if (existingItemIndex !== -1) {
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, cartItem]);
    }

    setShowAddonsModal(false);
    setSelectedProduct(null);
    setSelectedUpgrades(null);
  };

  // BAGO: Calculate final price with upgrades (REPLACE price, not add)
  const calculateFinalPrice = (product, addons, selectedUpgrade) => {
    let finalPrice = Number(product.price) || 0;

    // Add cost for selected addons
    addons.forEach((addon) => {
      finalPrice += Number(addon.price) || 0;
    });

    // REPLACE the base price if upgrade is selected
    if (selectedUpgrade) {
      finalPrice = Number(selectedUpgrade.price) || 0;
      // Still add addons cost on top of the upgraded price
      addons.forEach((addon) => {
        finalPrice += Number(addon.price) || 0;
      });
    }

    return finalPrice;
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
    setPaymentMethod("Cash");
  };

  // --- Totals ---
  const calculateSubtotal = () =>
    cart.reduce(
      (total, item) =>
        total + (item.finalPrice || Number(item.price) || 0) * item.quantity,
      0
    );

  // Calculate change based on entered payment amount
  const calculateChange = () => {
    const amount = parseFloat(paymentAmount) || 0;
    const total = calculateTotal();
    return amount > 0 ? amount - total : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    let total = subtotal;
    if (discountApplied) total *= 0.8;
    return total;
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();
  const change = calculateChange();

  // --- Payment ---
  const handlePayment = async () => {
    // Check kung closed ang store
    if (!storeOpen) {
      alert(
        "Store is currently closed. Please open the store first before processing payments."
      );
      return;
    }

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
  K - Street 
  Mc Arthur Highway,
  Magaspac, Gerona, Tarlac

  =============================
  Cashier: ${JSON.parse(localStorage.getItem("user"))?.email || "N/A"}
  Order Type: ${orderType}
  Payment Method: ${paymentMethod}
  Date: ${new Date().toLocaleString()}

  Items:
  ${cart
    .map(
      (item) =>
        `${
          item.selectedUpgrade
            ? `[UPGRADED] ${item.selectedUpgrade.name}`
            : item.name
        } x${item.quantity} - P${(
          (item.finalPrice || Number(item.price) || 0) * item.quantity
        ).toFixed(2)}${
          item.selectedAddons.length > 0
            ? `\n  Add-ons: ${item.selectedAddons
                .map((a) => `${a.name} (+P${a.price})`)
                .join(", ")}`
            : ""
        }${
          item.selectedUpgrade
            ? `\n  Upgrade: ${item.selectedUpgrade.name} (P${item.selectedUpgrade.price})`
            : ""
        }${
          item.specialInstructions
            ? `\n  Instructions: ${item.specialInstructions}`
            : ""
        }`
    )
    .join("\n")}

  Subtotal: P${currentSubtotal.toFixed(2)}
  ${discountApplied ? "Discount (20%): Applied\n" : ""}
  Total: P${currentTotal.toFixed(2)}
  Payment Method: ${paymentMethod}
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
      const productNames = cart
        .map((item) =>
          item.selectedUpgrade
            ? `[UPGRADED] ${item.selectedUpgrade.name}`
            : item.name
        )
        .join(", ");

      const itemsData = JSON.stringify(
        cart.map((item) => ({
          id: item.id,
          name: item.selectedUpgrade
            ? `[UPGRADED] ${item.selectedUpgrade.name}`
            : item.name,
          quantity: item.quantity,
          price: item.finalPrice || item.price,
          subtotal:
            (item.finalPrice || Number(item.price) || 0) * item.quantity,
          selectedAddons: item.selectedAddons,
          selectedUpgrade: item.selectedUpgrade,
          specialInstructions: item.specialInstructions,
        }))
      );

      const orderData = {
        userId,
        paidAmount: amount,
        total: currentTotal,
        discountApplied,
        changeAmount: change,
        orderType,
        productNames: productNames,
        items: itemsData,
        paymentMethod: paymentMethod,
      };

      const res = await axios.post("http://localhost:3002/orders", orderData);

      setPaymentResult({
        type: "success",
        title: "Payment Successful!",
        message: `Payment of P${amount.toFixed(
          2
        )} received via ${paymentMethod}.`,
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
    const receiptElement = receiptRef.current;
    if (receiptElement) {
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                margin: 20px;
                text-align: center;
              }
              pre { 
                white-space: pre-wrap; 
                text-align: center;
              }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <pre>${receiptContent}</pre>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // --- Save Receipt as PNG ---
  const handleSaveReceiptAsImage = () => {
    const receiptElement = receiptRef.current;
    if (receiptElement) {
      html2canvas(receiptElement).then((canvas) => {
        const link = document.createElement("a");
        link.download = `receipt-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    }
  };

  // Handle addon selection
  const handleAddonToggle = (addon) => {
    if (selectedAddons.find((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  // BAGO: Handle upgrade selection (REPLACE, not add to array)
  const handleUpgradeToggle = (upgrade) => {
    if (selectedUpgrades && selectedUpgrades.id === upgrade.id) {
      // If same upgrade is clicked again, deselect it
      setSelectedUpgrades(null);
    } else {
      // Replace with the new upgrade
      setSelectedUpgrades(upgrade);
    }
  };

  // Calculate total addons price
  const calculateAddonsTotal = () => {
    return selectedAddons.reduce(
      (total, addon) => total + Number(addon.price),
      0
    );
  };

  // Filter addons by product category
  const getFilteredAddons = () => {
    if (!selectedProduct) return [];
    return addons.filter(
      (addon) =>
        addon.category === selectedProduct.category ||
        addon.category === "General"
    );
  };

  // BAGO: Filter upgrades by matching product_code
  const getFilteredUpgrades = () => {
    if (!selectedProduct) return [];

    // Find upgrades that have the SAME product_code as the selected product
    return upgrades.filter(
      (upgrade) => upgrade.product_code === selectedProduct.product_code
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Cashier POS System
              </h1>
              <p className="text-red-100 mt-2 text-sm font-medium">
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
                <span className="text-red-100 text-sm font-medium">
                  Store Status:
                </span>
                <button
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-lg ${
                    storeOpen
                      ? "bg-white text-black hover:bg-red-50"
                      : "bg-black hover:bg-black text-white"
                  }`}
                  onClick={handleStoreToggle}
                >
                  {storeOpen ? "OPEN" : "CLOSED"}
                </button>
                {lastActionTime && (
                  <span className="text-red-100 text-sm">
                    {storeOpen ? "Opened" : "Closed"} at{" "}
                    {formatStoreTime(lastActionTime)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className={`px-8 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                  orderType === "Dine In"
                    ? "bg-black text-white shadow-xl scale-105"
                    : "bg-white  text-black"
                }`}
                onClick={() => setOrderType("Dine In")}
              >
                Dine In
              </button>
              <button
                className={`px-8 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                  orderType === "Take-Out"
                    ? "bg-black text-white shadow-xl scale-105"
                    : "bg-white  text-black"
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
                  className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
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
                        ? "bg-red-600 text-white shadow-lg scale-105"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 relative">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`group border-2 rounded-2xl p-4 transition-all duration-300 ${
                    storeOpen
                      ? "border-gray-100 hover:shadow-2xl hover:border-red-200 hover:scale-105"
                      : "border-gray-200 opacity-80"
                  }`}
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
                  <span className="inline-block px-3 py-1 bg-red-100 text-black-700 text-xs font-semibold rounded-full mb-3">
                    {product.category}
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600 font-bold text-xl">
                      P{(Number(product.price) || 0).toFixed(2)}
                    </span>
                    <button
                      className={`px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${
                        storeOpen
                          ? "bg-gradient-to-r from-red-600 to-red-600 text-white hover:from-black hover:to-black hover:shadow-xl"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                      onClick={() => addToCart(product)}
                      disabled={!storeOpen}
                      title={
                        !storeOpen
                          ? "Store is closed - cannot add items"
                          : "Add to cart"
                      }
                    >
                      {storeOpen ? "Add" : "Closed"}
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
                  discountApplied || !storeOpen
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-black hover:shadow-xl"
                }`}
                onClick={applyDiscount}
                disabled={discountApplied || !storeOpen}
                title={
                  !storeOpen
                    ? "Store is closed"
                    : discountApplied
                    ? "Discount already applied"
                    : "Apply discount"
                }
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
                  {cart.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center border-b border-gray-100 pb-4 last:border-b-0 hover:bg-red-50 p-3 rounded-xl transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">
                          {item.selectedUpgrade
                            ? `[UPGRADED] ${item.selectedUpgrade.name}`
                            : item.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          P
                          {(item.finalPrice || Number(item.price) || 0).toFixed(
                            2
                          )}{" "}
                          × {item.quantity}
                        </p>
                        {item.selectedAddons.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Add-ons:{" "}
                            {item.selectedAddons
                              .map((a) => `${a.name} (+P${a.price})`)
                              .join(", ")}
                          </p>
                        )}
                        {item.selectedUpgrade && (
                          <p className="text-xs text-green-600 font-semibold">
                            Upgrade: {item.selectedUpgrade.name}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-xs text-gray-500">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                        <p className="text-red-600 font-bold mt-1">
                          P
                          {(
                            (item.finalPrice || Number(item.price) || 0) *
                            item.quantity
                          ).toFixed(2)}
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
                {discountApplied && (
                  <div className="flex justify-between text-amber-600 font-bold bg-amber-50 p-2 rounded-lg">
                    <span>Discount (20%)</span>
                    <span>-P{(subtotal * 0.2).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl  border-gray-200 pt-4 text-gray-900">
                  <span className="font-bold">Change</span>
                  <span className="font-semibold text-green-600">
                    P{change > 0 ? change.toFixed(2) : "0.00"}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-xl  border-gray-200 pt-4 text-gray-900">
                  <span>Total</span>
                  <span className="text-red-600">P{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <h1 className="text-black font-bold text-lg mb-2">
                Payment Method
              </h1>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    className={`py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                      paymentMethod === "Cash"
                        ? "bg-black text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setPaymentMethod("Cash")}
                  >
                    <span className="font-bold">Cash</span>
                  </button>
                  <button
                    className={`py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                      paymentMethod === "Gcash"
                        ? "bg-black text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setPaymentMethod("Gcash")}
                  >
                    <span className="font-bold">Gcash</span>
                  </button>
                  <button
                    className={`py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                      paymentMethod === "Gcash + Cash"
                        ? "bg-black text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setPaymentMethod("Gcash + Cash")}
                  >
                    <span className="font-bold">Gcash + Cash</span>
                  </button>
                  <button
                    className={`py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                      paymentMethod === "Grab"
                        ? "bg-black text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setPaymentMethod("Grab")}
                  >
                    <span className="font-bold">Grab</span>
                  </button>
                </div>
              </div>

              {/* Payment Section */}
              <div className="space-y-4">
                <h1 className="text-black font-bold text-lg mb-2">
                  Payment Amount
                </h1>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    className={`py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                      storeOpen
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    onClick={() => storeOpen && setPaymentAmount("100")}
                    disabled={!storeOpen}
                  >
                    P100
                  </button>
                  <button
                    className={`py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                      storeOpen
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    onClick={() => storeOpen && setPaymentAmount("500")}
                    disabled={!storeOpen}
                  >
                    P500
                  </button>
                  <button
                    className={`py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${
                      storeOpen
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    onClick={() => storeOpen && setPaymentAmount("1000")}
                    disabled={!storeOpen}
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
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:outline-none focus:ring-2 text-lg font-semibold transition-all ${
                      storeOpen
                        ? "border-gray-200 focus:ring-red-500 focus:border-transparent"
                        : "border-gray-300 bg-gray-100 cursor-not-allowed"
                    }`}
                    value={paymentAmount}
                    onChange={(e) =>
                      storeOpen && setPaymentAmount(e.target.value)
                    }
                    placeholder="0.00"
                    disabled={!storeOpen}
                  />
                </div>

                <button
                  className="w-full bg-red-500 text-white py-5 rounded-xl font-bold text-lg hover:bg-red-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl"
                  onClick={handlePayment}
                  disabled={cart.length === 0 || !storeOpen}
                  title={
                    !storeOpen
                      ? "Store is closed - cannot process payments"
                      : cart.length === 0
                      ? "Cart is empty"
                      : "Process payment"
                  }
                >
                  {storeOpen ? "Process Payment" : "Store Closed"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showStoreSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-fadeIn">
    
            <div
              className={`p-6 rounded-t-3xl ${
                storeOpen
                  ? "bg-gradient-to-r from-red-600 to-red-500 text-white"
                  : "bg-gradient-to-r from-black to-black text-white"
              }`}
            >
              <h3 className="text-2xl font-bold">
                {storeOpen
                  ? "Store Opened Successfully!"
                  : "Store Closed Successfully!"}
              </h3>
              <p className="opacity-90 mt-1">
                {storeOpen
                  ? "Welcome to K-Street POS"
                  : "Thank you for using K-Street POS"}
              </p>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                {/* Icon - Magkaiba depende sa action */}
                <div
                  className={`text-7xl mb-4 ${
                    storeOpen ? "text-red-500" : "text-gray-500"
                  }`}
                >
                  {storeOpen ? "" : ""}
                </div>

                <p className="text-gray-700 text-lg font-medium mb-4">
                  <div className="height 10px">
                    <img
                      src="https://github.com/Titusss19/K-STREET/blob/jmbranch/ssbi-white-logo.png?raw=true"
                      alt=""
                      height="40"
                      width="120"
                      style={{ display: "block", marginLeft: "auto", marginRight: "auto" }}
                    />
                  </div>
                  {storeOpen
                    ? "Your store is now open for business!"
                    : "Your store is now closed for the day."}
                </p>

                {/* Time Display */}
                <div
                  className={`border-2 rounded-2xl p-5 mt-4 ${
                    storeOpen
                      ? "bg-gradient-to-r from-red-50 to-red-50 border-red-200"
                      : "bg-gradient-to-r from-gray-50 to-gray-50 border-gray-200"
                  }`}
                >
                  <p
                    className={`font-semibold text-lg mb-1 ${
                      storeOpen ? "text-red-800" : "text-gray-800"
                    }`}
                  >
                    Store {storeOpen ? "Opened" : "Closed"} At:
                  </p>
                  <p
                    className={`font-bold text-3xl ${
                      storeOpen ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    {storeActionTime}
                  </p>
                </div>

                {/* Additional Message */}
                <div className="mt-4 text-sm text-gray-500">
                  <p>
                    {storeOpen
                      ? "You can now start accepting orders and processing payments."
                      : "All transactions have been completed. See you tomorrow!"}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStoreSuccessModal(false)}
                  className={`flex-1 py-3.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl ${
                    storeOpen
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                      : "bg-gradient-to-r from-black to-black text-white hover:from-black hover:to-black"
                  }`}
                >
                  {storeOpen ? "Start Selling!" : "Got It!"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Add-ons Modal --- */}
      {showAddonsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-t-3xl">
              <h3 className="text-2xl font-bold">Customize Your Order</h3>
              <p className="text-red-100 mt-1">{selectedProduct.name}</p>
              <p className="text-red-100 text-sm">
                Product Code: {selectedProduct.product_code}
              </p>
            </div>

            <div className="p-6">
              {/* Add-ons Section (Sides) */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3">
                  Add-ons (Sides)
                </h4>
                <p className="text-sm text-gray-500 mb-3">
                  Available sides that complement your {selectedProduct.name}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {getFilteredAddons().map((addon) => (
                    <button
                      key={addon.id}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        selectedAddons.find((a) => a.id === addon.id)
                          ? "bg-red-100 border-red-500 text-red-700"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:border-red-300"
                      }`}
                      onClick={() => handleAddonToggle(addon)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{addon.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            +₱{Number(addon.price).toFixed(2)}
                          </span>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedAddons.find((a) => a.id === addon.id)
                              ? "bg-red-500 border-red-500 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedAddons.find((a) => a.id === addon.id) && "✓"}
                        </span>
                      </div>
                    </button>
                  ))}
                  {getFilteredAddons().length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No sides available for this item
                    </p>
                  )}
                </div>
              </div>

              {/* Upgrades Section (BAGO: Single Selection) */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3">
                  Upgrades
                </h4>
                <p className="text-sm text-gray-500 mb-3">
                  Upgrade your {selectedProduct.name} to a better version
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {getFilteredUpgrades().map((upgrade) => (
                    <button
                      key={upgrade.id}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        selectedUpgrades && selectedUpgrades.id === upgrade.id
                          ? "bg-green-100 border-green-500 text-green-700"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:border-green-300"
                      }`}
                      onClick={() => handleUpgradeToggle(upgrade)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{upgrade.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            Upgrade to: ₱{Number(upgrade.price).toFixed(2)}
                          </span>
                          <div className="text-xs text-gray-400 mt-1">
                            Original: ₱
                            {Number(selectedProduct.price).toFixed(2)}
                          </div>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedUpgrades &&
                            selectedUpgrades.id === upgrade.id
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedUpgrades &&
                            selectedUpgrades.id === upgrade.id &&
                            "✓"}
                        </span>
                      </div>
                    </button>
                  ))}
                  {getFilteredUpgrades().length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No upgrades available for {selectedProduct.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Special Instructions */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3">
                  Special Instructions
                </h4>
                <textarea
                  placeholder="Any special requests or instructions..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows="3"
                />
              </div>

              {/* Price Summary (BAGO: Updated for upgrades) */}
              <div className="bg-gray-50 p-4 rounded-xl mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">
                    {selectedUpgrades ? "Upgraded Price:" : "Base Price:"}
                  </span>
                  <span className="font-semibold">
                    ₱
                    {selectedUpgrades
                      ? Number(selectedUpgrades.price).toFixed(2)
                      : Number(selectedProduct.price).toFixed(2)}
                  </span>
                </div>
                {selectedAddons.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Sides:</span>
                    <span className="font-semibold">
                      +₱{calculateAddonsTotal().toFixed(2)}
                    </span>
                  </div>
                )}
                {selectedUpgrades && (
                  <div className="flex justify-between items-center mb-2 text-green-600">
                    <span>Upgrade Applied:</span>
                    <span className="font-semibold">
                      {selectedUpgrades.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-800">
                    Total:
                  </span>
                  <span className="text-lg font-bold text-red-600">
                    ₱
                    {calculateFinalPrice(
                      selectedProduct,
                      selectedAddons,
                      selectedUpgrades
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={confirmAddToCart}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-600 text-white py-3.5 rounded-xl font-semibold hover:from-red-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => {
                    setShowAddonsModal(false);
                    setSelectedProduct(null);
                    setSelectedUpgrades(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Receipt Modal --- */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-fadeIn">
            <div className="p-5 bg-gradient-to-r from-red-600 to-red-600 text-white rounded-t-3xl flex justify-between items-center">
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
                className="flex-1 bg-gradient-to-r from-red-600 to-red-600 text-white py-3 rounded-xl font-semibold hover:from-red-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
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
                  ? "bg-gradient-to-r from-red-500 to-red-500"
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
                      ? "text-red-500"
                      : "text-red-500"
                  }`}
                >
                  {paymentResult.type === "success" ? "✓" : "⚠"}
                </div>
                <p className="text-gray-700 text-lg font-medium mb-4">
                  {paymentResult.message}
                </p>

                {paymentResult.type === "success" ? (
                  <div className="bg-gradient-to-r from-red-50 to-emerald-50 border-2 border-red-200 rounded-2xl p-5 mt-4">
                    <p className="text-red-800 font-semibold text-lg mb-1">
                      Change:
                    </p>
                    <p className="text-red-600 font-bold text-4xl">
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
                      ? "bg-gradient-to-r from-red-500 to-red-500 text-white hover:from-red-600 hover:to-red-600"
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
