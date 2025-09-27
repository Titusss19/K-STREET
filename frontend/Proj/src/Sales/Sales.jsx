// src/Sales/Sales.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";

const Sales = ({ user }) => {
  const [sales, setSales] = useState([
    {
      id: 1,
      date: new Date().toLocaleString(),
      items: [
        { name: "Burger", qty: 2, price: 100 },
        { name: "Coke", qty: 1, price: 30 },
      ],
      total: 230,
      paid: 300,
      change: 70,
      cashier: "Admin",
    },
  ]);

  const [showReceipt, setShowReceipt] = useState(null);

  // 📝 Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      sales.map((sale) => ({
        ID: sale.id,
        Date: sale.date,
        Total: sale.total,
        Quantity: sale.quantity,
        Change: sale.change,
        Cashier: sale.cashier,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    XLSX.writeFile(workbook, "sales_report.xlsx");
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Sales Report</h1>

        {/* Export Button */}
        <button
          onClick={exportToExcel}
          className="mb-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Export to Excel
        </button>

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
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b">
                  <td className="px-4 py-2">{sale.id}</td>
                  <td className="px-4 py-2">{sale.date}</td>
                  <td className="px-4 py-2">₱{sale.total}</td>
                  <td className="px-4 py-2">₱{sale.paid}</td>
                  <td className="px-4 py-2">₱{sale.change}</td>
                  <td className="px-4 py-2">{sale.cashier}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => setShowReceipt(sale)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-blue-600"
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

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 flex items-center justify-center ">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center bg-green-600 text-white p-4 rounded-t-lg">
              <h3 className="text-lg font-bold">Receipt</h3>
              <button onClick={() => setShowReceipt(null)} className="text-xl">
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="font-mono text-sm">
                Date: {showReceipt.date}
                <br />
                Cashier: {showReceipt.cashier}
              </p>
              <hr className="my-2" />
              <ul className="font-mono text-sm">
                {showReceipt.items.map((item, i) => (
                  <li key={i}>
                    {item.name} x{item.qty} = ₱{item.qty * item.price}
                  </li>
                ))}
              </ul>
              <hr className="my-2" />
              <p>Total: ₱{showReceipt.total}</p>
              <p>Paid: ₱{showReceipt.paid}</p>
              <p>Change: ₱{showReceipt.change}</p>
            </div>
            <div className="p-4 flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Print
              </button>
              <button
                onClick={() => setShowReceipt(null)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
