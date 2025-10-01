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
    worksheet.mergeCells("A1:G1");
    const companyCell = worksheet.getCell("A1");
    companyCell.value = "FOODHUB SALES REPORT";
    companyCell.alignment = { horizontal: "center", vertical: "middle" };
    companyCell.font = { size: 20, bold: true, color: { argb: "FFFFFFFF" } };
    companyCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B5E20" },
    };
    worksheet.getRow(1).height = 35;

    // Date Range Info
    worksheet.mergeCells("A2:G2");
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
      fgColor: { argb: "FFE8F5E9" },
    };

    // Summary Section
    const totalSales = filteredSales.reduce(
      (sum, sale) => sum + parseFloat(sale.total),
      0
    );
    const totalTransactions = filteredSales.length;
    const avgTransaction =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;

    worksheet.mergeCells("A3:B3");
    worksheet.getCell("A3").value = "SUMMARY";
    worksheet.getCell("A3").font = { bold: true, size: 12 };
    worksheet.getCell("A3").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF81C784" },
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

    // Add spacing
    worksheet.addRow([]);

    // Table Headers
    const headerRow = worksheet.addRow([
      "Order ID",
      "Total Amount",
      "Amount Paid",
      "Change",
      "Cashier",
      "Order Type",
      "Transaction Time",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E7D32" },
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

    // Data rows with alternating colors
    filteredSales.forEach((sale, index) => {
      const row = worksheet.addRow([
        sale.id,
        parseFloat(sale.total),
        parseFloat(sale.paidAmount),
        parseFloat(sale.changeAmount),
        sale.cashier || "Unknown",
        sale.orderType,
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
            fgColor: { argb: "FFF1F8E9" },
          };
        }

        // Format currency columns
        if ([3, 4, 5].includes(colNumber)) {
          cell.numFmt = "₱#,##0.00";
          cell.alignment = { horizontal: "right", vertical: "middle" };
        }
      });
    });

    // Column widths
    worksheet.getColumn(1).width = 12;
    worksheet.getColumn(2).width = 22;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 18;
    worksheet.getColumn(7).width = 15;
    worksheet.getColumn(8).width = 18;

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
    const filename = `Sales_Report_${exportRange}_${
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

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Sales Report</h1>

        {/* Export Options */}
        <div className="mb-1 p-4 ">
          <h3 className="font-semibold mb-3 text-green-800">Export Options</h3>

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
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
          Export to Excel
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-green-600 text-white">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Total</th>
                <th className="px-4 py-2 text-left">Paid</th>
                <th className="px-4 py-2 text-left">Change</th>
                <th className="px-4 py-2 text-left">Cashier</th>
                <th className="px-4 py-2 text-left">Order Type</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{sale.id}</td>
                  <td className="px-4 py-2">
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">₱{sale.total}</td>
                  <td className="px-4 py-2">₱{sale.paidAmount}</td>
                  <td className="px-4 py-2">₱{sale.changeAmount}</td>
                  <td className="px-4 py-2">{sale.cashier || "Unknown"}</td>
                  <td className="px-4 py-2">{sale.orderType}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => setShowReceipt(sale)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 flex items-center justify-center  print:bg-white">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full print:shadow-none print:max-w-full">
            {/* Modal Header - Hidden on Print */}
            <div className="flex justify-between items-center bg-green-600 text-white p-4 rounded-t-lg print:hidden">
              <h3 className="text-lg font-bold">Receipt Preview</h3>
              <button
                onClick={() => setShowReceipt(null)}
                className="text-2xl hover:text-gray-200 font-bold"
              >
                ×
              </button>
            </div>

            {/* Receipt Content */}
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

              {/* Items */}
              <div className="mb-4">
                <h2 className="font-bold text-base mb-2">ITEMS:</h2>
                <div className="space-y-2">
                  {showReceipt.items && showReceipt.items.length > 0 ? (
                    showReceipt.items.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between">
                          <span>
                            {item.name} x{item.quantity}
                          </span>
                          <span>
                            P{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        {index < showReceipt.items.length - 1 && (
                          <div className="border-b border-dashed border-gray-400 my-1"></div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span>Order #{showReceipt.id}</span>
                      <span>P{parseFloat(showReceipt.total).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-800 pt-2 mb-2"></div>

              {/* Subtotal & Tax */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>
                    P
                    {showReceipt.subtotal
                      ? showReceipt.subtotal.toFixed(2)
                      : (parseFloat(showReceipt.total) * 0.893).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>
                    P
                    {showReceipt.tax
                      ? showReceipt.tax.toFixed(2)
                      : (parseFloat(showReceipt.total) * 0.107).toFixed(2)}
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
            <div className="p-4 flex justify-end space-x-2 print:hidden border-t">
             
              <button
                onClick={() => setShowReceipt(null)}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 font-medium"
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
      `}</style>
    </div>
  );
};

export default Sales;
