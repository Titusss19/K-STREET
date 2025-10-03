import React, { useState, useEffect } from "react";
import axios from "axios";

const Items = () => {
  const [items, setItems] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "Food",
    price: "",
    image: "",
  });
  const [viewItem, setViewItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const API = "http://localhost:3002/items";

  // Fetch items from backend
  const fetchItems = async () => {
    try {
      const res = await axios.get(API);
      setItems(res.data);
    } catch (err) {
      console.error("Error fetching items: ", err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Save handler (Add or Edit)
  const handleSave = async () => {
    if (!newItem.name || !newItem.price || !newItem.image) {
      alert("Please fill in all fields!");
      return;
    }

    try {
      if (editingItem) {
        await axios.put(`${API}/${editingItem.id}`, {
          ...newItem,
          price: parseFloat(newItem.price),
        });
      } else {
        await axios.post(API, { ...newItem, price: parseFloat(newItem.price) });
      }
      fetchItems();
      setShowFormModal(false);
      setEditingItem(null);
      setNewItem({ name: "", category: "Food", price: "", image: "" });
    } catch (err) {
      console.error("Error saving item: ", err);
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      fetchItems();
    } catch (err) {
      console.error("Error deleting item: ", err);
    }
  };

  // Edit
  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItem({ ...item });
    setShowFormModal(true);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(items.length / itemsPerPage);

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
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Items</h1>
          <button
            onClick={() => {
              setEditingItem(null);
              setNewItem({ name: "", category: "Food", price: "", image: "" });
              setShowFormModal(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            + Add Item
          </button>
        </div>

        {/* Modern Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                    Category
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold tracking-wide">
                    Price
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                      ₱{parseFloat(item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setViewItem(item)}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12">
                      <p className="text-gray-500 font-medium">
                        No items available
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Add your first item to get started
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {items.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(indexOfLastItem, items.length)}
                </span>{" "}
                of <span className="font-medium">{items.length}</span> results
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
                      : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Item Modal */}
        {showFormModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-lg w-full">
              <h2 className="text-xl font-bold mb-4">
                {editingItem ? "Edit Item" : "Add New Item"}
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  placeholder="Item Name"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <select
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category: e.target.value })
                  }
                  className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="Food">Food</option>
                  <option value="Drinks">Drinks</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Sides">Sides</option>
                </select>
                <input
                  type="number"
                  placeholder="Price"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: e.target.value })
                  }
                  className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <input
                  type="text"
                  placeholder="Image URL"
                  value={newItem.image}
                  onChange={(e) =>
                    setNewItem({ ...newItem, image: e.target.value })
                  }
                  className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {editingItem ? "Update" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingItem(null);
                  }}
                  className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Item Details</h2>
              <img
                src={viewItem.image}
                alt={viewItem.name}
                className="w-full h-48 object-cover rounded-xl mb-4 shadow-md"
              />
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong className="text-gray-900">Name:</strong>{" "}
                  {viewItem.name}
                </p>
                <p className="text-gray-700">
                  <strong className="text-gray-900">Category:</strong>{" "}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {viewItem.category}
                  </span>
                </p>
                <p className="text-gray-700">
                  <strong className="text-gray-900">Price:</strong> ₱
                  {parseFloat(viewItem.price).toFixed(2)}
                </p>
              </div>
              <div className="mt-6 text-right">
                <button
                  onClick={() => setViewItem(null)}
                  className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 font-medium transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Items;
