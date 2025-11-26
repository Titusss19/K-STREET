import React, { useState, useEffect } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const Sales = ({ user }) => {
  const [sales, setSales] = useState([]);
  const [showReceipt, setShowReceipt] = useState(null);
  const [exportRange, setExportRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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

  // Format product names for display
  const formatProductNames = (sale) => {
    if (sale.productNames && sale.productNames !== "No items") {
      return sale.productNames;
    }

    // Fallback: if items JSON exists, extract names from there
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

  // Get items for receipt display - FIXED FUNCTION
  const getReceiptItems = (sale) => {
    // Try to parse items from JSON
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

    // Fallback: create items from productNames
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

    // Final fallback: single item with total
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
  // Export to Excel
  const exportToExcel = async () => {
    const filteredSales = getFilteredSales();

    if (filteredSales.length === 0) {
      alert("No sales data to export for the selected range.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    // Company Header
    worksheet.mergeCells("A1:I1");
    const companyCell = worksheet.getCell("A1");
    companyCell.value = "K - STREET";
    companyCell.alignment = { horizontal: "center", vertical: "middle" };
    companyCell.font = { size: 20, bold: true, color: { argb: "FFFFFFFF" } };
    companyCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF0000" }, // RED
    };
    worksheet.getRow(1).height = 35;

    // Date Range Info
    worksheet.mergeCells("A2:I2");
    const dateRangeCell = worksheet.getCell("A2");
    let rangeText = "All Time";
    if (exportRange === "today") {
      rangeText = `Today - ${new Date().toLocaleDateString()}`;
    } else if (exportRange === "custom") {
      rangeText = `${startDate} to ${endDate}`;
    }
    dateRangeCell.value = `Period: ${rangeText}`;
    dateRangeCell.alignment = { horizontal: "center" };
    dateRangeCell.font = { size: 12, italic: true };
    dateRangeCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFEBEE" }, // RED TINT
    };

    // Summary Section
    const totalSales = filteredSales.reduce(
      (sum, sale) => sum + parseFloat(sale.total),
      0
    );
    const totalTransactions = filteredSales.length;
    const avgTransaction =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Only transaction dates in summary
    const transactionDates = [
      ...new Set(
        filteredSales.map((sale) =>
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
      fgColor: { argb: "FFFFCDD2" }, // RED TINT
    };

    worksheet.mergeCells("A4:B4");
    worksheet.getCell("A4").value = `Total Sales: ₱${totalSales.toLocaleString(
      "en-PH",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}`;
    worksheet.getCell("A4").font = { bold: true };

    worksheet.mergeCells("A5:B5");
    worksheet.getCell("A5").value = `Total Transactions: ${totalTransactions}`;

    worksheet.mergeCells("A6:B6");
    worksheet.getCell(
      "A6"
    ).value = `Average Transaction: ₱${avgTransaction.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    worksheet.mergeCells("A7:B7");
    worksheet.getCell("A7").value = `Transaction Dates: ${transactionDates}`;

    // Add spacing
    worksheet.addRow([]);

    // Table Headers - Added Payment Method column beside Order Type
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
        fgColor: { argb: "FFD32F2F" }, // RED
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

    // Data rows with alternating colors - Added Payment Method column
    filteredSales.forEach((sale, index) => {
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

        // Alternating row colors
        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEBEE" }, // RED TINT
          };
        }

        // Format currency columns
        if ([3, 4, 5].includes(colNumber)) {
          cell.numFmt = "₱#,##0.00";
          cell.alignment = { horizontal: "right", vertical: "middle" };
        }

        // Wrap text for products column
        if (colNumber === 2) {
          cell.alignment = {
            horizontal: "left",
            vertical: "middle",
            wrapText: true,
          };
        }
      });
    });

    // Column widths - Added width for Payment Method column
    worksheet.getColumn(1).width = 12;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 15;
    worksheet.getColumn(7).width = 15;
    worksheet.getColumn(8).width = 18;
    worksheet.getColumn(9).width = 18;

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
    const filename = `K-Street-Sales_Report_${exportRange}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = sales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sales.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="p-6  min-h-screen">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">SALES REPORT</h1>

        {/* Export Options */}
        <div className="mb-1 p-4">
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

        {/* Modern Sales Table - UPDATED: Added Products column */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-red-500 text-white">
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
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
                    <td className="px-6 py-4 text-sm text-gray-600">
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
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setShowReceipt(sale)}
                        className="bg-gradient-to-r from-black to-black text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-600 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                      >
                        View Receipt
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
      </div>

      {/* Thermal Receipt Modal - FIXED */}
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

            {/* Receipt Content - FIXED */}
            <div className="p-8 font-mono text-sm bg-white print:p-0">
              {/* Header */}
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold tracking-wider mb-2">
                  FOOD HUB RECEIPT
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

              {/* Items - FIXED: Using getReceiptItems function */}
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

              {/* Subtotal & Tax */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>
                    P{(parseFloat(showReceipt.total) * 0.893).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (12%):</span>
                  <span>
                    P{(parseFloat(showReceipt.total) * 0.107).toFixed(2)}
                  </span>
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
