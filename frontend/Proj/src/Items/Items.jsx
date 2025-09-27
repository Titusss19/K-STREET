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

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-green-600 text-white">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Price</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-2">{item.id}</td>
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2">{item.category}</td>
                  <td className="px-4 py-2">₱{item.price}</td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <button
                      onClick={() => setViewItem(item)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-4 text-gray-500 italic"
                  >
                    No items available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Item Modal */}
        {showFormModal && (
          <div className="fixed inset-0  flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
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
                  className="border p-2 rounded w-full"
                />
                <select
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category: e.target.value })
                  }
                  className="border p-2 rounded w-full"
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
                  className="border p-2 rounded w-full"
                />
                <input
                  type="text"
                  placeholder="Image URL"
                  value={newItem.image}
                  onChange={(e) =>
                    setNewItem({ ...newItem, image: e.target.value })
                  }
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  {editingItem ? "Update" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingItem(null);
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewItem && (
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Item Details</h2>
              <img
                src={viewItem.image}
                alt={viewItem.name}
                className="w-full h-40 object-cover rounded mb-4"
              />
              <p>
                <strong>Name:</strong> {viewItem.name}
              </p>
              <p>
                <strong>Category:</strong> {viewItem.category}
              </p>
              <p>
                <strong>Price:</strong> ₱{viewItem.price}
              </p>
              <div className="mt-4 text-right">
                <button
                  onClick={() => setViewItem(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
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