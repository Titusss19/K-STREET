import React, { useState, useEffect } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";

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

  // Fetch orders from backend
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await axios.get("http://localhost:3002/orders");
        setSales(res.data);
      } catch (err) {
        console.error("Error fetching sales:", err);
      }
    };
    fetchSales();
  }, []);

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
            order.userId === log.user_id
          );
        });

        const totalSales = sessionSales.reduce(
          (sum, order) => sum + parseFloat(order.total || 0),
          0
        );

        // Calculate starting gross sales (sales before login)
        const salesBeforeLogin = sales.filter((order) => {
          const orderTime = new Date(order.created_at);
          return orderTime < loginTime;
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

  // Get items for receipt display
  const getReceiptItems = (sale) => {
    if (sale.items && sale.items !== "[]") {
      try {
        const items = JSON.parse(sale.items);
        if (Array.isArray(items) && items.length > 0) {
          return items;
        }
      } catch (error) {
        console.error("Error parsing items for receipt:", error);
      }
    }

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

    return [
      {
        id: 1,
        name: `Order #${sale.id}`,
        quantity: 1,
        price: parseFloat(sale.total),
        subtotal: parseFloat(sale.total),
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

  // Download as PNG function - FIXED for Tailwind CSS compatibility
  const downloadAsPNG = async (elementId, filename) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        alert("Element not found for PNG export");
        return;
      }

      // Create a simplified version for PNG export without Tailwind classes
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "800px";
      tempContainer.style.backgroundColor = "white";
      tempContainer.style.padding = "20px";
      tempContainer.style.fontFamily = "Arial, sans-serif";

      // Clone and simplify the content
      const clone = element.cloneNode(true);

      // Remove problematic Tailwind classes and replace with inline styles
      const elementsWithGradient = clone.querySelectorAll(
        '[class*="gradient"]'
      );
      elementsWithGradient.forEach((el) => {
        if (el.classList.toString().includes("gradient")) {
          el.style.background = "#dc2626"; // red color instead of gradient
          el.style.color = "white";
        }
      });

      // Replace bg colors with simple colors
      const bgRedElements = clone.querySelectorAll('[class*="bg-red"]');
      bgRedElements.forEach((el) => {
        el.style.background = "#fecaca"; // light red
      });

      const bgGreenElements = clone.querySelectorAll('[class*="bg-green"]');
      bgGreenElements.forEach((el) => {
        el.style.background = "#bbf7d0"; // light green
      });

      const bgBlueElements = clone.querySelectorAll('[class*="bg-blue"]');
      bgBlueElements.forEach((el) => {
        el.style.background = "#bfdbfe"; // light blue
      });

      const bgGrayElements = clone.querySelectorAll('[class*="bg-gray"]');
      bgGrayElements.forEach((el) => {
        el.style.background = "#f3f4f6"; // light gray
      });

      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        removeContainer: true,
      });

      document.body.removeChild(tempContainer);

      const link = document.createElement("a");
      link.download = `${filename.replace(/[^a-zA-Z0-9]/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error generating PNG:", error);

      // Fallback: Try with simpler approach
      try {
        const element = document.getElementById(elementId);
        const canvas = await html2canvas(element, {
          scale: 1,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          ignoreElements: (element) => {
            // Ignore elements with problematic classes
            const classList = element.classList?.toString() || "";
            return (
              classList.includes("gradient") ||
              classList.includes("oklch") ||
              classList.includes("from-") ||
              classList.includes("to-")
            );
          },
        });

        const link = document.createElement("a");
        link.download = `${filename.replace(/[^a-zA-Z0-9]/g, "_")}_${
          new Date().toISOString().split("T")[0]
        }.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (fallbackError) {
        console.error("Fallback PNG generation also failed:", fallbackError);
        alert(
          "Error generating PNG file. Please try the Excel export instead."
        );
      }
    }
  };

  // Export Cashier Session to Excel
  const exportCashierSessionToExcel = async (cashierData) => {
    try {
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

      // Payment Methods Summary (kasama sa Sales Summary)
      if (
        cashierData.payment_methods_summary &&
        Object.keys(cashierData.payment_methods_summary).length > 0
      ) {
        worksheet.addRow([]);
        worksheet.mergeCells("A13:H13");
        worksheet.getCell("A13").value = "PAYMENT METHODS";
        worksheet.getCell("A13").font = { bold: true, size: 12 };
        worksheet.getCell("A13").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3E5F5" },
        };

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
        worksheet.getCell(`A${ordersHeaderRow}`).value =
          "ORDERS DURING SESSION";
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

  // Export to Excel for Sales Report
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

    // Company Header
    worksheet.mergeCells("A1:I1");
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

    // Report Type and Date Range Info
    worksheet.mergeCells("A2:I2");
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

      const transactionDates = [
        ...new Set(
          filteredData.map((sale) =>
            new Date(sale.created_at).toLocaleDateString("en-PH")
          )
        ),
      ].join(", ");

      worksheet.mergeCells("A3:B3");
      worksheet.getCell("A3").value = "SUMMARY";
      worksheet.getCell("A3").font = { bold: true, size: 12 };
      worksheet.getCell("A3").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFCDD2" },
      };

      worksheet.mergeCells("A4:B4");
      worksheet.getCell(
        "A4"
      ).value = `Total Sales: ₱${totalSales.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      worksheet.getCell("A4").font = { bold: true };

      worksheet.mergeCells("A5:B5");
      worksheet.getCell(
        "A5"
      ).value = `Total Transactions: ${totalTransactions}`;

      worksheet.mergeCells("A6:B6");
      worksheet.getCell(
        "A6"
      ).value = `Average Transaction: ₱${avgTransaction.toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;

      worksheet.mergeCells("A7:B7");
      worksheet.getCell("A7").value = `Transaction Dates: ${transactionDates}`;

      worksheet.addRow([]);

      // Table Headers for Sales
      const headerRow = worksheet.addRow([
        "Order ID",
        "Products",
        "Total Amount",
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
        const row = worksheet.addRow([
          sale.id,
          formatProductNames(sale),
          parseFloat(sale.total),
          parseFloat(sale.paidAmount),
          parseFloat(sale.changeAmount),
          sale.cashier || "Unknown",
          sale.orderType,
          sale.payment_method || "Unknown",
          new Date(sale.created_at).toLocaleTimeString("en-PH"),
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
              fgColor: { argb: "FFFFEBEE" },
            };
          }

          if ([3, 4, 5].includes(colNumber)) {
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

      // Column widths for Sales
      worksheet.getColumn(1).width = 12;
      worksheet.getColumn(2).width = 30;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 15;
      worksheet.getColumn(5).width = 15;
      worksheet.getColumn(6).width = 15;
      worksheet.getColumn(7).width = 15;
      worksheet.getColumn(8).width = 18;
      worksheet.getColumn(9).width = 18;
    } else {
      // Cashier Report Export Logic
      const totalSessions = filteredData.length;
      const totalGrossSales = filteredData.reduce(
        (sum, log) => sum + parseFloat(log.session_sales || 0),
        0
      );

      worksheet.mergeCells("A3:B3");
      worksheet.getCell("A3").value = "SUMMARY";
      worksheet.getCell("A3").font = { bold: true, size: 12 };
      worksheet.getCell("A3").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFCDD2" },
      };

      worksheet.mergeCells("A4:B4");
      worksheet.getCell(
        "A4"
      ).value = `Total Cashier Sessions: ${totalSessions}`;
      worksheet.getCell("A4").font = { bold: true };

      worksheet.mergeCells("A5:B5");
      worksheet.getCell(
        "A5"
      ).value = `Total Gross Sales: ₱${totalGrossSales.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      worksheet.addRow([]);

      // Table Headers for Cashier Report
      const headerRow = worksheet.addRow([
        "Cashier Email",
        "Login Time",
        "Logout Time",
        "Session Duration",
        "Starting Gross Sales",
        "Ending Gross Sales",
        "Sales During Session",
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

      // Data rows for Cashier Report
      filteredData.forEach((log, index) => {
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
          "View Details",
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
              fgColor: { argb: "FFFFEBEE" },
            };
          }

          if ([5, 6, 7].includes(colNumber)) {
            cell.numFmt = "₱#,##0.00";
            cell.alignment = { horizontal: "right", vertical: "middle" };
          }

          if ([2, 3].includes(colNumber)) {
            cell.alignment = {
              horizontal: "left",
              vertical: "middle",
              wrapText: true,
            };
          }
        });
      });

      // Column widths for Cashier Report
      worksheet.getColumn(1).width = 25;
      worksheet.getColumn(2).width = 20;
      worksheet.getColumn(3).width = 20;
      worksheet.getColumn(4).width = 18;
      worksheet.getColumn(5).width = 20;
      worksheet.getColumn(6).width = 20;
      worksheet.getColumn(7).width = 20;
      worksheet.getColumn(8).width = 15;
    }

    // Footer
    const footerRowNum = worksheet.rowCount + 2;
    worksheet.mergeCells(`A${footerRowNum}:I${footerRowNum}`);
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

  const printReceipt = () => {
    window.print();
  };

  // Pagination logic for Sales Report
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = sales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sales.length / itemsPerPage);

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
              onClick={() => handleReportNavigation("products")}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeReport === "products"
                  ? "bg-red-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              PRODUCTS
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
            <button
              onClick={() => handleReportNavigation("time-period")}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeReport === "time-period"
                  ? "bg-red-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              TIME PERIOD
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
                        <button
                          onClick={() => setShowReceipt(sale)}
                          className="bg-gradient-to-r from-black to-black text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-600 transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {sales.length === 0 && (
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
            {sales.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, sales.length)}
                  </span>{" "}
                  of <span className="font-medium">{sales.length}</span> results
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

        {/* Cashier Report Table */}
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
                    <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentCashierLogs.map((log, index) => (
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
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => setShowCashierDetails(log)}
                          className="bg-gradient-to-r from-black to-black text-white px-4 py-2 rounded-lg hover:from-black hover:to-black transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
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

        {/* Placeholder for other reports */}
        {activeReport !== "sales" && activeReport !== "payment-methods" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              {activeReport.replace("-", " ").toUpperCase()} REPORT
            </h3>
            <p className="text-gray-500 mb-4">
              This report is currently under development
            </p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Available Data:</strong> You can implement different
                data views here based on the selected report type.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Thermal Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:bg-white">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full print:shadow-none print:max-w-full">
            {/* Modal Header - Hidden on Print */}
            <div className="flex justify-between items-center bg-gradient-to-r from-red-600 to-red-600 text-white p-5 rounded-t-2xl print:hidden">
              <h3 className="text-lg font-bold">Receipt Preview</h3>
              <button
                onClick={() => setShowReceipt(null)}
                className="text-2xl hover:bg-white hover:bg-opacity-20 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
              >
                ×
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-8 font-mono text-sm bg-white print:p-0">
              {/* Header */}
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold tracking-wider mb-2">
                  K - Street Mc Arthur Highway, Magaspac, Gerona, Tarlac
                </h1>
                <div className="border-t-2 border-b-2 border-dashed border-gray-800 py-2 my-2">
                  <p className="text-base">
                    Order Type: {showReceipt.orderType}
                  </p>
                  <p className="text-sm">
                    Date:{" "}
                    {new Date(showReceipt.created_at).toLocaleString("en-US", {
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
              <div className="mb-4">
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
              <div className="space-y-2 text-base">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>P{parseFloat(showReceipt.total).toFixed(2)}</span>
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
              <div className="text-center">
                <p className="font-bold text-base">Thank you for your order!</p>
              </div>
            </div>

            {/* Action Buttons - Hidden on Print */}
            <div className="p-5 flex justify-end gap-3 print:hidden border-t border-gray-100">
              <button
                onClick={printReceipt}
                className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-black-700 font-medium transition-all duration-200"
              >
                Print Receipt
              </button>
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

      {/* Cashier Details Modal */}
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
                id="cashier-details-content"
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
                      Cashier Information
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
                      Sales Summary
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

                    {/* Payment Methods Summary */}
                    {showCashierDetails.payment_methods_summary &&
                      Object.keys(showCashierDetails.payment_methods_summary)
                        .length > 0 && (
                        <>
                          <div className="mt-4 pt-3 border-t border-green-200">
                            <h4 className="font-bold text-green-800 mb-2">
                              Payment Methods:
                            </h4>
                            <div className="space-y-1">
                              {Object.entries(
                                showCashierDetails.payment_methods_summary
                              ).map(([method, data]) => (
                                <div
                                  key={method}
                                  className="flex justify-between"
                                >
                                  <span className="text-sm">{method}:</span>
                                  <div className="text-right">
                                    <span className="text-sm font-medium">
                                      {data.transactionCount} transaction
                                      {data.transactionCount !== 1 ? "s" : ""}
                                    </span>
                                    <span className="ml-2 text-sm font-bold">
                                      ₱{data.totalAmount.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                  </div>
                </div>

                {/* Orders Table */}
                {showCashierDetails.session_orders &&
                  showCashierDetails.session_orders.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-gray-800 mb-3 text-lg">
                        Orders During Session (
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
                                  <div
                                    className="line-clamp-1"
                                    title={formatProductNames(order)}
                                  >
                                    {formatProductNames(order)}
                                  </div>
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                  ₱{parseFloat(order.total).toFixed(2)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {order.orderType}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {order.payment_method}
                                  </span>
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
                onClick={() => exportCashierSessionToExcel(showCashierDetails)}
                className="bg-green-800 text-white px-6 py-2.5 rounded-lg hover:bg-green-900 font-medium transition-all duration-200 flex items-center gap-2"
              >
                <span></span> Export to Excel
              </button>
              <button
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-all duration-200 flex items-center gap-2"
              >
                <span></span> Print
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

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0 * {
            visibility: visible;
          }
          .fixed.inset-0 {
            position: static;
            background: white;
          }
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Sales;
