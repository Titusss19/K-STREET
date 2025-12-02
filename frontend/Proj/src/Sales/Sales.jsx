import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const Sales = ({ user }) => {
  const [sales, setSales] = useState([]);
  const [storeHoursLogs, setStoreHoursLogs] = useState([]);
  const [showReceipt, setShowReceipt] = useState(null);
  const [showCashierDetails, setShowCashierDetails] = useState(null);
  const [exportRange, setExportRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeReport, setActiveReport] = useState("sales");
  const [cashierCurrentPage, setCashierCurrentPage] = useState(1);

  // New states for void functionality
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [orderToVoid, setOrderToVoid] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // New states for success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Refs for print content
  const receiptPrintRef = useRef(null);
  const cashierPrintRef = useRef(null);

  // Fetch orders from backend
  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await axios.get("http://localhost:3002/orders");
      setSales(res.data);
    } catch (err) {
      console.error("Error fetching sales:", err);
    }
  };

  // Fetch store hours logs and compute cashier data
  useEffect(() => {
    const fetchStoreHoursLogs = async () => {
      try {
        const res = await axios.get("http://localhost:3002/store-hours-logs");
        const logsWithSales = await computeCashierSalesData(res.data);
        setStoreHoursLogs(logsWithSales);
      } catch (err) {
        console.error("Error fetching store hours logs:", err);
      }
    };

    if (activeReport === "payment-methods") {
      fetchStoreHoursLogs();
    }
  }, [activeReport, sales]);

  // Compute cashier sales data based on store hours logs and orders
  const computeCashierSalesData = async (logs) => {
    const logsWithSales = await Promise.all(
      logs.map(async (log) => {
        // Find the next "close" action to determine session end time
        const nextCloseLog = logs.find(
          (l, index) =>
            l.id > log.id &&
            l.action === "close" &&
            l.user_email === log.user_email
        );

        const loginTime = new Date(log.timestamp);
        const logoutTime = nextCloseLog
          ? new Date(nextCloseLog.timestamp)
          : null;

        // Calculate sales during this session
        const sessionSales = sales.filter((order) => {
          const orderTime = new Date(order.created_at);
          return (
            orderTime >= loginTime &&
            (!logoutTime || orderTime <= logoutTime) &&
            order.userId === log.user_id &&
            !order.is_void // Exclude voided orders
          );
        });

        const totalSales = sessionSales.reduce(
          (sum, order) => sum + parseFloat(order.total || 0),
          0
        );

        // Calculate starting gross sales (sales before login)
        const salesBeforeLogin = sales.filter((order) => {
          const orderTime = new Date(order.created_at);
          return orderTime < loginTime && !order.is_void;
        });

        const startGrossSales = salesBeforeLogin.reduce(
          (sum, order) => sum + parseFloat(order.total || 0),
          0
        );

        const endGrossSales = startGrossSales + totalSales;

        // Calculate payment methods summary
        const paymentMethodsSummary = {};
        sessionSales.forEach((order) => {
          const method = order.payment_method || "Unknown";
          const amount = parseFloat(order.total || 0);

          if (!paymentMethodsSummary[method]) {
            paymentMethodsSummary[method] = {
              totalAmount: 0,
              transactionCount: 0,
            };
          }

          paymentMethodsSummary[method].totalAmount += amount;
          paymentMethodsSummary[method].transactionCount += 1;
        });

        return {
          ...log,
          login_time: log.timestamp,
          logout_time: nextCloseLog ? nextCloseLog.timestamp : null,
          start_gross_sales: startGrossSales,
          end_gross_sales: endGrossSales,
          session_sales: totalSales,
          session_duration: logoutTime ? logoutTime - loginTime : null,
          session_orders: sessionSales,
          payment_methods_summary: paymentMethodsSummary,
        };
      })
    );

    // Filter only "open" actions and remove duplicates
    return logsWithSales.filter((log) => log.action === "open");
  };

  // Filter sales based on selected range
  const getFilteredSales = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (exportRange === "today") {
      return sales.filter((sale) => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= today;
      });
    } else if (exportRange === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return sales.filter((sale) => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= start && saleDate <= end;
      });
    }
    return sales;
  };

  // Filter cashier logs based on selected range
  const getFilteredCashierLogs = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (exportRange === "today") {
      return storeHoursLogs.filter((log) => {
        const logDate = new Date(log.login_time);
        return logDate >= today;
      });
    } else if (exportRange === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return storeHoursLogs.filter((log) => {
        const logDate = new Date(log.login_time);
        return logDate >= start && logDate <= end;
      });
    }
    return storeHoursLogs;
  };

  // Format product names for display
  const formatProductNames = (sale) => {
    if (sale.productNames && sale.productNames !== "No items") {
      return sale.productNames;
    }

    if (sale.items && sale.items !== "[]") {
      try {
        const items = JSON.parse(sale.items);
        if (Array.isArray(items) && items.length > 0) {
          return items.map((item) => item.name).join(", ");
        }
      } catch (error) {
        console.error("Error parsing items:", error);
      }
    }

    return "No product names available";
  };

  // Get items for receipt display - IMPROVED VERSION
  const getReceiptItems = (sale) => {
    // Try to parse items JSON
    if (sale.items && sale.items !== "[]" && sale.items !== "{}") {
      try {
        const items = JSON.parse(sale.items);
        if (Array.isArray(items) && items.length > 0) {
          // Return items with proper formatting
          return items.map((item) => ({
            id: item.id || Math.random(),
            name: item.name || "Unknown Item",
            quantity: item.quantity || 1,
            price: item.price || item.finalPrice || 0,
            subtotal:
              (item.price || item.finalPrice || 0) * (item.quantity || 1),
            specialInstructions: item.specialInstructions || null,
            selectedUpgrade: item.selectedUpgrade || null,
            selectedAddons: item.selectedAddons || [],
          }));
        }
      } catch (error) {
        console.error("Error parsing items for receipt:", error);
      }
    }

    // If productNames exists
    if (sale.productNames && sale.productNames !== "No items") {
      const productNames = sale.productNames.split(", ");
      return productNames.map((name, index) => ({
        id: index + 1,
        name: name,
        quantity: 1,
        price: parseFloat(sale.total) / productNames.length,
        subtotal: parseFloat(sale.total) / productNames.length,
      }));
    }

    // Default fallback
    return [
      {
        id: 1,
        name: `Order #${sale.id}`,
        quantity: 1,
        price: parseFloat(sale.total) || 0,
        subtotal: parseFloat(sale.total) || 0,
      },
    ];
  };

  // Calculate session duration
  const calculateSessionDuration = (loginTime, logoutTime) => {
    if (!loginTime || !logoutTime) return "Still Active";

    const login = new Date(loginTime);
    const logout = new Date(logoutTime);
    const durationMs = logout - login;

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  // VOID ORDER FUNCTIONALITY
  const handleVoidOrder = (order) => {
    setOrderToVoid(order);
    setShowVoidModal(true);
    setVoidReason("");
  };

  const confirmVoidOrder = async () => {
    if (!voidReason.trim()) {
      alert("Please enter a reason for voiding this order.");
      return;
    }

    setIsVoiding(true);
    try {
      // Send the user object (who is performing the void)
      const response = await axios.put(
        `http://localhost:3002/orders/${orderToVoid.id}/void`,
        {
          is_void: true,
          void_reason: voidReason,
          user: user, // THIS IS THE USER WHO IS VOIDING
          voided_at: new Date().toISOString(),
        }
      );

      if (response.status === 200) {
        // Update local state
        const voidedByName = user?.name || user?.email || "Admin";

        setSales((prevSales) =>
          prevSales.map((order) =>
            order.id === orderToVoid.id
              ? {
                  ...order,
                  is_void: true,
                  void_reason: voidReason,
                  voided_by: voidedByName, // Store who voided it
                  voided_by_user: user, // Store full user object
                  voided_at: new Date().toISOString(),
                  // Keep original cashier separate
                  cashier: order.cashier, // This stays as original cashier
                }
              : order
          )
        );

        // Show success message
        setSuccessMessage(
          `Order #${orderToVoid.id} has been successfully voided by ${voidedByName}.`
        );
        setShowSuccessModal(true);

        // Close modal and reset
        setShowVoidModal(false);
        setOrderToVoid(null);
        setVoidReason("");
      }
    } catch (error) {
      console.error("Error voiding order:", error);
      alert("Failed to void order. Please try again.");
    } finally {
      setIsVoiding(false);
    }
  };

  // Check if order is voided
  const isOrderVoided = (order) => {
    return order.is_void === true || order.is_void === 1;
  };

  // Get void badge style
  const getVoidBadge = (order) => {
    if (!isOrderVoided(order)) return null;

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
        VOIDED
      </span>
    );
  };

  // Print functions
  const printReceipt = () => {
    const printWindow = window.open("", "_blank");
    const receipt = showReceipt;

    // Create receipt text function similar to yours
    const createReceiptText = (receipt) => {
      const cashierName = receipt.cashier || "N/A";
      const isVoided = isOrderVoided(receipt);

      let receiptText = `
K - Street Mc Arthur Highway, Magaspac,
Gerona, Tarlac
=============================
${isVoided ? "=== VOIDED RECEIPT ===" : ""}
Cashier: ${cashierName}
Order Type: ${receipt.orderType}
Payment Method: ${receipt.payment_method || "Cash"}
Date: ${new Date(receipt.created_at).toLocaleString("en-PH")}
${isVoided ? `Voided by: ${receipt.voided_by || "Admin"}` : ""}
${isVoided ? `Void Reason: ${receipt.void_reason || "Not specified"}` : ""}
${
  isVoided
    ? `Void Date: ${new Date(
        receipt.voided_at || receipt.created_at
      ).toLocaleString("en-PH")}`
    : ""
}
===============================
Items:
`;

      // Parse items from the receipt
      const items = getReceiptItems(receipt);

      // Add cart items
      items.forEach((item) => {
        const itemName = item.name || `Item ${item.id}`;
        const itemTotal = ((item.price || 0) * (item.quantity || 1)).toFixed(2);

        receiptText += `${itemName} x${item.quantity || 1} P${itemTotal}\n`;

        // Add special instructions if any
        if (item.specialInstructions) {
          receiptText += `Instructions: ${item.specialInstructions}\n`;
        }

        receiptText += "\n";
      });

      // Add totals
      receiptText += `===============================\n`;
      receiptText += `Subtotal: P${parseFloat(receipt.total || 0).toFixed(
        2
      )}\n`;

      // Check for discount
      if (receipt.discountApplied) {
        receiptText += `Discount (20%): Applied\n`;
      }

      receiptText += `Total: P${parseFloat(receipt.total || 0).toFixed(2)}\n`;
      receiptText += `Payment Method: ${receipt.payment_method || "Cash"}\n`;
      receiptText += `Amount Paid: P${parseFloat(
        receipt.paidAmount || 0
      ).toFixed(2)}\n`;

      const change = parseFloat(receipt.changeAmount || 0);
      receiptText += `Change: P${change > 0 ? change.toFixed(2) : "0.00"}\n`;
      receiptText += `===============================\n`;
      receiptText += `${
        isVoided
          ? "*** THIS TRANSACTION IS VOIDED ***\n"
          : "Thank you for your order!\n"
      }`;

      return receiptText;
    };

    // Check if receipt is voided
    if (isOrderVoided(receipt)) {
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>K-STREET VOIDED RECEIPT - Order #${receipt.id}</title>
        <style>
          @media print {
            @page { 
              margin: 0;
              padding: 0;
              size: 80mm auto;
            }
            body { 
              margin: 0;
              padding: 0;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              width: 80mm;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            border: 3px dashed #ff0000;
          }
          .void-stamp {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 40px;
            font-weight: bold;
            color: rgba(255, 0, 0, 0.3);
            z-index: 100;
          }
          .receipt-content {
            position: relative;
            z-index: 10;
          }
          .header {
            text-align: center;
            margin-bottom: 5px;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
          }
          .store-name {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 2px;
            color: #ff0000;
          }
          .void-info {
            background-color: #ffebee;
            border: 2px solid #ff0000;
            padding: 5px;
            margin: 5px 0;
            text-align: center;
            font-weight: bold;
          }
          .receipt-body {
            white-space: pre-wrap;
            line-height: 1.3;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="void-stamp">VOIDED</div>
        <div class="receipt-content">
          <div class="header">
            <div class="store-name">K - STREET</div>
            <div class="store-address">Mc Arthur Highway, Magaspac, Gerona, Tarlac</div>
            <div class="void-info">
              ⚠️ THIS RECEIPT IS VOIDED ⚠️
            </div>
          </div>
          
          <div class="receipt-body">
            ${createReceiptText(receipt)}
          </div>
          
          <div class="footer">
            <div style="margin-bottom: 3px; color: #ff0000; font-weight: bold;">VOIDED TRANSACTION</div>
            <div>This receipt is no longer valid</div>
            <div style="margin-top: 5px;">${new Date().toLocaleString(
              "en-PH"
            )}</div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            }, 100);
          }
        </script>
      </body>
      </html>
    `);
    } else {
      // NON-VOIDED receipt with your design
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>K-STREET Receipt - Order #${receipt.id}</title>
        <style>
          @media print {
            @page { 
              margin: 0;
              padding: 0;
              size: 80mm auto;
            }
            body { 
              margin: 0;
              padding: 0;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              width: 80mm;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
          }
          .header {
            text-align: center;
            margin-bottom: 5px;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
          }
          .store-name {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 2px;
          }
          .store-address {
            font-size: 10px;
            margin-bottom: 3px;
          }
          .receipt-body {
            white-space: pre-wrap;
            line-height: 1.3;
            margin-bottom: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 5px;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">K - STREET</div>
          <div class="store-address">Mc Arthur Highway, Magaspac, Gerona, Tarlac</div>
        </div>
        
        <div class="receipt-body">
          ${createReceiptText(receipt)}
        </div>
        
        <div class="footer">
          <div style="margin-bottom: 3px;">Thank you for your order!</div>
          <div>Please come again!</div>
          <div style="margin-top: 5px;">${new Date().toLocaleString(
            "en-PH"
          )}</div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            }, 100);
          }
        </script>
      </body>
      </html>
    `);
    }
    printWindow.document.close();
  };

 const printCashierReport = () => {
   const cashierData = showCashierDetails;

   // CALCULATE TOTAL DISCOUNT AND TOTAL VOID AMOUNT
   const totalDiscount = cashierData.session_orders
     ? cashierData.session_orders.reduce((sum, order) => {
         if (order.discountApplied) {
           return sum + (parseFloat(order.total) / 0.8) * 0.2;
         }
         return sum;
       }, 0)
     : 0;

   const totalVoidAmount = sales
     .filter(
       (order) =>
         order.userId === cashierData.user_id &&
         isOrderVoided(order) &&
         new Date(order.created_at) >= new Date(cashierData.login_time) &&
         (!cashierData.logout_time ||
           new Date(order.created_at) <= new Date(cashierData.logout_time))
     )
     .reduce((sum, order) => sum + parseFloat(order.total || 0), 0);

   const totalVoidTransactions = sales.filter(
     (order) =>
       order.userId === cashierData.user_id &&
       isOrderVoided(order) &&
       new Date(order.created_at) >= new Date(cashierData.login_time) &&
       (!cashierData.logout_time ||
         new Date(order.created_at) <= new Date(cashierData.logout_time))
   ).length;

   const printWindow = window.open("", "_blank");

   printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>K-STREET Cashier Report - ${cashierData.user_email}</title>
      <style>
        @media print {
          @page { 
            margin: 15mm;
            size: A4 portrait;
          }
          body { 
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            font-size: 12px;
          }
        }
        body {
          font-family: 'Arial', sans-serif;
          fontSize: 12px;
          margin: 0;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .store-name {
          font-weight: bold;
          font-size: 24px;
          color: #d32f2f;
          margin-bottom: 5px;
        }
        .report-title {
          font-size: 18px;
          font-weight: bold;
          margin: 10px 0;
        }
        .section {
          margin-bottom: 15px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        .section-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #ddd;
        }
        .info-row {
          display: flex;
          margin-bottom: 5px;
        }
        .info-label {
          font-weight: bold;
          min-width: 200px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th {
          background-color: #f2f2f2;
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-weight: bold;
        }
        td {
          border: 1px solid #ddd;
          padding: 6px;
        }
        .total-row {
          font-weight: bold;
          background-color: #f9f9f9;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px dashed #ddd;
          font-size: 10px;
          color: #666;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .payment-method {
          margin-top: 15px;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
          border-bottom: 1px dotted #eee;
        }
        .additional-info {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #eee;
        }
        .discount-row {
          color: #15803d;
          font-weight: bold;
        }
        .void-row {
          color: #dc2626;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-name">K - STREET</div>
        <div>Mc Arthur Highway, Magaspac, Gerona, Tarlac</div>
        <div class="report-title">CASHIER SESSION REPORT</div>
        <div>Generated: ${new Date().toLocaleString("en-PH")}</div>
      </div>
      
      <div class="summary-grid">
        <div class="section">
          <div class="section-title">CASHIER INFORMATION</div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span>${cashierData.user_email}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Login Time:</span>
            <span>${new Date(cashierData.login_time).toLocaleString(
              "en-PH"
            )}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Logout Time:</span>
            <span>${
              cashierData.logout_time
                ? new Date(cashierData.logout_time).toLocaleString("en-PH")
                : "Still Active"
            }</span>
          </div>
          <div class="info-row">
            <span class="info-label">Session Duration:</span>
            <span>${calculateSessionDuration(
              cashierData.login_time,
              cashierData.logout_time
            )}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">SALES SUMMARY</div>
          <div class="info-row">
            <span class="info-label">Starting Gross Sales:</span>
            <span>₱${parseFloat(cashierData.start_gross_sales || 0).toFixed(
              2
            )}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ending Gross Sales:</span>
            <span>₱${parseFloat(cashierData.end_gross_sales || 0).toFixed(
              2
            )}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Sales During Session:</span>
            <span>₱${parseFloat(cashierData.session_sales || 0).toFixed(
              2
            )}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total Transactions:</span>
            <span>${cashierData.session_orders?.length || 0}</span>
          </div>
          
          <!-- ADDED: Total Discount and Total Void Amount -->
          <div class="additional-info">
            <div class="info-row discount-row">
              <span class="info-label">Total Applied Discount:</span>
              <span>₱${totalDiscount.toFixed(2)}</span>
            </div>
            <div class="info-row void-row">
              <span class="info-label">Total Void Amount:</span>
              <span>₱${totalVoidAmount.toFixed(2)} ${
     totalVoidTransactions > 0
       ? `(${totalVoidTransactions} transaction${
           totalVoidTransactions !== 1 ? "s" : ""
         })`
       : ""
   }</span>
            </div>
          </div>
          
          ${
            cashierData.payment_methods_summary &&
            Object.keys(cashierData.payment_methods_summary).length > 0
              ? `
            <div class="payment-method">
              <div class="section-title">PAYMENT METHODS</div>
              ${Object.entries(cashierData.payment_methods_summary)
                .map(
                  ([method, data]) => `
                <div class="payment-row">
                  <span>${method}:</span>
                  <span>${data.transactionCount} transaction${
                    data.transactionCount !== 1 ? "s" : ""
                  } - ₱${data.totalAmount.toFixed(2)}</span>
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }
        </div>
      </div>
      
      ${
        cashierData.session_orders && cashierData.session_orders.length > 0
          ? `
          <div class="section">
            <div class="section-title">ORDERS DURING SESSION (${
              cashierData.session_orders.length
            } transactions)</div>
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Products</th>
                  <th>Total</th>
                  <th>Order Type</th>
                  <th>Payment Method</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                ${cashierData.session_orders
                  .map(
                    (order) => `
                  <tr>
                    <td>#${order.id}</td>
                    <td>${formatProductNames(order)}</td>
                    <td>₱${parseFloat(order.total).toFixed(2)}</td>
                    <td>${order.orderType}</td>
                    <td>${order.payment_method}</td>
                    <td>${new Date(order.created_at).toLocaleTimeString(
                      "en-PH"
                    )}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
          : ""
      }
      
      <div class="footer">
        <div>K-Street POS System</div>
        <div>Printed by: ${user?.name || "Admin"}</div>
        <div>Page 1 of 1</div>
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 100);
          }, 100);
        }
      </script>
    </body>
    </html>
  `);
   printWindow.document.close();
 };

  const saveCashierReportAsPDF = async () => {
    try {
      const cashierData = showCashierDetails;

      // CALCULATE TOTAL DISCOUNT AND TOTAL VOID AMOUNT
      const totalDiscount = cashierData.session_orders
        ? cashierData.session_orders.reduce((sum, order) => {
            if (order.discountApplied) {
              return sum + (parseFloat(order.total) / 0.8) * 0.2;
            }
            return sum;
          }, 0)
        : 0;

      const totalVoidAmount = sales
        .filter(
          (order) =>
            order.userId === cashierData.user_id &&
            isOrderVoided(order) &&
            new Date(order.created_at) >= new Date(cashierData.login_time) &&
            (!cashierData.logout_time ||
              new Date(order.created_at) <= new Date(cashierData.logout_time))
        )
        .reduce((sum, order) => sum + parseFloat(order.total || 0), 0);

      const totalVoidTransactions = sales.filter(
        (order) =>
          order.userId === cashierData.user_id &&
          isOrderVoided(order) &&
          new Date(order.created_at) >= new Date(cashierData.login_time) &&
          (!cashierData.logout_time ||
            new Date(order.created_at) <= new Date(cashierData.logout_time))
      ).length;

      // Create a temporary div with the report content
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "fixed";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "0";
      tempDiv.style.width = "800px";
      tempDiv.style.backgroundColor = "white";
      tempDiv.style.padding = "20px";
      tempDiv.style.fontFamily = "Arial, sans-serif";

      // Build the report HTML (ADD DISCOUNT AND VOID AMOUNT)
      const reportHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; color: #d32f2f; margin-bottom: 5px; font-weight: bold;">K - STREET</h1>
        <p style="font-size: 12px; margin-bottom: 10px;">Mc Arthur Highway, Magaspac, Gerona, Tarlac</p>
        <div style="border-top: 2px dashed #ccc; border-bottom: 2px dashed #ccc; padding: 10px; margin: 10px 0;">
          <h2 style="font-size: 18px; font-weight: bold; margin: 0;">CASHIER SESSION REPORT</h2>
        </div>
        <p style="font-size: 10px; color: #666;">Generated: ${new Date().toLocaleString(
          "en-PH"
        )}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; border: 1px solid #fecaca;">
          <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #000;">CASHIER INFORMATION</h3>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Email:</strong> ${
            cashierData.user_email
          }</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Login Time:</strong> ${new Date(
            cashierData.login_time
          ).toLocaleString("en-PH")}</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Logout Time:</strong> ${
            cashierData.logout_time
              ? new Date(cashierData.logout_time).toLocaleString("en-PH")
              : "Still Active"
          }</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Session Duration:</strong> ${calculateSessionDuration(
            cashierData.login_time,
            cashierData.logout_time
          )}</p>
        </div>

        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; border: 1px solid #bbf7d0;">
          <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #166534;">SALES SUMMARY</h3>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Starting Gross Sales:</strong> ₱${parseFloat(
            cashierData.start_gross_sales || 0
          ).toFixed(2)}</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Ending Gross Sales:</strong> ₱${parseFloat(
            cashierData.end_gross_sales || 0
          ).toFixed(2)}</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Sales During Session:</strong> ₱${parseFloat(
            cashierData.session_sales || 0
          ).toFixed(2)}</p>
          <p style="margin: 5px 0; font-size: 12px;"><strong>Total Transactions:</strong> ${
            cashierData.session_orders?.length || 0
          }</p>
          
          <!-- ADDED: Total Discount and Total Void Amount -->
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #bbf7d0;">
            <div style="display: flex; justify-content: space-between; margin: 3px 0;">
              <span style="font-weight: bold; color: #15803d;">Total Applied Discount:</span>
              <span style="font-weight: bold; color: #15803d;">₱${totalDiscount.toFixed(
                2
              )}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 3px 0;">
              <span style="font-weight: bold; color: #dc2626;">Total Void Amount:</span>
              <span style="font-weight: bold; color: #dc2626;">₱${totalVoidAmount.toFixed(
                2
              )} ${
        totalVoidTransactions > 0
          ? `(${totalVoidTransactions} transaction${
              totalVoidTransactions !== 1 ? "s" : ""
            })`
          : ""
      }</span>
            </div>
          </div>
          
          ${
            cashierData.payment_methods_summary &&
            Object.keys(cashierData.payment_methods_summary).length > 0
              ? `
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #bbf7d0;">
              <h4 style="font-size: 13px; font-weight: bold; margin-bottom: 8px; color: #166534;">PAYMENT METHODS</h4>
              <div style="font-size: 11px;">
                ${Object.entries(cashierData.payment_methods_summary)
                  .map(
                    ([method, data]) => `
                  <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                    <span>${method}:</span>
                    <span>${data.transactionCount} transaction${
                      data.transactionCount !== 1 ? "s" : ""
                    } - ₱${data.totalAmount.toFixed(2)}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }
        </div>
      </div>

      ${
        cashierData.session_orders && cashierData.session_orders.length > 0
          ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #000;">ORDERS DURING SESSION (${
            cashierData.session_orders.length
          } transactions)</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #d1d5db; padding: 6px; text-align: left;">Order ID</th>
                <th style="border: 1px solid #d1d5db; padding: 6px; text-align: left;">Products</th>
                <th style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">Total</th>
                <th style="border: 1px solid #d1d5db; padding: 6px; text-align: left;">Order Type</th>
                <th style="border: 1px solid #d1d5db; padding: 6px; text-align: left;">Payment Method</th>
                <th style="border: 1px solid #d1d5db; padding: 6px; text-align: left;">Time</th>
              </tr>
            </thead>
            <tbody>
              ${cashierData.session_orders
                .map(
                  (order, index) => `
                <tr style="${
                  index % 2 === 0 ? "background-color: #f9fafb;" : ""
                }">
                  <td style="border: 1px solid #d1d5db; padding: 6px;">#${
                    order.id
                  }</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px;">${formatProductNames(
                    order
                  )}</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">₱${parseFloat(
                    order.total
                  ).toFixed(2)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px;">${
                    order.orderType
                  }</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px;">${
                    order.payment_method
                  }</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px;">${new Date(
                    order.created_at
                  ).toLocaleTimeString("en-PH")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
          : ""
      }

      <div style="text-align: center; border-top: 1px dashed #ccc; padding-top: 15px; margin-top: 20px;">
        <p style="font-size: 10px; color: #666; margin: 5px 0;">K-Street POS System</p>
        <p style="font-size: 9px; color: #999; margin: 5px 0;">Exported by: ${
          user?.name || "Admin"
        }</p>
        <p style="font-size: 9px; color: #999; margin: 5px 0;">Page 1 of 1</p>
      </div>
    `;

      tempDiv.innerHTML = reportHTML;
      document.body.appendChild(tempDiv);

      // Generate canvas from the HTML
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Remove temp div
      document.body.removeChild(tempDiv);

      // Create PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

      // Save PDF
      const filename = `K-Street_Cashier_Report_${cashierData.user_email.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

 const exportCashierSessionToExcel = async (cashierData) => {
   try {
     // CALCULATE TOTAL DISCOUNT AND TOTAL VOID AMOUNT
     const totalDiscount = cashierData.session_orders
       ? cashierData.session_orders.reduce((sum, order) => {
           if (order.discountApplied) {
             return sum + (parseFloat(order.total) / 0.8) * 0.2;
           }
           return sum;
         }, 0)
       : 0;

     const totalVoidAmount = sales
       .filter(
         (order) =>
           order.userId === cashierData.user_id &&
           isOrderVoided(order) &&
           new Date(order.created_at) >= new Date(cashierData.login_time) &&
           (!cashierData.logout_time ||
             new Date(order.created_at) <= new Date(cashierData.logout_time))
       )
       .reduce((sum, order) => sum + parseFloat(order.total || 0), 0);

     const totalVoidTransactions = sales.filter(
       (order) =>
         order.userId === cashierData.user_id &&
         isOrderVoided(order) &&
         new Date(order.created_at) >= new Date(cashierData.login_time) &&
         (!cashierData.logout_time ||
           new Date(order.created_at) <= new Date(cashierData.logout_time))
     ).length;

     const workbook = new ExcelJS.Workbook();
     const worksheet = workbook.addWorksheet("Cashier Session Details");

     // Company Header
     worksheet.mergeCells("A1:H1");
     const companyCell = worksheet.getCell("A1");
     companyCell.value = "K - STREET";
     companyCell.alignment = { horizontal: "center", vertical: "middle" };
     companyCell.font = { size: 20, bold: true, color: { argb: "FFFFFFFF" } };
     companyCell.fill = {
       type: "pattern",
       pattern: "solid",
       fgColor: { argb: "FFFF0000" },
     };
     worksheet.getRow(1).height = 35;

     // Report Title
     worksheet.mergeCells("A2:H2");
     const titleCell = worksheet.getCell("A2");
     titleCell.value = "CASHIER SESSION REPORT";
     titleCell.alignment = { horizontal: "center" };
     titleCell.font = { size: 16, bold: true };
     titleCell.fill = {
       type: "pattern",
       pattern: "solid",
       fgColor: { argb: "FFFFEBEE" },
     };

     // Cashier Information
     worksheet.mergeCells("A3:H3");
     worksheet.getCell("A3").value = "CASHIER INFORMATION";
     worksheet.getCell("A3").font = { bold: true, size: 12 };
     worksheet.getCell("A3").fill = {
       type: "pattern",
       pattern: "solid",
       fgColor: { argb: "FFFFCDD2" },
     };

     worksheet.addRow(["Cashier Email:", cashierData.user_email]);
     worksheet.addRow([
       "Login Time:",
       new Date(cashierData.login_time).toLocaleString("en-PH"),
     ]);
     worksheet.addRow([
       "Logout Time:",
       cashierData.logout_time
         ? new Date(cashierData.logout_time).toLocaleString("en-PH")
         : "Still Active",
     ]);
     worksheet.addRow([
       "Session Duration:",
       calculateSessionDuration(
         cashierData.login_time,
         cashierData.logout_time
       ),
     ]);

     // Sales Summary
     worksheet.addRow([]);
     worksheet.mergeCells("A8:H8");
     worksheet.getCell("A8").value = "SALES SUMMARY";
     worksheet.getCell("A8").font = { bold: true, size: 12 };
     worksheet.getCell("A8").fill = {
       type: "pattern",
       pattern: "solid",
       fgColor: { argb: "FFC8E6C9" },
     };

     worksheet.addRow([
       "Starting Gross Sales:",
       `₱${parseFloat(cashierData.start_gross_sales || 0).toFixed(2)}`,
     ]);
     worksheet.addRow([
       "Ending Gross Sales:",
       `₱${parseFloat(cashierData.end_gross_sales || 0).toFixed(2)}`,
     ]);
     worksheet.addRow([
       "Sales During Session:",
       `₱${parseFloat(cashierData.session_sales || 0).toFixed(2)}`,
     ]);
     worksheet.addRow([
       "Total Transactions:",
       cashierData.session_orders?.length || 0,
     ]);

     // ADDED: Total Discount and Total Void Amount
     worksheet.addRow([
       "Total Applied Discount:",
       `₱${totalDiscount.toFixed(2)}`,
     ]);
     worksheet.addRow([
       "Total Void Amount:",
       `₱${totalVoidAmount.toFixed(2)}${
         totalVoidTransactions > 0
           ? ` (${totalVoidTransactions} transaction${
               totalVoidTransactions !== 1 ? "s" : ""
             })`
           : ""
       }`,
     ]);

     // Payment Methods Summary
     if (
       cashierData.payment_methods_summary &&
       Object.keys(cashierData.payment_methods_summary).length > 0
     ) {
      

       // Table Headers for Payment Methods
       const paymentHeaderRow = worksheet.addRow([
         "Payment Method",
         "Transaction Count",
         "Total Amount",
       ]);

       paymentHeaderRow.eachCell((cell) => {
         cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
         cell.fill = {
           type: "pattern",
           pattern: "solid",
           fgColor: { argb: "FF7B1FA2" },
         };
         cell.alignment = { horizontal: "center", vertical: "middle" };
         cell.border = {
           top: { style: "thin", color: { argb: "FF000000" } },
           left: { style: "thin", color: { argb: "FF000000" } },
           bottom: { style: "thin", color: { argb: "FF000000" } },
           right: { style: "thin", color: { argb: "FF000000" } },
         };
       });

       // Data rows for Payment Methods
       const paymentMethods = Object.entries(
         cashierData.payment_methods_summary
       );
       paymentMethods.forEach(([method, data], index) => {
         const row = worksheet.addRow([
           method,
           data.transactionCount,
           data.totalAmount,
         ]);

         row.eachCell((cell, colNumber) => {
           cell.border = {
             top: { style: "thin", color: { argb: "FFE0E0E0" } },
             left: { style: "thin", color: { argb: "FFE0E0E0" } },
             bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
             right: { style: "thin", color: { argb: "FFE0E0E0" } },
           };
           cell.alignment = { vertical: "middle" };

           if (index % 2 === 0) {
             cell.fill = {
               type: "pattern",
               pattern: "solid",
               fgColor: { argb: "FFF8F8F8" },
             };
           }

           if (colNumber === 3) {
             cell.numFmt = "₱#,##0.00";
             cell.alignment = { horizontal: "right", vertical: "middle" };
           }

           if (colNumber === 2) {
             cell.alignment = { horizontal: "center", vertical: "middle" };
           }
         });
       });

       // Column widths for Payment Methods
       worksheet.getColumn(1).width = 25;
       worksheet.getColumn(2).width = 20;
       worksheet.getColumn(3).width = 18;
     }

     // Orders Table
     if (cashierData.session_orders && cashierData.session_orders.length > 0) {
       worksheet.addRow([]);
       const ordersHeaderRow = cashierData.payment_methods_summary
         ? worksheet.rowCount + 1
         : 13;
       worksheet.mergeCells(`A${ordersHeaderRow}:H${ordersHeaderRow}`);
       worksheet.getCell(`A${ordersHeaderRow}`).value = "ORDERS DURING SESSION";
       worksheet.getCell(`A${ordersHeaderRow}`).font = {
         bold: true,
         size: 12,
       };
       worksheet.getCell(`A${ordersHeaderRow}`).fill = {
         type: "pattern",
         pattern: "solid",
         fgColor: { argb: "FFBBDEFB" },
       };

       // Table Headers
       const headerRow = worksheet.addRow([
         "Order ID",
         "Products",
         "Total Amount",
         "Order Type",
         "Payment Method",
         "Transaction Time",
       ]);

       headerRow.eachCell((cell) => {
         cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
         cell.fill = {
           type: "pattern",
           pattern: "solid",
           fgColor: { argb: "FF1976D2" },
         };
         cell.alignment = { horizontal: "center", vertical: "middle" };
         cell.border = {
           top: { style: "thin", color: { argb: "FF000000" } },
           left: { style: "thin", color: { argb: "FF000000" } },
           bottom: { style: "thin", color: { argb: "FF000000" } },
           right: { style: "thin", color: { argb: "FF000000" } },
         };
       });

       // Data rows
       cashierData.session_orders.forEach((order, index) => {
         const row = worksheet.addRow([
           order.id,
           formatProductNames(order),
           parseFloat(order.total),
           order.orderType,
           order.payment_method,
           new Date(order.created_at).toLocaleTimeString("en-PH"),
         ]);

         row.eachCell((cell, colNumber) => {
           cell.border = {
             top: { style: "thin", color: { argb: "FFE0E0E0" } },
             left: { style: "thin", color: { argb: "FFE0E0E0" } },
             bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
             right: { style: "thin", color: { argb: "FFE0E0E0" } },
           };
           cell.alignment = { vertical: "middle" };

           if (index % 2 === 0) {
             cell.fill = {
               type: "pattern",
               pattern: "solid",
               fgColor: { argb: "FFF5F5F5" },
             };
           }

           if (colNumber === 3) {
             cell.numFmt = "₱#,##0.00";
             cell.alignment = { horizontal: "right", vertical: "middle" };
           }

           if (colNumber === 2) {
             cell.alignment = {
               horizontal: "left",
               vertical: "middle",
               wrapText: true,
             };
           }
         });
       });

       // Column widths
       worksheet.getColumn(1).width = 12;
       worksheet.getColumn(2).width = 40;
       worksheet.getColumn(3).width = 15;
       worksheet.getColumn(4).width = 15;
       worksheet.getColumn(5).width = 18;
       worksheet.getColumn(6).width = 18;
     }

     // Footer
     const footerRowNum = worksheet.rowCount + 2;
     worksheet.mergeCells(`A${footerRowNum}:H${footerRowNum}`);
     const footerCell = worksheet.getCell(`A${footerRowNum}`);
     footerCell.value = `Generated: ${new Date().toLocaleString(
       "en-PH"
     )} | Exported by: ${user?.name || "Admin"}`;
     footerCell.font = { italic: true, size: 9, color: { argb: "FF757575" } };
     footerCell.alignment = { horizontal: "center" };

     // Save File
     const buffer = await workbook.xlsx.writeBuffer();
     const filename = `K-Street_Cashier_Session_${cashierData.user_email.replace(
       /[^a-zA-Z0-9]/g,
       "_"
     )}_${new Date().toISOString().split("T")[0]}.xlsx`;
     saveAs(
       new Blob([buffer], {
         type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
       }),
       filename
     );
   } catch (error) {
     console.error("Error exporting to Excel:", error);
     alert("Error exporting to Excel. Please try again.");
   }
 };

const exportToExcel = async () => {
  const filteredData =
    activeReport === "sales" ? getFilteredSales() : getFilteredCashierLogs();

  if (filteredData.length === 0) {
    alert(
      `No ${
        activeReport === "sales" ? "sales" : "cashier"
      } data to export for the selected range.`
    );
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(
    activeReport === "sales" ? "Sales Report" : "Cashier Report"
  );

  // Company Header - MERGE HANGGANG J (10 COLUMNS)
  worksheet.mergeCells("A1:J1");
  const companyCell = worksheet.getCell("A1");
  companyCell.value = "K - STREET";
  companyCell.alignment = { horizontal: "center", vertical: "middle" };
  companyCell.font = { size: 20, bold: true, color: { argb: "FFFFFFFF" } };
  companyCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF0000" },
  };
  worksheet.getRow(1).height = 35;

  // Report Type and Date Range Info - MERGE HANGGANG J
  worksheet.mergeCells("A2:J2");
  const reportTypeCell = worksheet.getCell("A2");
  let rangeText = "All Time";
  if (exportRange === "today") {
    rangeText = `Today - ${new Date().toLocaleDateString()}`;
  } else if (exportRange === "custom") {
    rangeText = `${startDate} to ${endDate}`;
  }
  reportTypeCell.value = `${
    activeReport === "sales" ? "Sales" : "Cashier"
  } Report - Period: ${rangeText}`;
  reportTypeCell.alignment = { horizontal: "center" };
  reportTypeCell.font = { size: 12, italic: true };
  reportTypeCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFEBEE" },
  };

  if (activeReport === "sales") {
    // Sales Report Export Logic
    const totalSales = filteredData.reduce(
      (sum, sale) => sum + parseFloat(sale.total),
      0
    );
    const totalTransactions = filteredData.length;
    const avgTransaction =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Calculate total discount for sales
    const totalDiscount = filteredData.reduce((sum, sale) => {
      if (sale.discountApplied) {
        return sum + (parseFloat(sale.total) / 0.8) * 0.2;
      }
      return sum;
    }, 0);

    // Calculate total void amount for sales
    const totalVoidAmount = filteredData
      .filter(order => isOrderVoided(order))
      .reduce((sum, order) => sum + parseFloat(order.total || 0), 0);

    const totalVoidTransactions = filteredData.filter(order => isOrderVoided(order)).length;

    const transactionDates = [
      ...new Set(
        filteredData.map((sale) =>
          new Date(sale.created_at).toLocaleDateString("en-PH")
        )
      ),
    ].join(", ");

    // =========================================
    // SALES SUMMARY - ILAGAY ANG TOTAL DISCOUNT DITO
    // =========================================
    let summaryRow = 3;
    
    worksheet.mergeCells(`A${summaryRow}:B${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = "SALES SUMMARY";
    worksheet.getCell(`A${summaryRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${summaryRow}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFCDD2" },
    };
    summaryRow++;

    worksheet.mergeCells(`A${summaryRow}:B${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Total Sales: ₱${totalSales.toLocaleString(
      "en-PH",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
    worksheet.getCell(`A${summaryRow}`).font = { bold: true };
    summaryRow++;

    worksheet.mergeCells(`A${summaryRow}:B${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Total Transactions: ${totalTransactions}`;
    summaryRow++;

    worksheet.mergeCells(`A${summaryRow}:B${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Average Transaction: ₱${avgTransaction.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    summaryRow++;

    // =========================================
    // ITO ANG IMPORTANTE - TOTAL APPLIED DISCOUNT
    // =========================================
    worksheet.mergeCells(`A${summaryRow}:B${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Total Applied Discount: ₱${totalDiscount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    worksheet.getCell(`A${summaryRow}`).font = { bold: true, color: { argb: "FF15803D" } };
    summaryRow++;

    // =========================================
    // ITO ANG IMPORTANTE - TOTAL VOID AMOUNT
    // =========================================
    worksheet.mergeCells(`A${summaryRow}:B${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Total Void Amount: ₱${totalVoidAmount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}${totalVoidTransactions > 0 ? ` (${totalVoidTransactions} transaction${totalVoidTransactions !== 1 ? 's' : ''})` : ''}`;
    worksheet.getCell(`A${summaryRow}`).font = { bold: true, color: { argb: "FFDC2626" } };
    summaryRow++;

    worksheet.mergeCells(`A${summaryRow}:B${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Transaction Dates: ${transactionDates}`;
    summaryRow++;

    worksheet.addRow([]); // Empty row

    // Table Headers
    const headerRow = worksheet.addRow([
      "Order ID",
      "Products",
      "Total Amount",
      "Discount Applied",
      "Amount Paid",
      "Change",
      "Cashier",
      "Order Type",
      "Payment Method",
      "Transaction Time",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD32F2F" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    });
    headerRow.height = 25;

    // Data rows for Sales
    filteredData.forEach((sale, index) => {
      const discountAmount = sale.discountApplied ? (parseFloat(sale.total) / 0.8) * 0.2 : 0;
      
      const row = worksheet.addRow([
        sale.id,
        formatProductNames(sale),
        parseFloat(sale.total),
        sale.discountApplied ? `₱${discountAmount.toFixed(2)} (20%)` : "None",
        parseFloat(sale.paidAmount),
        parseFloat(sale.changeAmount),
        sale.cashier || "Unknown",
        sale.orderType,
        sale.payment_method || "Unknown",
        new Date(sale.created_at).toLocaleString("en-PH"),
      ]);

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };

        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEBEE" },
          };
        }

        // Currency formatting
        if ([3, 5, 6].includes(colNumber)) {
          cell.numFmt = "₱#,##0.00";
          cell.alignment = { horizontal: "right", vertical: "middle" };
        }

        if (colNumber === 2) {
          cell.alignment = {
            horizontal: "left",
            vertical: "middle",
            wrapText: true,
          };
        }
      });
    });

    // Column widths
    worksheet.getColumn(1).width = 12;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 18;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 15;
    worksheet.getColumn(7).width = 15;
    worksheet.getColumn(8).width = 15;
    worksheet.getColumn(9).width = 18;
    worksheet.getColumn(10).width = 18;
  } else {
    // ====================================================
    // CASHIER REPORT EXPORT LOGIC
    // ====================================================
    const totalSessions = filteredData.length;
    const totalGrossSales = filteredData.reduce(
      (sum, log) => sum + parseFloat(log.session_sales || 0),
      0
    );

    // ===========================================
    // IMPORTANT: KALKULAHIN ANG TOTAL DISCOUNT AT TOTAL VOID
    // ===========================================
    let totalAppliedDiscount = 0;
    let totalVoidAmount = 0;
    let totalVoidTransactions = 0;

    // Calculate discount and void for each cashier session
    filteredData.forEach(log => {
      // Calculate discount for this session
      if (log.session_orders) {
        const sessionDiscount = log.session_orders.reduce((sum, order) => {
          if (order.discountApplied) {
            // Assuming 20% discount
            return sum + (parseFloat(order.total) / 0.8) * 0.2;
          }
          return sum;
        }, 0);
        totalAppliedDiscount += sessionDiscount;
      }

      // Calculate void for this session
      const sessionVoids = sales.filter(
        (order) =>
          order.userId === log.user_id &&
          isOrderVoided(order) &&
          new Date(order.created_at) >= new Date(log.login_time) &&
          (!log.logout_time ||
            new Date(order.created_at) <= new Date(log.logout_time))
      );
      
      const sessionVoidAmount = sessionVoids.reduce(
        (sum, order) => sum + parseFloat(order.total || 0),
        0
      );
      totalVoidAmount += sessionVoidAmount;
      totalVoidTransactions += sessionVoids.length;
    });

    // =========================================
    // CASHIER SUMMARY - ILAGAY ANG TOTAL DISCOUNT AT VOID DITO
    // =========================================
    let summaryRow = 3;
    
    worksheet.mergeCells(`A${summaryRow}:C${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = "CASHIER SESSION SUMMARY";
    worksheet.getCell(`A${summaryRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${summaryRow}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFCDD2" },
    };
    summaryRow++;

    worksheet.mergeCells(`A${summaryRow}:C${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Total Cashier Sessions: ${totalSessions}`;
    worksheet.getCell(`A${summaryRow}`).font = { bold: true };
    summaryRow++;

    worksheet.mergeCells(`A${summaryRow}:C${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Total Gross Sales: ₱${totalGrossSales.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    summaryRow++;

    // =========================================
    // ITO ANG IMPORTANTE - TOTAL APPLIED DISCOUNT
    // =========================================
    worksheet.mergeCells(`A${summaryRow}:C${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Total Applied Discount: ₱${totalAppliedDiscount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    worksheet.getCell(`A${summaryRow}`).font = { bold: true, color: { argb: "FF15803D" } };
    summaryRow++;

    // =========================================
    // ITO ANG IMPORTANTE - TOTAL VOID AMOUNT
    // =========================================
    worksheet.mergeCells(`A${summaryRow}:C${summaryRow}`);
    worksheet.getCell(`A${summaryRow}`).value = `Total Void Amount: ₱${totalVoidAmount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}${totalVoidTransactions > 0 ? ` (${totalVoidTransactions} transaction${totalVoidTransactions !== 1 ? 's' : ''})` : ''}`;
    worksheet.getCell(`A${summaryRow}`).font = { bold: true, color: { argb: "FFDC2626" } };
    summaryRow++;

    worksheet.addRow([]); // Empty row

    // Table Headers
    const headerRow = worksheet.addRow([
      "Cashier Email",
      "Login Time",
      "Logout Time",
      "Session Duration",
      "Starting Gross Sales",
      "Ending Gross Sales",
      "Sales During Session",
      "Discount & Void Summary",
      "Action",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD32F2F" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    });
    headerRow.height = 25;

    // Data rows
    filteredData.forEach((log, index) => {
      // Calculate discount for this session
      const sessionDiscount = log.session_orders
        ? log.session_orders.reduce((sum, order) => {
            if (order.discountApplied) {
              return sum + (parseFloat(order.total) / 0.8) * 0.2;
            }
            return sum;
          }, 0)
        : 0;

      // Calculate void for this session
      const sessionVoids = sales.filter(
        (order) =>
          order.userId === log.user_id &&
          isOrderVoided(order) &&
          new Date(order.created_at) >= new Date(log.login_time) &&
          (!log.logout_time ||
            new Date(order.created_at) <= new Date(log.logout_time))
      );
      
      const sessionVoidAmount = sessionVoids.reduce(
        (sum, order) => sum + parseFloat(order.total || 0),
        0
      );
      const sessionVoidCount = sessionVoids.length;

      // Create summary text
      const discountVoidText = 
        `Discount: ₱${sessionDiscount.toFixed(2)}\n` +
        `Void: ₱${sessionVoidAmount.toFixed(2)}` +
        (sessionVoidCount > 0 ? ` (${sessionVoidCount})` : '');

      const row = worksheet.addRow([
        log.user_email || "Unknown",
        new Date(log.login_time).toLocaleString("en-PH"),
        log.logout_time
          ? new Date(log.logout_time).toLocaleString("en-PH")
          : "Still Active",
        calculateSessionDuration(log.login_time, log.logout_time),
        parseFloat(log.start_gross_sales || 0),
        parseFloat(log.end_gross_sales || 0),
        parseFloat(log.session_sales || 0),
        discountVoidText,
        "View Details",
      ]);

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };

        // Discount & Void Summary column
        if (colNumber === 8) {
          cell.alignment = {
            vertical: "top",
            wrapText: true,
            horizontal: "left"
          };
          if (sessionDiscount > 0 || sessionVoidAmount > 0) {
            cell.font = { bold: true };
          }
        } else {
          cell.alignment = { vertical: "middle" };
        }

        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEBEE" },
          };
        }

        // Currency columns
        if ([5, 6, 7].includes(colNumber)) {
          cell.numFmt = "₱#,##0.00";
          cell.alignment = { horizontal: "right", vertical: "middle" };
        }

        // Time columns
        if ([2, 3].includes(colNumber)) {
          cell.alignment = {
            horizontal: "left",
            vertical: "middle",
            wrapText: true,
          };
        }
      });
    });

    // Column widths
    worksheet.getColumn(1).width = 25;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 18;
    worksheet.getColumn(5).width = 20;
    worksheet.getColumn(6).width = 20;
    worksheet.getColumn(7).width = 20;
    worksheet.getColumn(8).width = 25;
    worksheet.getColumn(9).width = 15;
  }

  // FOOTER
  const footerRowNum = worksheet.rowCount + 2;
  worksheet.mergeCells(`A${footerRowNum}:J${footerRowNum}`);
  const footerCell = worksheet.getCell(`A${footerRowNum}`);
  footerCell.value = `Generated: ${new Date().toLocaleString(
    "en-PH"
  )} | Exported by: ${user?.name || "Admin"}`;
  footerCell.font = { italic: true, size: 9, color: { argb: "FF757575" } };
  footerCell.alignment = { horizontal: "center" };

  // Save File
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `K-Street-${
    activeReport === "sales" ? "Sales" : "Cashier"
  }_Report_${exportRange}_${new Date().toISOString().split("T")[0]}.xlsx`;
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
};

  // Pagination logic for Sales Report
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  // Filter out voided orders for display
  const nonVoidedSales = sales.filter((order) => !isOrderVoided(order));
  const currentSales = nonVoidedSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(nonVoidedSales.length / itemsPerPage);

  // Pagination logic for Cashier Report
  const cashierIndexOfLastItem = cashierCurrentPage * itemsPerPage;
  const cashierIndexOfFirstItem = cashierIndexOfLastItem - itemsPerPage;
  const currentCashierLogs = getFilteredCashierLogs().slice(
    cashierIndexOfFirstItem,
    cashierIndexOfLastItem
  );
  const cashierTotalPages = Math.ceil(
    getFilteredCashierLogs().length / itemsPerPage
  );

  const handleNextPage = () => {
    if (activeReport === "sales") {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    } else {
      if (cashierCurrentPage < cashierTotalPages) {
        setCashierCurrentPage(cashierCurrentPage + 1);
      }
    }
  };

  const handlePrevPage = () => {
    if (activeReport === "sales") {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } else {
      if (cashierCurrentPage > 1) {
        setCashierCurrentPage(cashierCurrentPage - 1);
      }
    }
  };

  // Handle report navigation
  const handleReportNavigation = (reportType) => {
    setActiveReport(reportType);
    setCurrentPage(1);
    setCashierCurrentPage(1);
  };

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">REPORTS</h1>

        {/* Report Navigation Headers */}
        <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => handleReportNavigation("sales")}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeReport === "sales"
                  ? "bg-red-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              SALES REPORT
            </button>
            <button
              onClick={() => handleReportNavigation("payment-methods")}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeReport === "payment-methods"
                  ? "bg-red-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              CASHIER REPORT
            </button>

            <button
              onClick={() => handleReportNavigation("Void")}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeReport === "Void"
                  ? "bg-red-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              VOID REPORTS
            </button>

            <button
              onClick={() => handleReportNavigation("employees")}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeReport === "employees"
                  ? "bg-red-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              EMPLOYEES REPORT
            </button>
          </div>
        </div>

        {/* Export Options */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-black">Export Options</h3>

          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <select
                value={exportRange}
                onChange={(e) => setExportRange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {exportRange === "custom" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </>
            )}

            <button
              onClick={exportToExcel}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-black font-medium"
            >
              Export to Excel
            </button>
          </div>
        </div>

        {/* Conditional rendering based on active report */}
        {activeReport === "sales" && (
          /* Modern Sales Table */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-red-500 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      #
                    </th>
                    <th className="px-3 py-4 text-left text-sm font-semibold tracking-wide">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Products
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                      Total
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                      Paid
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                      Change
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Cashier
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                      Order Type
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                      Payment Method
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentSales.map((sale, index) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        #{sale.id}
                        {getVoidBadge(sale)}
                      </td>
                      <td className="px-2 py-1 text-sm text-gray-600">
                        {new Date(sale.created_at).toLocaleString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                        <div
                          className="line-clamp-2"
                          title={formatProductNames(sale)}
                        >
                          {formatProductNames(sale)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        ₱{parseFloat(sale.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        ₱{parseFloat(sale.paidAmount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">
                        ₱{parseFloat(sale.changeAmount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {sale.cashier || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-black">
                          {sale.orderType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-black">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex space-x-2 justify-center">
                          <button
                            onClick={() => setShowReceipt(sale)}
                            className="bg-gradient-to-r from-black to-black text-white px-4 py-2 rounded-lg hover:from-black hover:to-black transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
                          >
                            View
                          </button>
                          {!isOrderVoided(sale) && (
                            <button
                              onClick={() => handleVoidOrder(sale)}
                              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {nonVoidedSales.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 font-medium">
                  No sales data available
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Sales will appear here once transactions are made
                </p>
              </div>
            )}

            {/* Pagination */}
            {nonVoidedSales.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, nonVoidedSales.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{nonVoidedSales.length}</span>{" "}
                  results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === totalPages
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-red-500 to-red-500 text-white hover:from-black hover:to-black "
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeReport === "payment-methods" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-red-500 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Cashier Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Login Time
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Logout Time
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                      Session Duration
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                      Starting Gross Sales
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                      Ending Gross Sales
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                      Sales During Session
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                      Total Discount
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                      Total Void
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentCashierLogs.map((log, index) => {
                    // Calculate discount for this log
                    const sessionDiscount = log.session_orders
                      ? log.session_orders.reduce((sum, order) => {
                          if (order.discountApplied) {
                            return sum + (parseFloat(order.total) / 0.8) * 0.2;
                          }
                          return sum;
                        }, 0)
                      : 0;

                    // Calculate void amount for this log
                    const sessionVoidAmount = sales
                      .filter(
                        (order) =>
                          order.userId === log.user_id &&
                          isOrderVoided(order) &&
                          new Date(order.created_at) >=
                            new Date(log.login_time) &&
                          (!log.logout_time ||
                            new Date(order.created_at) <=
                              new Date(log.logout_time))
                      )
                      .reduce(
                        (sum, order) => sum + parseFloat(order.total || 0),
                        0
                      );

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {log.user_email || "Unknown"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(log.login_time).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.logout_time ? (
                            new Date(log.logout_time).toLocaleString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          ) : (
                            <span className="text-orange-500 font-medium">
                              Still Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 text-center">
                          {calculateSessionDuration(
                            log.login_time,
                            log.logout_time
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                          ₱{parseFloat(log.start_gross_sales || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                          ₱{parseFloat(log.end_gross_sales || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right">
                          ₱{parseFloat(log.session_sales || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-blue-600 text-right">
                          ₱{sessionDiscount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-red-600 text-right">
                          ₱{sessionVoidAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex space-x-2 justify-center">
                            <button
                              onClick={() => setShowCashierDetails(log)}
                              className="bg-gradient-to-r from-black to-black text-white px-4 py-2 rounded-lg hover:from-black hover:to-black transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {getFilteredCashierLogs().length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 font-medium">
                  No cashier session data available
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Cashier sessions will appear here once cashiers use the
                  Open/Close POS function
                </p>
              </div>
            )}

            {/* Pagination */}
            {getFilteredCashierLogs().length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {cashierIndexOfFirstItem + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      cashierIndexOfLastItem,
                      getFilteredCashierLogs().length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {getFilteredCashierLogs().length}
                  </span>{" "}
                  results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={cashierCurrentPage === 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      cashierCurrentPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                    Page {cashierCurrentPage} of {cashierTotalPages}
                  </div>
                  <button
                    onClick={handleNextPage}
                    disabled={cashierCurrentPage === cashierTotalPages}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      cashierCurrentPage === cashierTotalPages
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-red-500 to-red-500 text-white hover:from-black hover:to-black "
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeReport === "Void" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-red-500 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Date Voided
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Original Order Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Products
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                      Total Amount
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                      Order Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Original Cashier
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Voided By
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                      Reason
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales
                    .filter((order) => isOrderVoided(order))
                    .sort((a, b) => {
                      const dateA = a.voided_at
                        ? new Date(a.voided_at)
                        : new Date(a.created_at);
                      const dateB = b.voided_at
                        ? new Date(b.voided_at)
                        : new Date(b.created_at);
                      return dateB - dateA;
                    })
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    )
                    .map((order, index) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          #{order.id}
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
                            VOIDED
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {order.voided_at
                            ? new Date(order.voided_at).toLocaleString("en-PH")
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleString("en-PH")}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                          <div
                            className="line-clamp-2"
                            title={formatProductNames(order)}
                          >
                            {formatProductNames(order)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                          ₱{parseFloat(order.total).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-black">
                            {order.orderType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {order.cashier || "Unknown"}
                        </td>
                        {/* VOIDED BY - SHOWS WHO VOIDED IT */}
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">
                              {order.voided_by || "Admin"}
                            </span>
                            {order.voided_by_user?.role && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({order.voided_by_user.role})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="max-w-xs line-clamp-2">
                            {order.void_reason || "Not specified"}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => setShowReceipt(order)}
                            className="bg-gradient-to-r from-black to-black text-white px-4 py-2 rounded-lg hover:from-black hover:to-black transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
                          >
                            View Voided Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {sales.filter((order) => isOrderVoided(order)).length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 font-medium">
                  No voided orders found
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Voided orders will appear here once transactions are voided
                </p>
              </div>
            )}

            {/* Pagination */}
            {sales.filter((order) => isOrderVoided(order)).length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {Math.min(
                      (currentPage - 1) * itemsPerPage + 1,
                      sales.filter((order) => isOrderVoided(order)).length
                    )}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      currentPage * itemsPerPage,
                      sales.filter((order) => isOrderVoided(order)).length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {sales.filter((order) => isOrderVoided(order)).length}
                  </span>{" "}
                  voided orders
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                    Page {currentPage} of{" "}
                    {Math.ceil(
                      sales.filter((order) => isOrderVoided(order)).length /
                        itemsPerPage
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        prev <
                        Math.ceil(
                          sales.filter((order) => isOrderVoided(order)).length /
                            itemsPerPage
                        )
                          ? prev + 1
                          : prev
                      )
                    }
                    disabled={
                      currentPage ===
                      Math.ceil(
                        sales.filter((order) => isOrderVoided(order)).length /
                          itemsPerPage
                      )
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage ===
                      Math.ceil(
                        sales.filter((order) => isOrderVoided(order)).length /
                          itemsPerPage
                      )
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-red-500 to-red-500 text-white hover:from-black hover:to-black"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div
              className={`flex justify-between items-center ${
                isOrderVoided(showReceipt)
                  ? "bg-gradient-to-r from-red-600 to-red-600"
                  : "bg-gradient-to-r from-red-600 to-red-600"
              } text-white p-5 rounded-t-2xl`}
            >
              <h3 className="text-lg font-bold">
                {isOrderVoided(showReceipt)
                  ? "VOIDED RECEIPT"
                  : "Receipt Preview"}
              </h3>
              <button
                onClick={() => setShowReceipt(null)}
                className="text-2xl hover:bg-white hover:bg-opacity-20 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
              >
                ×
              </button>
            </div>

            {/* Receipt Content */}
            <div
              className={`p-8 font-mono text-sm ${
                isOrderVoided(showReceipt) ? "bg-red-50" : "bg-white"
              }`}
              ref={receiptPrintRef}
            >
              {/* Void Stamp */}
              {isOrderVoided(showReceipt) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-6xl font-bold text-red-200 transform -rotate-45">
                    VOIDED
                  </div>
                </div>
              )}

              {/* Header */}
              <div
                className={`text-center mb-4 ${
                  isOrderVoided(showReceipt) ? "relative z-10" : ""
                }`}
              >
                <h1
                  className={`text-2xl font-bold tracking-wider mb-2 ${
                    isOrderVoided(showReceipt) ? "text-red-600" : ""
                  }`}
                >
                  K - Street Mc Arthur Highway, Magaspac, Gerona, Tarlac
                </h1>
                <div className="border-t-2 border-b-2 border-dashed border-gray-800 py-2 my-2">
                  {isOrderVoided(showReceipt) && (
                    <div className="bg-red-100 border border-red-300 p-2 mb-2 rounded">
                      <p className="font-bold text-red-700">
                        VOIDED TRANSACTION
                      </p>
                      <p className="text-sm">
                        Reason: {showReceipt.void_reason || "Not specified"}
                      </p>
                      <p className="text-sm">
                        Voided by: {showReceipt.voided_by || "Admin"}
                      </p>
                      <p className="text-sm">
                        Date:{" "}
                        {new Date(
                          showReceipt.voided_at || showReceipt.created_at
                        ).toLocaleString("en-PH")}
                      </p>
                    </div>
                  )}
                  <p className="text-base">
                    Order Type: {showReceipt.orderType}
                  </p>
                  <p className="text-sm">
                    Cashier: {showReceipt.cashier || "Unknown"}
                  </p>
                  <p className="text-sm">
                    Date:{" "}
                    {new Date(showReceipt.created_at).toLocaleString("en-PH", {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                      hour12: true,
                    })}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div
                className={`mb-4 ${
                  isOrderVoided(showReceipt) ? "relative z-10" : ""
                }`}
              >
                <h2 className="font-bold text-base mb-2">ITEMS:</h2>
                <div className="space-y-2">
                  {getReceiptItems(showReceipt).map((item, index) => (
                    <div key={item.id || index}>
                      <div className="flex justify-between">
                        <span>
                          {item.name} x{item.quantity}
                        </span>
                        <span>
                          P
                          {((item.price || 0) * (item.quantity || 1)).toFixed(
                            2
                          )}
                        </span>
                      </div>
                      {index < getReceiptItems(showReceipt).length - 1 && (
                        <div className="border-b border-dashed border-gray-400 my-1"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-800 pt-2 mb-2"></div>

              {/* Total, Paid, Change */}
              <div
                className={`space-y-2 text-base ${
                  isOrderVoided(showReceipt) ? "relative z-10" : ""
                }`}
              >
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>P{parseFloat(showReceipt.total).toFixed(2)}</span>
                </div>
                {showReceipt.discountApplied && (
                  <div className="flex justify-between">
                    <span>Discount (20%):</span>
                    <span className="text-green-600">Applied</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span>{showReceipt.payment_method || "Cash"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span>P{parseFloat(showReceipt.paidAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span>
                    P{parseFloat(showReceipt.changeAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-800 my-4"></div>

              {/* Footer */}
              <div
                className={`text-center ${
                  isOrderVoided(showReceipt) ? "relative z-10" : ""
                }`}
              >
                <p
                  className={`font-bold text-base ${
                    isOrderVoided(showReceipt) ? "text-red-600" : ""
                  }`}
                >
                  {isOrderVoided(showReceipt)
                    ? "This transaction has been voided"
                    : "Thank you for your order!"}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-5 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={printReceipt}
                className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-black-700 font-medium transition-all duration-200"
              >
                Print Receipt
              </button>
              {!isOrderVoided(showReceipt) && (
                <button
                  onClick={() => handleVoidOrder(showReceipt)}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2.5 rounded-lg hover:from-red-700 hover:to-red-800 font-medium transition-all duration-200"
                >
                  Void Order
                </button>
              )}
              <button
                onClick={() => setShowReceipt(null)}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 font-medium transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    
      {showCashierDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-gradient-to-r from-red-600 to-red-700 text-white p-5 rounded-t-2xl">
              <h3 className="text-lg font-bold">Cashier Session Details</h3>
              <button
                onClick={() => setShowCashierDetails(null)}
                className="text-2xl hover:bg-white hover:bg-opacity-20 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
              >
                ×
              </button>
            </div>

            {/* Cashier Details Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div
                ref={cashierPrintRef}
                className="bg-white p-6 rounded-lg border border-gray-200"
              >
                {/* Header */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-red-600 mb-2">
                    K - STREET
                  </h1>
                  <p className="text-gray-600">
                    Mc Arthur Highway, Magaspac, Gerona, Tarlac
                  </p>
                  <div className="border-t-2 border-b-2 border-dashed border-gray-400 py-3 my-3">
                    <h2 className="text-xl font-bold text-black">
                      CASHIER SESSION REPORT
                    </h2>
                  </div>
                </div>

                {/* Session Information */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-red-100 p-4 rounded-lg">
                    <h3 className="font-bold text-black mb-2">
                      CASHIER INFORMATION
                    </h3>
                    <p>
                      <strong>Email:</strong> {showCashierDetails.user_email}
                    </p>
                    <p>
                      <strong>Login Time:</strong>{" "}
                      {new Date(showCashierDetails.login_time).toLocaleString(
                        "en-PH"
                      )}
                    </p>
                    <p>
                      <strong>Logout Time:</strong>{" "}
                      {showCashierDetails.logout_time
                        ? new Date(
                            showCashierDetails.logout_time
                          ).toLocaleString("en-PH")
                        : "Still Active"}
                    </p>
                    <p>
                      <strong>Session Duration:</strong>{" "}
                      {calculateSessionDuration(
                        showCashierDetails.login_time,
                        showCashierDetails.logout_time
                      )}
                    </p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-bold text-green-800 mb-2">
                      SALES SUMMARY
                    </h3>
                    <p>
                      <strong>Starting Gross Sales:</strong> ₱
                      {parseFloat(
                        showCashierDetails.start_gross_sales || 0
                      ).toFixed(2)}
                    </p>
                    <p>
                      <strong>Ending Gross Sales:</strong> ₱
                      {parseFloat(
                        showCashierDetails.end_gross_sales || 0
                      ).toFixed(2)}
                    </p>
                    <p>
                      <strong>Sales During Session:</strong> ₱
                      {parseFloat(
                        showCashierDetails.session_sales || 0
                      ).toFixed(2)}
                    </p>
                    <p>
                      <strong>Total Transactions:</strong>{" "}
                      {showCashierDetails.session_orders?.length || 0}
                    </p>

                    {/* CALCULATE TOTAL DISCOUNT AND TOTAL VOID AMOUNT */}
                    {(() => {
                      // Calculate total discount
                      const totalDiscount = showCashierDetails.session_orders
                        ? showCashierDetails.session_orders.reduce(
                            (sum, order) => {
                              if (order.discountApplied) {
                                // Assuming 20% discount
                                return (
                                  sum + (parseFloat(order.total) / 0.8) * 0.2
                                );
                              }
                              return sum;
                            },
                            0
                          )
                        : 0;

                      // Calculate total void amount
                      const totalVoidAmount = sales
                        .filter(
                          (order) =>
                            order.userId === showCashierDetails.user_id &&
                            isOrderVoided(order) &&
                            new Date(order.created_at) >=
                              new Date(showCashierDetails.login_time) &&
                            (!showCashierDetails.logout_time ||
                              new Date(order.created_at) <=
                                new Date(showCashierDetails.logout_time))
                        )
                        .reduce(
                          (sum, order) => sum + parseFloat(order.total || 0),
                          0
                        );

                      // Calculate total number of voided transactions
                      const totalVoidTransactions = sales.filter(
                        (order) =>
                          order.userId === showCashierDetails.user_id &&
                          isOrderVoided(order) &&
                          new Date(order.created_at) >=
                            new Date(showCashierDetails.login_time) &&
                          (!showCashierDetails.logout_time ||
                            new Date(order.created_at) <=
                              new Date(showCashierDetails.logout_time))
                      ).length;

                      return (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          {/* Total Discount */}
                          <div className="flex justify-between">
                            <span className="font-medium text-green-800">
                              Total Applied Discount:
                            </span>
                            <span className="font-bold text-green-700">
                              ₱{totalDiscount.toFixed(2)}
                            </span>
                          </div>

                          {/* Total Void Amount */}
                          <div className="flex justify-between mt-1">
                            <span className="font-medium text-red-700">
                              Total Void Amount:
                            </span>
                            <span className="font-bold text-red-700">
                              ₱{totalVoidAmount.toFixed(2)}
                              {totalVoidTransactions > 0 && (
                                <span className="text-xs text-red-600 ml-1">
                                  ({totalVoidTransactions} transaction
                                  {totalVoidTransactions !== 1 ? "s" : ""})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Payment Methods Summary */}
                    {showCashierDetails.payment_methods_summary &&
                      Object.keys(showCashierDetails.payment_methods_summary)
                        .length > 0 && (
                        <div className="mt-4 pt-3 border-t border-green-200">
                          <h4 className="font-bold text-green-800 mb-2">
                            PAYMENT METHODS
                          </h4>
                          <div className="space-y-1">
                            {Object.entries(
                              showCashierDetails.payment_methods_summary
                            ).map(([method, data]) => (
                              <div
                                key={method}
                                className="flex justify-between"
                              >
                                <span>{method}:</span>
                                <div className="text-right">
                                  <span className="font-medium">
                                    {data.transactionCount} transaction
                                    {data.transactionCount !== 1 ? "s" : ""}
                                  </span>
                                  <span className="ml-2 font-bold">
                                    ₱{data.totalAmount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Orders Table */}
                {showCashierDetails.session_orders &&
                  showCashierDetails.session_orders.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-gray-800 mb-3 text-lg">
                        ORDERS DURING SESSION (
                        {showCashierDetails.session_orders.length} transactions)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 px-3 py-2 text-left">
                                Order ID
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left">
                                Products
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-right">
                                Total
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left">
                                Order Type
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left">
                                Payment Method
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left">
                                Time
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {showCashierDetails.session_orders.map((order) => (
                              <tr key={order.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-2">
                                  #{order.id}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {formatProductNames(order)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                  ₱{parseFloat(order.total).toFixed(2)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {order.orderType}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {order.payment_method}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {new Date(
                                    order.created_at
                                  ).toLocaleTimeString("en-PH")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Footer */}
                <div className="text-center border-t-2 border-dashed border-gray-400 pt-4">
                  <p className="text-gray-600 font-semibold">
                    Report Generated: {new Date().toLocaleString("en-PH")}
                  </p>
                  <p className="text-gray-500 text-sm">K-Street POS System</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-5 flex justify-end gap-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={saveCashierReportAsPDF}
                className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 font-medium transition-all duration-200 flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                Save as PDF
              </button>
              <button
                onClick={() => exportCashierSessionToExcel(showCashierDetails)}
                className="bg-green-800 text-white px-6 py-2.5 rounded-lg hover:bg-green-900 font-medium transition-all duration-200 flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export to Excel
              </button>
              <button
                onClick={printCashierReport}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-all duration-200 flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Report
              </button>
              <button
                onClick={() => setShowCashierDetails(null)}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 font-medium transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Void Confirmation Modal */}
      {showVoidModal && orderToVoid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-gradient-to-r from-red-600 to-red-600 text-white p-5 rounded-t-2xl">
              <h3 className="text-lg font-bold">Confirm Order Void</h3>
              <button
                onClick={() => {
                  setShowVoidModal(false);
                  setOrderToVoid(null);
                  setVoidReason("");
                }}
                className="text-2xl hover:bg-white hover:bg-opacity-20 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
                disabled={isVoiding}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-2">
                  <svg
                    className="w-6 h-6 text-red-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <span className="font-bold text-red-800">
                    Warning: This action cannot be undone!
                  </span>
                </div>
                <p className="text-red-700 text-sm">
                  Order #{orderToVoid.id} for ₱
                  {parseFloat(orderToVoid.total).toFixed(2)} will be marked as
                  voided and removed from sales calculations.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for voiding this order: *
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Enter reason (e.g., customer cancellation, incorrect order, payment issue...)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows="3"
                  disabled={isVoiding}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required. Please provide a clear reason for voiding this
                  transaction.
                </p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">
                  Order Details:
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Order ID:</span>
                      <span className="font-medium ml-2">
                        #{orderToVoid.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <span className="font-medium ml-2">
                        ₱{parseFloat(orderToVoid.total).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Cashier:</span>
                      <span className="font-medium ml-2">
                        {orderToVoid.cashier || "Unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Payment:</span>
                      <span className="font-medium ml-2">
                        {orderToVoid.payment_method}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Date:</span>
                      <span className="font-medium ml-2">
                        {new Date(orderToVoid.created_at).toLocaleString(
                          "en-PH"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-5 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowVoidModal(false);
                  setOrderToVoid(null);
                  setVoidReason("");
                }}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 font-medium transition-all duration-200"
                disabled={isVoiding}
              >
                Cancel
              </button>
              <button
                onClick={confirmVoidOrder}
                disabled={isVoiding || !voidReason.trim()}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  isVoiding || !voidReason.trim()
                    ? "bg-red-400 cursor-not-allowed text-white"
                    : "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800"
                }`}
              >
                {isVoiding ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Voiding...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Confirm Void
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-gradient-to-r from-green-500 to-green-600 text-white p-5 rounded-t-2xl">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Success!
              </h3>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-2xl hover:bg-white hover:bg-opacity-20 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">
                  Order Successfully Voided
                </h4>
                <p className="text-gray-600 mb-6">{successMessage}</p>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="text-sm text-gray-700">
                    <p className="mb-1">
                      <span className="font-semibold">Note:</span> The voided
                      order has been:
                    </p>
                    <ul className="list-disc pl-5 text-left mt-2">
                      <li>Marked with a "VOIDED" badge</li>
                      <li>Removed from active sales calculations</li>
                      <li>Stored with void reason for audit trail</li>
                      <li>Still visible in reports for reference</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-5 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2.5 rounded-lg hover:from-green-600 hover:to-green-700 font-medium transition-all duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
