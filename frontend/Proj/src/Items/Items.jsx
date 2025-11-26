import React, { useState, useEffect } from "react";
import axios from "axios";

const Items = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [newItem, setNewItem] = useState({
    product_code: "",
    name: "",
    category: "Food",
    description_type: "k-street food",
    price: "",
    image: "",
  });
  const [viewItem, setViewItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const API = "http://localhost:3002/items";

  // Fetch items from backend - ALL ITEMS
  const fetchItems = async () => {
    try {
      const res = await axios.get(API);
      setItems(res.data);
      setFilteredItems(res.data);
    } catch (err) {
      console.error("Error fetching items: ", err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Search functionality
  useEffect(() => {
    const filtered = items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description_type
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.product_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
    setCurrentPage(1);
  }, [searchTerm, items]);

  // Save handler (Add or Edit)
  const handleSave = async () => {
    if (
      !newItem.product_code ||
      !newItem.name ||
      !newItem.price ||
      !newItem.image
    ) {
      alert("Please fill in all fields including Product Code!");
      return;
    }

    try {
      if (editingItem) {
        await axios.put(`${API}/${editingItem.id}`, {
          ...newItem,
          price: parseFloat(newItem.price),
        });
      } else {
        await axios.post(API, {
          ...newItem,
          price: parseFloat(newItem.price),
        });
      }
      fetchItems();
      setShowFormModal(false);
      setEditingItem(null);
      setNewItem({
        product_code: "",
        name: "",
        category: "Food",
        description_type: "k-street food",
        price: "",
        image: "",
      });
    } catch (err) {
      console.error("Error saving item: ", err);
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        alert("Error saving item. Please try again.");
      }
    }
  };

  // Delete functions
  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await axios.delete(`${API}/${itemToDelete.id}`);
        fetchItems();
        setShowDeleteModal(false);
        setItemToDelete(null);
        alert("Product deleted successfully!");
      } catch (err) {
        console.error("Error deleting item: ", err);
        alert("Error deleting product. Please try again.");
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  // Edit
  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItem({
      product_code: item.product_code || "",
      name: item.name || "",
      category: item.category || "Food",
      description_type: item.description_type || "k-street food",
      price: item.price || "",
      image: item.image || "",
    });
    setShowFormModal(true);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

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
          <h1 className="text-2xl font-bold">PRODUCT LIST</h1>

          <button
            onClick={() => {
              setEditingItem(null);
              setNewItem({
                product_code: "",
                name: "",
                category: "Food",
                description_type: "k-street food",
                price: "",
                image: "",
              });
              setShowFormModal(true);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            + Add Product
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by product code, name, category, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              Found {filteredItems.length} product
              {filteredItems.length !== 1 ? "s" : ""} matching "{searchTerm}"
              {filteredItems.length === 0 && (
                <span className="ml-2 text-red-500">No products found</span>
              )}
            </div>
          )}
        </div>


        {/* Modern Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-red-600 to-red-600 text-white">
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                    Product Code
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                    Product Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                    Description Type
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
                    className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-700">
                      {item.product_code}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-black-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.description_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                      ₱{parseFloat(item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setViewItem(item)}
                          className="bg-gradient-to-r from-black to-black text-white px-3 py-1.5 rounded-lg hover:from-red-600 hover:to-red-600 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
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
                          onClick={() => handleDeleteClick(item)}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <p className="text-gray-500 font-medium">
                        {searchTerm
                          ? "No items found matching your search"
                          : "No items available"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm
                          ? "Try a different search term"
                          : "Add your first item to get started"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredItems.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(indexOfLastItem, filteredItems.length)}
                </span>{" "}
                of <span className="font-medium">{filteredItems.length}</span>{" "}
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
                      : "bg-gradient-to-r from-red-500 to-red500 text-white hover:from-black hover:to-black"
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
                {editingItem ? "Edit Product" : "Add New Product"}
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Code *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter unique product code (e.g., PROD001, BURGER01)"
                    value={newItem.product_code}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        product_code: e.target.value.toUpperCase(),
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be unique. Example: BURGER01, FRIES001, DRINK25
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter product name"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description Type
                  </label>
                  <select
                    value={newItem.description_type}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        description_type: e.target.value,
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="k-street food">k-street food</option>
                    <option value="k-street add-ons">k-street add-ons</option>
                    <option value="k-street add sides">
                      k-street add sides
                    </option>
                    <option value="k-street upgrades">k-street upgrades</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter price"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: e.target.value })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter image URL"
                    value={newItem.image}
                    onChange={(e) =>
                      setNewItem({ ...newItem, image: e.target.value })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {editingItem ? "Update Product" : "Save Product"}
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

        {/* Delete Confirmation Modal */}
        {showDeleteModal && itemToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Delete Product
                </h2>
                <button
                  onClick={cancelDelete}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <p className="text-center text-gray-700 mb-2">
                  Are you sure you want to delete this product?
                </p>
                <p className="text-center text-sm text-gray-600">
                  <strong>{itemToDelete.name}</strong>
                </p>
                <p className="text-center text-xs text-gray-500 mt-1">
                  Product Code: <strong>{itemToDelete.product_code}</strong>
                </p>
                <p className="text-center text-sm text-red-500 mt-3">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Product Details</h2>
              <img
                src={viewItem.image}
                alt={viewItem.name}
                className="w-full h-48 object-cover rounded-xl mb-4 shadow-md"
              />
              <div className="space-y-3">
                <p className="text-gray-700">
                  <strong className="text-gray-900">Product Code:</strong>{" "}
                  <span className="font-mono text-blue-600">
                    {viewItem.product_code}
                  </span>
                </p>
                <p className="text-gray-700">
                  <strong className="text-gray-900">Product Name:</strong>{" "}
                  {viewItem.name}
                </p>
                <p className="text-gray-700">
                  <strong className="text-gray-900">Category:</strong>{" "}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {viewItem.category}
                  </span>
                </p>
                <p className="text-gray-700">
                  <strong className="text-gray-900">Description Type:</strong>{" "}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {viewItem.description_type}
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
