import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";

const POS = () => {
  const [orderType, setOrderType] = useState("Dine In");
  const [cart, setCart] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [employeeDiscountApplied, setEmployeeDiscountApplied] = useState(false);

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
  const [flavors, setFlavors] = useState([]);
  const [selectedUpgrades, setSelectedUpgrades] = useState(null);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [showStoreSuccessModal, setShowStoreSuccessModal] = useState(false);
  const [storeActionTime, setStoreActionTime] = useState("");

  const [currentUser, setCurrentUser] = useState(null);

  const receiptRef = useRef();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Extract user with proper structure
      const user = parsedUser.user || parsedUser;
      setCurrentUser(user);
      console.log("Current user loaded:", {
        id: user.id,
        email: user.email,
        branch: user.branch,
      });
    }
  }, []);

  // CREATE AXIOS INSTANCE WITH HEADERS
  const createAxiosWithHeaders = () => {
    const instance = axios.create({
      baseURL: "http://localhost:3002",
    });

    // Add request interceptor to include user in headers
    instance.interceptors.request.use(
      (config) => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            const user = parsedUser.user || parsedUser;

            // Add user to headers as JSON string
            config.headers["x-user"] = JSON.stringify({
              id: user.id,
              email: user.email,
              role: user.role || "cashier",
              branch: user.branch || "main",
            });
          } catch (error) {
            console.error("Error adding user to headers:", error);
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return instance;
  };

  // Fetch all data when user is loaded
  useEffect(() => {
    if (currentUser) {
      checkCurrentStoreStatus();
      fetchProducts();
      fetchAddons();
      fetchUpgrades();
    }
  }, [currentUser]);

  const fetchProducts = async () => {
    if (!currentUser || !currentUser.branch) {
      console.log("No user branch found");
      return;
    }

    try {
      const axiosInstance = createAxiosWithHeaders();
      const res = await axiosInstance.get("http://localhost:3002/items", {
        params: {
          branch: currentUser.branch,
        },
      });

      console.log(
        `Products for branch '${currentUser.branch}':`,
        res.data.length
      );

      const foodItems = res.data.filter(
        (item) => item.description_type === "k-street food"
      );

      const productsWithNumberPrice = foodItems.map((product) => ({
        ...product,
        price: Number(product.price) || 0,
      }));

      setProducts(productsWithNumberPrice);
      setCategories(["All", ...new Set(foodItems.map((p) => p.category))]);

      console.log(
        `✅ Fetched products for branch '${currentUser.branch}':`,
        productsWithNumberPrice.length
      );
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  const fetchAddons = async () => {
    if (!currentUser || !currentUser.branch) {
      console.log("No user branch found for addons");
      return;
    }

    try {
      const axiosInstance = createAxiosWithHeaders();
      const res = await axiosInstance.get("http://localhost:3002/all-items", {
        params: {
          branch: currentUser.branch,
        },
      });

      const addonsItems = res.data.filter(
        (item) => item.description_type === "k-street add sides"
      );
      setAddons(addonsItems);
      console.log(
        `Addons for branch '${currentUser.branch}':`,
        addonsItems.length
      );
    } catch (err) {
      console.error("Failed to fetch addons:", err);
      try {
        const axiosInstance = createAxiosWithHeaders();
        const fallbackRes = await axiosInstance.get(
          "http://localhost:3002/addons",
          {
            params: {
              branch: currentUser.branch,
            },
          }
        );
        setAddons(fallbackRes.data);
      } catch (fallbackErr) {
        console.error("Failed to fetch fallback addons:", fallbackErr);
      }
    }
  };

  const fetchUpgrades = async () => {
    if (!currentUser || !currentUser.branch) {
      console.log("No user branch found for upgrades");
      return;
    }

    try {
      const axiosInstance = createAxiosWithHeaders();
      const res = await axiosInstance.get("http://localhost:3002/all-items", {
        params: {
          branch: currentUser.branch,
        },
      });

      const upgradesItems = res.data.filter(
        (item) => item.description_type === "k-street upgrades"
      );
      setUpgrades(upgradesItems);

      const flavorItems = res.data.filter(
        (item) => item.description_type === "k-street Flavor"
      );
      setFlavors(flavorItems);

      console.log(
        `✅ Fetched upgrades for branch '${currentUser.branch}':`,
        upgradesItems.length
      );
      console.log(
        `✅ Fetched flavors for branch '${currentUser.branch}':`,
        flavorItems.length
      );
    } catch (err) {
      console.error("Failed to fetch upgrades:", err);
      setUpgrades([]);
      setFlavors([]);
    }
  };

  const checkCurrentStoreStatus = async () => {
    if (!currentUser) {
      console.log("No current user");
      setStoreOpen(false);
      return;
    }

    try {
      const userBranch = currentUser.branch || "main";
      console.log("Checking store status for branch:", userBranch);

      const axiosInstance = createAxiosWithHeaders();
      const res = await axiosInstance.get(
        `http://localhost:3002/store-hours/current-store-status`,
        {
          params: {
            branch: userBranch,
          },
        }
      );

      console.log("Store status response:", res.data);
      setStoreOpen(res.data.isOpen);
      if (res.data.lastAction) {
        setLastActionTime(res.data.lastAction.timestamp);
      }
    } catch (error) {
      console.error("Error checking store status:", error);
      setStoreOpen(false);
    }
  };

  const handleStoreToggle = async () => {
    if (!currentUser) {
      alert("Please login first");
      return;
    }

    const userId = currentUser.id;
    const userEmail = currentUser.email;
    const userBranch = currentUser.branch || "main";

    console.log("=== DEBUG: Extracted User Data ===");
    console.log("User ID:", userId);
    console.log("User Email:", userEmail);
    console.log("User Branch:", userBranch);

    if (!userId || !userEmail) {
      console.error("Missing user ID or email:", { userId, userEmail });
      alert("User data incomplete. Please login again.");
      return;
    }

    const newStatus = !storeOpen;
    const action = newStatus ? "open" : "close";

    try {
      console.log("Toggling store status:", {
        action,
        branch: userBranch,
        userId,
        userEmail,
      });

      const axiosInstance = createAxiosWithHeaders();
      const response = await axiosInstance.post(
        "http://localhost:3002/store-hours/log-store-action",
        {
          userId: userId,
          userEmail: userEmail,
          action: action,
          branch: userBranch,
        }
      );

      console.log("Store toggle response:", response.data);

      setStoreOpen(newStatus);
      setLastActionTime(new Date().toISOString());

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

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
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

  const calculateFinalPrice = (product, addons, selectedUpgrade) => {
    let finalPrice = Number(product.price) || 0;

    addons.forEach((addon) => {
      finalPrice += Number(addon.price) || 0;
    });

    if (selectedUpgrade) {
      finalPrice = Number(selectedUpgrade.price) || 0;
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
    setEmployeeDiscountApplied(false);
    setPaymentMethod("Cash");
  };

  const calculateSubtotal = () =>
    cart.reduce(
      (total, item) =>
        total + (item.finalPrice || Number(item.price) || 0) * item.quantity,
      0
    );

  const calculateChange = () => {
    const amount = parseFloat(paymentAmount) || 0;
    const total = calculateTotal();
    return amount > 0 ? amount - total : 0;
  };

const calculateTotal = () => {
  const subtotal = calculateSubtotal();
  let total = subtotal;

  // Parehong discount na ngayon, isang field lang
  if (discountApplied) {
    total *= 0.8; // 20% para sa PWD/Senior
  }
  if (employeeDiscountApplied) {
    total *= 0.95; // 5% para sa Employee
  }

  return total;
};


  const subtotal = calculateSubtotal();
  const total = calculateTotal();
  const change = calculateChange();

  const handlePayment = async () => {
    if (!storeOpen) {
      alert(
        "Store is currently closed. Please open the store first before processing payments."
      );
      return;
    }

    if (!currentUser) {
      alert("Please login first");
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

   const generateReceiptText = () => {
     let receiptText = `
K - Street Mc Arthur Highway, Magaspac,
Gerona, Tarlac
=============================
Cashier: ${currentUser?.username || currentUser?.email || "N/A"}
Branch: ${currentUser?.branch || "main"}
Order Type: ${orderType}
Payment Method: ${paymentMethod}
Date: ${new Date().toLocaleString()}
===============================
Items:
`;

     cart.forEach((item) => {
       const isFlavor =
         item.selectedUpgrade &&
         item.selectedUpgrade.description_type === "k-street Flavor";
       const isUpgrade =
         item.selectedUpgrade &&
         item.selectedUpgrade.description_type !== "k-street Flavor";

       let itemName = item.name;
       if (isFlavor) {
         itemName = `[${item.selectedUpgrade.name} FLAVOR] ${item.name}`;
       } else if (isUpgrade) {
         itemName = `[UPGRADED] ${item.selectedUpgrade.name}`;
       }

       const itemTotal = (
         (item.finalPrice || Number(item.price) || 0) * item.quantity
       ).toFixed(2);

       receiptText += `${itemName} x${item.quantity} P${itemTotal}\n`;

       if (item.selectedAddons.length > 0) {
         receiptText += `Add-ons: ${item.selectedAddons
           .map((a) => `${a.name} (+P${a.price})`)
           .join(", ")}\n`;
       }

       if (item.selectedUpgrade) {
         if (item.selectedUpgrade.description_type === "k-street Flavor") {
           receiptText += `Flavor: ${item.selectedUpgrade.name}\n`;
         } else {
           receiptText += `Upgrade: ${item.selectedUpgrade.name} (P${item.selectedUpgrade.price})\n`;
         }
       }

       if (item.specialInstructions) {
         receiptText += `Instructions: ${item.specialInstructions}\n`;
       }

       receiptText += "\n";
     });

     receiptText += `===============================\n`;
     receiptText += `Subtotal: P${currentSubtotal.toFixed(2)}\n`;

     if (discountApplied) {
       receiptText += `PWD/Senior Discount (20%): Applied\n`;
     }
     if (employeeDiscountApplied) {
       receiptText += `Employee Discount (5%): Applied\n`;
     }

     receiptText += `Total: P${currentTotal.toFixed(2)}\n`;
     receiptText += `Payment Method: ${paymentMethod}\n`;
     receiptText += `Amount Paid: P${amount.toFixed(2)}\n`;
     receiptText += `Change: P${change > 0 ? change.toFixed(2) : "0.00"}\n`;
     receiptText += `===============================\n`;
     receiptText += `Thank you for your order!\n`;

     return receiptText;
   };

    const receipt = generateReceiptText();
    setReceiptContent(receipt);

    const userId = currentUser.id;

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
        .map((item) => {
          if (item.selectedUpgrade) {
            if (item.selectedUpgrade.description_type === "k-street Flavor") {
              return `[${item.selectedUpgrade.name} FLAVOR] ${item.name}`;
            } else {
              return `[UPGRADED] ${item.selectedUpgrade.name}`;
            }
          }
          return item.name;
        })
        .join(", ");

      const itemsData = JSON.stringify(
        cart.map((item) => ({
          id: item.id,
          name: item.selectedUpgrade
            ? item.selectedUpgrade.description_type === "k-street Flavor"
              ? `[${item.selectedUpgrade.name} FLAVOR] ${item.name}`
              : `[UPGRADED] ${item.selectedUpgrade.name}`
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
  discountApplied: discountApplied || employeeDiscountApplied,
  changeAmount: change,
  orderType,
  productNames: productNames,
  items: itemsData,
  paymentMethod: paymentMethod,
  branch: currentUser.branch || "main",
};
      console.log("Saving order for branch:", currentUser.branch);

      const axiosInstance = createAxiosWithHeaders();
      await axiosInstance.post("http://localhost:3002/orders", orderData);

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

const applyDiscount = () => {
  if (!storeOpen) {
    alert("Store is closed");
    return;
  }
  
  // Remove employee discount if it's applied
  if (employeeDiscountApplied) {
    setEmployeeDiscountApplied(false);
  }
  
  // Toggle PWD/Senior discount
  setDiscountApplied(!discountApplied);
};

const applyEmployeeDiscount = () => {
  if (!storeOpen) {
    alert("Store is closed");
    return;
  }
  
  // Remove PWD/Senior discount if it's applied
  if (discountApplied) {
    setDiscountApplied(false);
  }
  
  // Toggle employee discount
  setEmployeeDiscountApplied(!employeeDiscountApplied);
};


  const handlePrintReceipt = () => {
    if (!receiptContent || receiptContent.trim() === "") {
      alert("No receipt content to print!");
      return;
    }

  const createReceiptText = () => {
    const currentSubtotal = calculateSubtotal();
    const currentTotal = calculateTotal();
    const change = parseFloat(paymentAmount) - currentTotal;

    let receiptText = `
K - Street Mc Arthur Highway, Magaspac,
Gerona, Tarlac
=============================
Cashier: ${currentUser?.username || currentUser?.email || "N/A"}
Branch: ${currentUser?.branch || "main"}
Order Type: ${orderType}
Payment Method: ${paymentMethod}
Date: ${new Date().toLocaleString()}
===============================
Items:
`;
    cart.forEach((item) => {
      const isFlavor =
        item.selectedUpgrade &&
        item.selectedUpgrade.description_type === "k-street Flavor";
      const isUpgrade =
        item.selectedUpgrade &&
        item.selectedUpgrade.description_type !== "k-street Flavor";

      let itemName = item.name;
      if (isFlavor) {
        itemName = `[${item.selectedUpgrade.name} FLAVOR] ${item.name}`;
      } else if (isUpgrade) {
        itemName = `[UPGRADED] ${item.selectedUpgrade.name}`;
      }

      const itemTotal = (
        (item.finalPrice || Number(item.price) || 0) * item.quantity
      ).toFixed(2);

      receiptText += `${itemName} x${item.quantity} P${itemTotal}\n`;

      if (item.selectedAddons.length > 0) {
        receiptText += `Add-ons: ${item.selectedAddons
          .map((a) => `${a.name} (+P${a.price})`)
          .join(", ")}\n`;
      }

      if (item.selectedUpgrade) {
        if (item.selectedUpgrade.description_type === "k-street Flavor") {
          receiptText += `Flavor: ${item.selectedUpgrade.name}\n`;
        } else {
          receiptText += `Upgrade: ${item.selectedUpgrade.name} (P${item.selectedUpgrade.price})\n`;
        }
      }

      if (item.specialInstructions) {
        receiptText += `Instructions: ${item.specialInstructions}\n`;
      }

      receiptText += "\n";
    });

    receiptText += `===============================\n`;
    receiptText += `Subtotal: P${currentSubtotal.toFixed(2)}\n`;

    // Sa generateReceiptText() function, idagdag:
    // Sa generateReceiptText() function, gawing ganito:
    if (discountApplied) {
      receiptText += `PWD/Senior Discount (20%): Applied\n`;
    }
    if (employeeDiscountApplied) {
      receiptText += `Employee Discount (5%): Applied\n`;
    }

    receiptText += `Total: P${currentTotal.toFixed(2)}\n`;
    receiptText += `Payment Method: ${paymentMethod}\n`;
    receiptText += `Amount Paid: P${parseFloat(paymentAmount).toFixed(2)}\n`;
    receiptText += `Change: P${change > 0 ? change.toFixed(2) : "0.00"}\n`;
    receiptText += `===============================\n`;
    receiptText += `Thank you for your order!\n`;

    return receiptText;
  };

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>K-Street Receipt</title>
        <style>
          @media print {
            body {
              margin: 0;
              padding: 10px;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              line-height: 1.3;
              width: 300px;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.3;
            padding: 20px;
            width: 300px;
            margin: 0 auto;
            white-space: pre-wrap;
            text-align: center;
          }
        </style>
      </head>
      <body>
        ${createReceiptText()}
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleSaveReceiptAsImage = async () => {
    try {
      if (!receiptContent || receiptContent.trim() === "") {
        alert("No receipt content to save!");
        return;
      }

      console.log("Saving receipt as PNG...");

    const createReceiptText = () => {
      const currentSubtotal = calculateSubtotal();
      const currentTotal = calculateTotal();
      const change = parseFloat(paymentAmount) - currentTotal;

      let receiptText = `
K - Street Mc Arthur Highway, Magaspac,
Gerona, Tarlac
=============================
Cashier: ${currentUser?.username || currentUser?.email || "N/A"}
Branch: ${currentUser?.branch || "main"}
Order Type: ${orderType}
Payment Method: ${paymentMethod}
Date: ${new Date().toLocaleString()}
===============================
Items:
`;

      cart.forEach((item) => {
        const isFlavor =
          item.selectedUpgrade &&
          item.selectedUpgrade.description_type === "k-street Flavor";
        const isUpgrade =
          item.selectedUpgrade &&
          item.selectedUpgrade.description_type !== "k-street Flavor";

        let itemName = item.name;
        if (isFlavor) {
          itemName = `[${item.selectedUpgrade.name} FLAVOR] ${item.name}`;
        } else if (isUpgrade) {
          itemName = `[UPGRADED] ${item.selectedUpgrade.name}`;
        }

        const itemTotal = (
          (item.finalPrice || Number(item.price) || 0) * item.quantity
        ).toFixed(2);

        receiptText += `${itemName} x${item.quantity} P${itemTotal}\n`;

        if (item.selectedAddons.length > 0) {
          receiptText += `Add-ons: ${item.selectedAddons
            .map((a) => `${a.name} (+P${a.price})`)
            .join(", ")}\n`;
        }

        if (item.selectedUpgrade) {
          if (item.selectedUpgrade.description_type === "k-street Flavor") {
            receiptText += `Flavor: ${item.selectedUpgrade.name}\n`;
          } else {
            receiptText += `Upgrade: ${item.selectedUpgrade.name} (P${item.selectedUpgrade.price})\n`;
          }
        }

        if (item.specialInstructions) {
          receiptText += `Instructions: ${item.specialInstructions}\n`;
        }

        receiptText += "\n";
      });

      receiptText += `===============================\n`;
      receiptText += `Subtotal: P${currentSubtotal.toFixed(2)}\n`;

      if (discountApplied) {
        receiptText += `PWD/Senior Discount (20%): Applied\n`;
      }
      if (employeeDiscountApplied) {
        receiptText += `Employee Discount (5%): Applied\n`;
      }

      receiptText += `Total: P${currentTotal.toFixed(2)}\n`;
      receiptText += `Payment Method: ${paymentMethod}\n`;
      receiptText += `Amount Paid: P${parseFloat(paymentAmount).toFixed(2)}\n`;
      receiptText += `Change: P${change > 0 ? change.toFixed(2) : "0.00"}\n`;
      receiptText += `===============================\n`;
      receiptText += `Thank you for your order!\n`;

      return receiptText;
    };

      const receiptHTML = `
        <div style="
          width: 400px;
          padding: 20px;
          background: white;
          color: black;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.3;
          white-space: pre-wrap;
          box-sizing: border-box;
          text-align: center;
        ">
          ${createReceiptText()}
        </div>
      `;

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.innerHTML = receiptHTML;
      document.body.appendChild(container);

      const receiptDiv = container.querySelector("div");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(receiptDiv, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: receiptDiv.offsetWidth,
        height: receiptDiv.offsetHeight,
        windowWidth: receiptDiv.offsetWidth,
        windowHeight: receiptDiv.offsetHeight,
      });

      const imgData = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      const timestamp = new Date().getTime();
      link.download = `k-street-receipt-${timestamp}.png`;
      link.href = imgData;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      document.body.removeChild(container);

      console.log("Receipt saved successfully!");
    } catch (error) {
      console.error("Error saving receipt as PNG:", error);
      alert("Failed to save receipt as PNG. Please try again.");
    }
  };

  const handleAddonToggle = (addon) => {
    if (selectedAddons.find((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleUpgradeToggle = (upgrade) => {
    if (selectedUpgrades && selectedUpgrades.id === upgrade.id) {
      setSelectedUpgrades(null);
    } else {
      setSelectedUpgrades(upgrade);
    }
  };

  const calculateAddonsTotal = () => {
    return selectedAddons.reduce(
      (total, addon) => total + Number(addon.price),
      0
    );
  };

  const getFilteredAddons = () => {
    if (!selectedProduct) return [];
    return addons.filter(
      (addon) =>
        addon.category === selectedProduct.category ||
        addon.category === "General"
    );
  };

  const getFilteredUpgrades = () => {
    if (!selectedProduct) return [];

    const selectedProductCode = selectedProduct.product_code;

    console.log("🔍 Looking for items with product_code:", selectedProductCode);
    console.log("Upgrades count:", upgrades.length);
    console.log("Flavors count:", flavors.length);

    const allItems = [...upgrades, ...flavors];

    const filtered = allItems.filter(
      (item) => item.product_code === selectedProductCode
    );

    console.log("✅ Found items:", filtered);

    return filtered;
  };

  const calculateDiscountAmount = () => {
    if (discountApplied) return subtotal * 0.2;
    if (employeeDiscountApplied) return subtotal * 0.05;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
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
                {currentUser && (
                  <span className="text-red-100 text-sm">
                    Branch: {currentUser.branch || "main"}
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
          <div className="lg:w-2/3 p-6 border-r border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Product Catalog {currentUser && `(${currentUser.branch} Branch)`}
            </h2>

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

            {/* Sa POS component, update the discount buttons */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <button
                className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all shadow-lg ${
                  discountApplied
                    ? "bg-black text-white" // Active state
                    : !storeOpen
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-black to-black hover:from-red-600 hover:to-red-600 hover:shadow-xl"
                }`}
                onClick={applyDiscount}
                disabled={!storeOpen}
                title={
                  !storeOpen
                    ? "Store is closed"
                    : discountApplied
                    ? "Remove PWD/Senior discount"
                    : "Apply PWD/Senior discount (20%)"
                }
              >
                {discountApplied ? "PWD/Senior 20% ✓" : "PWD/Senior 20%"}
              </button>

              <button
                className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all shadow-lg ${
                  employeeDiscountApplied
                    ? "bg-black text-white" // Active state
                    : !storeOpen
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-red-600 hover:from-black hover:to-black hover:shadow-xl"
                }`}
                onClick={applyEmployeeDiscount}
                disabled={!storeOpen}
                title={
                  !storeOpen
                    ? "Store is closed"
                    : employeeDiscountApplied
                    ? "Remove Employee discount"
                    : "Apply Employee discount (5%)"
                }
              >
                {employeeDiscountApplied ? "Employee 5% ✓" : "Employee 5%"}
              </button>
            </div>

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
                            ? item.selectedUpgrade.description_type ===
                              "k-street Flavor"
                              ? `[${item.selectedUpgrade.name} FLAVOR] ${item.name}`
                              : `[UPGRADED] ${item.selectedUpgrade.name}`
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
                          <p
                            className={`text-xs font-semibold ${
                              item.selectedUpgrade.description_type ===
                              "k-street Flavor"
                                ? "text-purple-600"
                                : "text-green-600"
                            }`}
                          >
                            {item.selectedUpgrade.description_type ===
                            "k-street Flavor"
                              ? "Flavor"
                              : "Upgrade"}
                            : {item.selectedUpgrade.name}
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

            <div className="border-t-2 border-gray-200 pt-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-semibold">P{subtotal.toFixed(2)}</span>
                </div>

                {discountApplied && (
                  <div className="flex justify-between text-amber-600 font-bold bg-amber-50 p-2 rounded-lg">
                    <span>PWD/Senior Discount (20%)</span>
                    <span>-P{(subtotal * 0.2).toFixed(2)}</span>
                  </div>
                )}

                {employeeDiscountApplied && (
                  <div className="flex justify-between text-blue-600 font-bold bg-blue-50 p-2 rounded-lg">
                    <span>Employee Discount (5%)</span>
                    <span>-P{(subtotal * 0.05).toFixed(2)}</span>
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
        <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                      style={{
                        display: "block",
                        marginLeft: "auto",
                        marginRight: "auto",
                      }}
                    />
                  </div>
                  {storeOpen
                    ? "Your store is now open for business!"
                    : "Your store is now closed for the day."}
                </p>

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

                <div className="mt-4 text-sm text-gray-500">
                  <p>
                    {storeOpen
                      ? "You can now start accepting orders and processing payments."
                      : "All transactions have been completed. See you tomorrow!"}
                  </p>
                </div>
              </div>

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

      {showAddonsModal && selectedProduct && (
        <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-t-3xl">
              <h3 className="text-2xl font-bold">Customize Your Order</h3>
              <p className="text-red-100 mt-1">{selectedProduct.name}</p>
              <p className="text-red-100 text-sm">
                Product Code: {selectedProduct.product_code}
              </p>
            </div>

            <div className="p-6">
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

              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3">
                  Upgrades
                </h4>
                <p className="text-sm text-gray-500 mb-3">
                  Upgrade your {selectedProduct.name} to a better version
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {getFilteredUpgrades()
                    .filter(
                      (item) => item.description_type === "k-street upgrades"
                    )
                    .map((upgrade) => (
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
                  {getFilteredUpgrades().filter(
                    (item) => item.description_type === "k-street upgrades"
                  ).length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No upgrades available for {selectedProduct.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3">
                  k-street Flavor
                </h4>
                <p className="text-sm text-gray-500 mb-3">
                  Different flavor variations for your {selectedProduct.name}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {getFilteredUpgrades()
                    .filter(
                      (item) => item.description_type === "k-street Flavor"
                    )
                    .map((flavorItem) => (
                      <button
                        key={flavorItem.id}
                        className={`p-3 rounded-xl border-2 transition-all text-left ${
                          selectedUpgrades &&
                          selectedUpgrades.id === flavorItem.id
                            ? "bg-purple-100 border-purple-500 text-purple-700"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:border-purple-300"
                        }`}
                        onClick={() => handleUpgradeToggle(flavorItem)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">
                              {flavorItem.name}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">
                              Flavor: ₱{Number(flavorItem.price).toFixed(2)}
                            </span>
                            <div className="text-xs text-gray-400 mt-1">
                              Original: ₱
                              {Number(selectedProduct.price).toFixed(2)}
                            </div>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedUpgrades &&
                              selectedUpgrades.id === flavorItem.id
                                ? "bg-purple-500 border-purple-500 text-white"
                                : "border-gray-300"
                            }`}
                          >
                            {selectedUpgrades &&
                              selectedUpgrades.id === flavorItem.id &&
                              "✓"}
                          </span>
                        </div>
                      </button>
                    ))}
                  {getFilteredUpgrades().filter(
                    (item) => item.description_type === "k-street Flavor"
                  ).length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No flavor variations available for {selectedProduct.name}
                    </p>
                  )}
                </div>
              </div>

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
                {selectedUpgrades &&
                selectedUpgrades.description_type === "k-street Flavor" ? (
                  <div className="flex justify-between items-center mb-2 text-purple-600">
                    <span>Flavor Applied:</span>
                    <span className="font-semibold">
                      {selectedUpgrades.name}
                    </span>
                  </div>
                ) : (
                  selectedUpgrades && (
                    <div className="flex justify-between items-center mb-2 text-green-600">
                      <span>Upgrade Applied:</span>
                      <span className="font-semibold">
                        {selectedUpgrades.name}
                      </span>
                    </div>
                  )
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

      {showReceiptModal && (
        <div className="fixed inset-0  bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
              <div
                ref={receiptRef}
                className="text-center font-mono text-sm text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-lg"
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "14px",
                  lineHeight: "1.4",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                }}
              >
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-5xl mb-3">🛒</div>
                    <p className="text-lg font-semibold text-gray-500">
                      No Receipt
                    </p>
                    <p className="text-sm mt-1">Process a payment first</p>
                  </div>
                ) : (
                  <>
                    <div className="font-bold text-lg mb-2">
                      K - Street
                      <br />
                      Mc Arthur Highway, Magaspac
                      <br />
                      Gerona, Tarlac
                    </div>
                    <hr className="border-dashed border-gray-400 my-3" />
                    <div className="text-left">
                      <strong>Cashier:</strong>{" "}
                      {currentUser?.username || currentUser?.email || "N/A"}
                      <br />
                      <strong>Branch:</strong> {currentUser?.branch || "main"}
                      <br />
                      <strong>Order Type:</strong> {orderType}
                      <br />
                      <strong>Payment Method:</strong> {paymentMethod}
                      <br />
                      <strong>Date:</strong> {new Date().toLocaleString()}
                    </div>
                    <hr className="border-dashed border-gray-400 my-3" />
                    <div className="text-left">
                      <strong>Items:</strong>
                      <br />
                      {cart.map((item, index) => {
                        const isFlavor =
                          item.selectedUpgrade &&
                          item.selectedUpgrade.description_type ===
                            "k-street Flavor";
                        const isUpgrade =
                          item.selectedUpgrade &&
                          item.selectedUpgrade.description_type !==
                            "k-street Flavor";

                        let itemName = item.name;
                        if (isFlavor) {
                          itemName = `[${item.selectedUpgrade.name} FLAVOR] ${item.name}`;
                        } else if (isUpgrade) {
                          itemName = `[UPGRADED] ${item.selectedUpgrade.name}`;
                        }

                        return (
                          <div key={index} className="mb-2">
                            {itemName} x{item.quantity} P
                            {(
                              (item.finalPrice || Number(item.price) || 0) *
                              item.quantity
                            ).toFixed(2)}
                            {item.selectedAddons.length > 0 && (
                              <div className="text-xs text-gray-600 ml-2">
                                Add-ons:{" "}
                                {item.selectedAddons
                                  .map((a) => `${a.name} (+P${a.price})`)
                                  .join(", ")}
                              </div>
                            )}
                            {item.selectedUpgrade && (
                              <div className="text-xs text-gray-600 ml-2">
                                {item.selectedUpgrade.description_type ===
                                "k-street Flavor"
                                  ? "Flavor"
                                  : "Upgrade"}
                                : {item.selectedUpgrade.name}
                                {item.selectedUpgrade.description_type !==
                                  "k-street Flavor" &&
                                  ` (P${item.selectedUpgrade.price})`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <hr className="border-dashed border-gray-400 my-3" />
                    <div className="text-left">
                      <div>
                        <strong>Subtotal:</strong> P
                        {calculateSubtotal().toFixed(2)}
                      </div>
                      {discountApplied && (
                        <div>
                          <strong>PWD/Senior Discount (20%):</strong> Applied
                        </div>
                      )}
                      {employeeDiscountApplied && (
                        <div>
                          <strong>Employee Discount (5%):</strong> Applied
                        </div>
                      )}
                      <div>
                        <strong>Total:</strong> P{calculateTotal().toFixed(2)}
                      </div>
                      <div>
                        <strong>Payment Method:</strong> {paymentMethod}
                      </div>
                      <div>
                        <strong>Amount Paid:</strong> P{paymentAmount}
                      </div>
                      <div>
                        <strong>Change:</strong> P{calculateChange().toFixed(2)}
                      </div>
                    </div>
                    <hr className="border-dashed border-gray-400 my-3" />
                    <div className="font-bold mt-4">
                      Thank you for your order!
                    </div>
                  </>
                )}
              </div>
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

      {showPaymentModal && paymentResult && (
        <div className="fixed inset-0  bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                  <div className="bg-gradient-to-r from-red-50  border-1 border-red-200 rounded-2xl p-5 mt-4">
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

export default POS;
