import React, { useState, useEffect } from "react";
import axios from "axios";

const Items = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
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
  const [activeReport, setActiveReport] = useState("PRODUCTLIST");

  // STATES FOR INVENTORY
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingInventory, setEditingInventory] = useState(null);
  const [newInventoryItem, setNewInventoryItem] = useState({
    product_code: "",
    name: "",
    category: "Raw Material",
    description: "",
    unit: "pcs",
    current_stock: 0,
    min_stock: 0,
    supplier: "",
    price: "", // Price per item field
    total_price: "", // Total price field (price × quantity)
    quantity: 1,
  });
  const [inventorySearch, setInventorySearch] = useState("");
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);

  // Updated stock transaction state
  const [stockTransaction, setStockTransaction] = useState({
    type: "IN",
    stockPerItem: 0,
    quantity: 1,
    pricePerItem: "",
    notes: "",
  });

  // DELETE MODAL STATES FOR INVENTORY
  const [showDeleteInventoryModal, setShowDeleteInventoryModal] =
    useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState(null);

  // API endpoints
  const API_ALL_ITEMS = "http://localhost:3002/all-items";
  const API_ITEMS = "http://localhost:3002/items";
  const API_INVENTORY = "http://localhost:3002/inventory";

  // Function to convert liters to ml for display
  const convertToDisplayUnit = (item) => {
    if (item.unit === "liters") {
      return {
        ...item,
        current_stock: item.current_stock * 1000,
        min_stock: item.min_stock * 1000,
        display_unit: "ml",
      };
    }
    return { ...item, display_unit: item.unit };
  };

  // Function to convert ml to liters for saving
  const convertToStorageUnit = (item) => {
    if (item.unit === "liters") {
      return {
        ...item,
        current_stock: item.current_stock / 1000,
        min_stock: item.min_stock / 1000,
      };
    }
    return item;
  };

  // Fetch ALL items from backend with better error handling
  const fetchAllItems = async () => {
    try {
      const res = await axios.get(API_ALL_ITEMS);

      // Ensure the response data is an array
      if (Array.isArray(res.data)) {
        setItems(res.data);
        setFilteredItems(res.data);
      } else if (res.data && Array.isArray(res.data.items)) {
        // Handle case where data is nested in an items property
        setItems(res.data.items);
        setFilteredItems(res.data.items);
      } else if (res.data && Array.isArray(res.data.data)) {
        // Handle case where data is nested in a data property
        setItems(res.data.data);
        setFilteredItems(res.data.data);
      } else {
        console.warn("Unexpected API response format:", res.data);
        setItems([]);
        setFilteredItems([]);
      }
    } catch (err) {
      console.error("Error fetching all items: ", err);
      try {
        const fallbackRes = await axios.get(API_ITEMS);

        // Ensure fallback response is also an array
        if (Array.isArray(fallbackRes.data)) {
          setItems(fallbackRes.data);
          setFilteredItems(fallbackRes.data);
        } else if (fallbackRes.data && Array.isArray(fallbackRes.data.items)) {
          setItems(fallbackRes.data.items);
          setFilteredItems(fallbackRes.data.items);
        } else if (fallbackRes.data && Array.isArray(fallbackRes.data.data)) {
          setItems(fallbackRes.data.data);
          setFilteredItems(fallbackRes.data.data);
        } else {
          console.warn(
            "Unexpected fallback API response format:",
            fallbackRes.data
          );
          setItems([]);
          setFilteredItems([]);
        }
      } catch (fallbackErr) {
        console.error("Error with fallback fetch: ", fallbackErr);
        setItems([]);
        setFilteredItems([]);
      }
    }
  };

  // Fetch inventory items from MySQL with better error handling
  const fetchInventoryItems = async () => {
    try {
      const res = await axios.get(API_INVENTORY);

      let inventoryData = [];

      // Handle different possible response formats
      if (Array.isArray(res.data)) {
        inventoryData = res.data;
      } else if (res.data && Array.isArray(res.data.items)) {
        inventoryData = res.data.items;
      } else if (res.data && Array.isArray(res.data.data)) {
        inventoryData = res.data.data;
      } else if (res.data && typeof res.data === "object") {
        // If it's a single object, wrap it in an array
        inventoryData = [res.data];
      } else {
        console.warn("Unexpected inventory API response format:", res.data);
        inventoryData = [];
      }

      // Convert liters to ml for display
      const convertedItems = inventoryData.map((item) =>
        convertToDisplayUnit(item)
      );
      setInventoryItems(convertedItems);
      setFilteredInventory(convertedItems);
    } catch (err) {
      console.error("Error fetching inventory: ", err);
      // Fallback to empty array if API fails
      setInventoryItems([]);
      setFilteredInventory([]);
    }
  };

  useEffect(() => {
    fetchAllItems();
    fetchInventoryItems();
  }, []);

  // Search functionality for products with array safety
  useEffect(() => {
    if (!Array.isArray(items)) {
      setFilteredItems([]);
      return;
    }

    const filtered = items.filter(
      (item) =>
        item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item?.description_type
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item?.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
    setCurrentPage(1);
  }, [searchTerm, items]);

  // Search functionality for inventory with array safety
  useEffect(() => {
    if (!Array.isArray(inventoryItems)) {
      setFilteredInventory([]);
      return;
    }

    const filtered = inventoryItems.filter(
      (item) =>
        item?.name?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item?.category?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item?.product_code
          ?.toLowerCase()
          .includes(inventorySearch.toLowerCase())
    );
    setFilteredInventory(filtered);
  }, [inventorySearch, inventoryItems]);

  // Save handler (Add or Edit) - UPDATED
  const handleSave = async () => {
    // Basic validation
    if (!newItem.product_code || !newItem.name || !newItem.image) {
      alert("Please fill in all required fields!");
      return;
    }

    // For non-flavor items, price is required
    if (newItem.description_type !== "k-street Flavor" && !newItem.price) {
      alert("Please enter a price for non-flavor items!");
      return;
    }

    try {
      // Prepare data for API
      const saveData = {
        product_code: newItem.product_code,
        name: newItem.name,
        category: newItem.category,
        description_type: newItem.description_type,
        image: newItem.image,
        // For flavor items, send "0" as price
        price:
          newItem.description_type === "k-street Flavor" ? "0" : newItem.price,
      };

      console.log("Sending data:", saveData);

      let response;
      if (editingItem) {
        response = await axios.put(`${API_ITEMS}/${editingItem.id}`, saveData);
        setSuccessMessage("Product updated successfully!");
      } else {
        response = await axios.post(API_ITEMS, saveData);
        setSuccessMessage("Product added successfully!");
      }

      if (response.data.success) {
        setShowSuccessModal(true);

        // Refresh data
        fetchAllItems();
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
      }
    } catch (err) {
      console.error("Error saving item: ", err);
      if (err.response && err.response.data && err.response.data.message) {
        alert(`Error: ${err.response.data.message}`);
      } else {
        alert("Error saving item. Please try again.");
      }
    }
  };

  // CORRECTED: Save inventory item to MySQL - FIXED FOR BACKEND COMPATIBILITY
  const handleSaveInventory = async () => {
    if (
      !newInventoryItem.product_code ||
      !newInventoryItem.name ||
      !newInventoryItem.unit
    ) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      // CORRECTED: Calculate total current stock (stock per item × number of items)
      const stockPerItem = parseFloat(newInventoryItem.current_stock || 0);
      const numberOfItems = parseFloat(newInventoryItem.quantity || 1);
      const totalCurrentStock = stockPerItem * numberOfItems;

      // Calculate total price (price per item × number of items)
      const pricePerItem = parseFloat(newInventoryItem.price || 0);
      const totalPrice = pricePerItem * numberOfItems;

      // For new items, set current stock to the calculated total
      // For editing items, add the calculated total to existing stock
      const finalCurrentStock = editingInventory
        ? (editingInventory.unit === "liters"
            ? editingInventory.current_stock / 1000
            : editingInventory.current_stock) + totalCurrentStock
        : totalCurrentStock;

      // Convert to storage unit if necessary
      const itemToSave = convertToStorageUnit({
        ...newInventoryItem,
        current_stock: finalCurrentStock,
        min_stock: parseFloat(newInventoryItem.min_stock) || 0,
        price: pricePerItem, // Price per item
        total_price: totalPrice, // Total price
      });

      // Prepare data for backend (match backend expected fields)
      const inventoryData = {
        product_code: itemToSave.product_code,
        name: itemToSave.name,
        category: itemToSave.category,
        description: itemToSave.description || "",
        unit: itemToSave.unit,
        current_stock: itemToSave.current_stock,
        min_stock: itemToSave.min_stock,
        supplier: itemToSave.supplier || "",
        price: itemToSave.price,
        total_price: itemToSave.total_price,
      };

      if (editingInventory) {
        // Update existing inventory in MySQL
        await axios.put(
          `${API_INVENTORY}/${editingInventory.id}`,
          inventoryData
        );
        setSuccessMessage("Inventory item updated successfully!");
      } else {
        // Add new inventory to MySQL
        await axios.post(API_INVENTORY, inventoryData);
        setSuccessMessage("Inventory item added successfully!");
      }

      // Refresh inventory data from MySQL
      fetchInventoryItems();
      setShowInventoryModal(false);
      setEditingInventory(null);
      setNewInventoryItem({
        product_code: "",
        name: "",
        category: "Raw Material",
        description: "",
        unit: "pcs",
        current_stock: 0,
        min_stock: 0,
        supplier: "",
        price: "",
        total_price: "",
        quantity: 1,
      });
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error saving inventory item: ", err);
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        alert("Error saving inventory item. Please try again.");
      }
    }
  };

  // Helper functions for stock transaction calculations
  const calculateTotalStockToAdd = () => {
    const stockPerItem = parseFloat(stockTransaction.stockPerItem || 0);
    const quantity = parseFloat(stockTransaction.quantity || 1);
    return stockPerItem * quantity;
  };

  const calculateTotalPriceToAdd = () => {
    const pricePerItem = parseFloat(stockTransaction.pricePerItem || 0);
    const quantity = parseFloat(stockTransaction.quantity || 1);
    return pricePerItem * quantity;
  };

  // Handle stock transaction - SIMPLIFIED VERSION
  const handleStockTransaction = async () => {
    if (!stockTransaction.stockPerItem || stockTransaction.stockPerItem <= 0) {
      alert("Please enter a valid stock per item!");
      return;
    }

    if (!stockTransaction.quantity || stockTransaction.quantity <= 0) {
      alert("Please enter a valid quantity!");
      return;
    }

    try {
      // Use the selectedInventory data we already have
      const rawInventoryItem = selectedInventory;

      // Calculate total stock to add (in the unit that matches database)
      const stockPerItem = parseFloat(stockTransaction.stockPerItem);
      const quantity = parseFloat(stockTransaction.quantity);
      let totalStockToAdd = stockPerItem * quantity;

      // IMPORTANT: If the display shows ml but database stores liters
      // We need to check if we need to convert
      const needsConversion =
        rawInventoryItem.display_unit === "ml" &&
        rawInventoryItem.unit === "liters";

      if (needsConversion) {
        // Convert ml to liters for database
        totalStockToAdd = totalStockToAdd / 1000;
      }

      // Calculate total price to add
      const pricePerItem = parseFloat(stockTransaction.pricePerItem || 0);
      const totalPriceToAdd = pricePerItem * quantity;

      // Get current stock (already in database units from the original fetch)
      // If it's liters and we displayed as ml, convert back
      let currentStock = parseFloat(rawInventoryItem.current_stock || 0);

      if (needsConversion) {
        // The current_stock from inventoryItems is already converted for display
        // We need to get the original database value
        // Since we can't fetch it, we'll use a workaround
        currentStock = currentStock / 1000;
      }

      // Calculate new stock
      const newStock =
        stockTransaction.type === "IN"
          ? currentStock + totalStockToAdd
          : currentStock - totalStockToAdd;

      // Ensure stock doesn't go below 0 for OUT transactions
      if (stockTransaction.type === "OUT" && newStock < 0) {
        alert("Cannot deduct more stock than available!");
        return;
      }

      // Update price if provided
      const newPrice = stockTransaction.pricePerItem
        ? parseFloat(stockTransaction.pricePerItem)
        : parseFloat(rawInventoryItem.price || 0);

      // Calculate new total price
      const existingTotalPrice = parseFloat(rawInventoryItem.total_price || 0);
      const newTotalPrice =
        stockTransaction.type === "IN"
          ? existingTotalPrice + totalPriceToAdd
          : Math.max(0, existingTotalPrice - totalPriceToAdd);

      // Convert newStock back to display units if needed
      let displayNewStock = newStock;
      if (needsConversion) {
        displayNewStock = newStock * 1000;
      }

      // Prepare data for backend
      const updatedItem = {
        product_code: rawInventoryItem.product_code,
        name: rawInventoryItem.name,
        category: rawInventoryItem.category,
        description: rawInventoryItem.description || "",
        unit: rawInventoryItem.unit,
        current_stock: newStock, // Store in database units (liters)
        min_stock: rawInventoryItem.min_stock,
        supplier: rawInventoryItem.supplier || "",
        price: newPrice,
        total_price: newTotalPrice,
      };

      console.log("Sending to backend:", updatedItem);
      console.log("Original unit:", rawInventoryItem.unit);
      console.log("Display unit:", rawInventoryItem.display_unit);
      console.log("Total stock to add (db units):", totalStockToAdd);
      console.log("Current stock (db):", currentStock);
      console.log("New stock (db):", newStock);
      console.log("New stock (display):", displayNewStock);

      const updateResponse = await axios.put(
        `${API_INVENTORY}/${selectedInventory.id}`,
        updatedItem
      );

      if (updateResponse.data.success) {
        setSuccessMessage(
          `Stock ${
            stockTransaction.type === "IN" ? "added" : "deducted"
          } successfully! ${
            stockTransaction.pricePerItem ? "Price updated." : ""
          }`
        );

        // Refresh inventory data
        fetchInventoryItems();
        setShowStockModal(false);
        setSelectedInventory(null);
        setStockTransaction({
          type: "IN",
          stockPerItem: 0,
          quantity: 1,
          pricePerItem: "",
          notes: "",
        });
        setShowSuccessModal(true);
      } else {
        throw new Error(
          updateResponse.data.message || "Failed to update stock"
        );
      }
    } catch (err) {
      console.error("Error processing stock transaction: ", err);
      if (err.response && err.response.data && err.response.data.message) {
        alert(`Error: ${err.response.data.message}`);
      } else {
        alert("Error processing stock transaction. Please try again.");
      }
    }
  };
  // Delete functions for products
  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await axios.delete(`${API_ITEMS}/${itemToDelete.id}`);
        fetchAllItems();
        setShowDeleteModal(false);
        setItemToDelete(null);
        setSuccessMessage("Product deleted successfully!");
        setShowSuccessModal(true);
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

  // Delete functions for inventory
  const handleDeleteInventoryClick = (item) => {
    setInventoryToDelete(item);
    setShowDeleteInventoryModal(true);
  };

  const confirmDeleteInventory = async () => {
    if (inventoryToDelete) {
      try {
        await axios.delete(`${API_INVENTORY}/${inventoryToDelete.id}`);
        fetchInventoryItems();
        setShowDeleteInventoryModal(false);
        setInventoryToDelete(null);
        setSuccessMessage("Inventory item deleted successfully!");
        setShowSuccessModal(true);
      } catch (err) {
        console.error("Error deleting inventory item: ", err);
        alert("Error deleting inventory item. Please try again.");
      }
    }
  };

  const cancelDeleteInventory = () => {
    setShowDeleteInventoryModal(false);
    setInventoryToDelete(null);
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

  // Edit inventory
  const handleEditInventory = (item) => {
    // Convert back to display values when editing
    const displayItem =
      item.unit === "liters"
        ? {
            ...item,
            current_stock: item.current_stock * 1000,
            min_stock: item.min_stock * 1000,
          }
        : item;

    setEditingInventory(displayItem);
    setNewInventoryItem({
      product_code: displayItem.product_code,
      name: displayItem.name,
      category: displayItem.category,
      description: displayItem.description,
      unit: displayItem.unit,
      current_stock: 0, // Reset to 0 when editing - user will input how much to add
      min_stock: displayItem.min_stock,
      supplier: displayItem.supplier,
      price: displayItem.price || "",
      total_price: displayItem.total_price || "",
      quantity: 1, // Default quantity when editing
    });
    setShowInventoryModal(true);
  };

  // Add stock to inventory
  const handleAddStock = (item) => {
    setSelectedInventory(item);
    setStockTransaction({
      type: "IN",
      stockPerItem: 0,
      quantity: 1,
      pricePerItem: item.price || "",
      notes: "",
    });
    setShowStockModal(true);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleClearInventorySearch = () => {
    setInventorySearch("");
  };

  // Handle unit change
  const handleUnitChange = (unit) => {
    setNewInventoryItem({
      ...newInventoryItem,
      unit: unit,
    });
  };

  // Get current stock label based on selected unit
  const getCurrentStockLabel = () => {
    switch (newInventoryItem.unit) {
      case "grams":
        return "Stock per Item (grams)";
      case "kg":
        return "Stock per Item (kg)";
      case "liters":
        return "Stock per Item (liters)";
      case "pcs":
        return "Stock per Item (pcs)";
      case "packs":
        return "Stock per Item (packs)";
      case "bottles":
        return "Stock per Item (bottles)";
      default:
        return "Stock per Item";
    }
  };

  // Get quantity label based on selected unit
  const getQuantityLabel = () => {
    switch (newInventoryItem.unit) {
      case "grams":
        return "Number of Items";
      case "kg":
        return "Number of Items";
      case "liters":
        return "Number of Items";
      case "pcs":
        return "Number of Items";
      case "packs":
        return "Number of Items";
      case "bottles":
        return "Number of Items";
      default:
        return "Number of Items";
    }
  };

  // Get min stock label based on selected unit
  const getMinStockLabel = () => {
    switch (newInventoryItem.unit) {
      case "grams":
        return "Min Stock (grams)";
      case "kg":
        return "Min Stock (kg)";
      case "liters":
        return "Min Stock (liters)";
      case "pcs":
        return "Min Stock (pcs)";
      case "packs":
        return "Min Stock (packs)";
      case "bottles":
        return "Min Stock (bottles)";
      default:
        return "Min Stock";
    }
  };

  // CORRECTED: Calculate total quantity to add
  const calculateTotalQuantity = () => {
    const stockPerItem = parseFloat(newInventoryItem.current_stock || 0);
    const numberOfItems = parseFloat(newInventoryItem.quantity || 1);
    return stockPerItem * numberOfItems;
  };

  // CORRECTED: Calculate total price
  const calculateTotalPrice = () => {
    const pricePerItem = parseFloat(newInventoryItem.price || 0);
    const numberOfItems = parseFloat(newInventoryItem.quantity || 1);
    return pricePerItem * numberOfItems;
  };

  // Refresh inventory when stock modal closes
  useEffect(() => {
    if (!showStockModal && !showSuccessModal) {
      // Small delay to ensure backend has processed the request
      setTimeout(() => {
        fetchInventoryItems();
      }, 500);
    }
  }, [showStockModal, showSuccessModal]);

  // Pagination logic with array safety
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = Array.isArray(filteredItems)
    ? filteredItems.slice(indexOfFirstItem, indexOfLastItem)
    : [];
  const totalPages = Math.ceil(
    (Array.isArray(filteredItems) ? filteredItems.length : 0) / itemsPerPage
  );

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

  // Handle report navigation
  const handleReportNavigation = (reportType) => {
    setActiveReport(reportType);
    setCurrentPage(1);
  };

  // Calculate low stock items with array safety
  const lowStockItems = Array.isArray(inventoryItems)
    ? inventoryItems.filter((item) => item.current_stock <= item.min_stock)
    : [];

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">PRODUCTS</h1>

        {/* Report Navigation Headers */}
        <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => handleReportNavigation("PRODUCTLIST")}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeReport === "PRODUCTLIST"
                  ? "bg-red-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              PRODUCT LIST
            </button>
            <button
              onClick={() => handleReportNavigation("ITEMINVENTORY")}
              className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeReport === "ITEMINVENTORY"
                  ? "bg-red-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 hover:bg-red-50 border border-red-200"
              }`}
            >
              ITEM INVENTORY
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

        {/* PRODUCT LIST VIEW */}
        {activeReport === "PRODUCTLIST" && (
          <>
            {/* Search Bar */}
            <div className="mb-4 flex justify-between items-center">
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

              {searchTerm && (
                <div className="mt-2 text-sm text-gray-600">
                  Found{" "}
                  {Array.isArray(filteredItems) ? filteredItems.length : 0}{" "}
                  product
                  {Array.isArray(filteredItems) && filteredItems.length !== 1
                    ? "s"
                    : ""}{" "}
                  matching "{searchTerm}"
                  {Array.isArray(filteredItems) &&
                    filteredItems.length === 0 && (
                      <span className="ml-2 text-red-500">
                        No products found
                      </span>
                    )}
                </div>
              )}
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
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                + Add Product
              </button>
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
                    {Array.isArray(currentItems) &&
                      currentItems.map((item) => (
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
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                item.description_type === "k-street food"
                                  ? "bg-green-100 text-green-800"
                                  : item.description_type === "k-street add-ons"
                                  ? "bg-blue-100 text-blue-800"
                                  : item.description_type ===
                                    "k-street add sides"
                                  ? "bg-purple-100 text-purple-800"
                                  : item.description_type ===
                                    "k-street upgrades"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {item.description_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                            ₱{parseFloat(item.price || 0).toFixed(2)}
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

                    {(!Array.isArray(currentItems) ||
                      currentItems.length === 0) && (
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
              {Array.isArray(filteredItems) && filteredItems.length > 0 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">{indexOfFirstItem + 1}</span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(indexOfLastItem, filteredItems.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">{filteredItems.length}</span>{" "}
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
                          : "bg-gradient-to-r from-red-500 to-red-500 text-white hover:from-black hover:to-black"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ITEM INVENTORY VIEW */}
        {activeReport === "ITEMINVENTORY" && (
          <>
            {/* Inventory Header with Stats */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Items
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Array.isArray(inventoryItems)
                          ? inventoryItems.length
                          : 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        In Stock
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Array.isArray(inventoryItems)
                          ? inventoryItems.filter(
                              (item) => item.current_stock > 0
                            ).length
                          : 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="bg-red-100 p-3 rounded-lg">
                      <svg
                        className="w-6 h-6 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Low Stock
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {lowStockItems.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <svg
                        className="w-6 h-6 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Out of Stock
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Array.isArray(inventoryItems)
                          ? inventoryItems.filter(
                              (item) => item.current_stock <= 0
                            ).length
                          : 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and Add Button */}
              <div className="flex justify-between items-center">
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
                    placeholder="Search inventory items..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  {inventorySearch && (
                    <button
                      onClick={handleClearInventorySearch}
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
                <button
                  onClick={() => {
                    setEditingInventory(null);
                    setNewInventoryItem({
                      product_code: "",
                      name: "",
                      category: "Raw Material",
                      description: "",
                      unit: "pcs",
                      current_stock: 0,
                      min_stock: 0,
                      supplier: "",
                      price: "",
                      total_price: "",
                      quantity: 1,
                    });
                    setShowInventoryModal(true);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add Inventory Item
                </button>
              </div>
            </div>

            {/* Inventory Table - UPDATED WITH TOTAL PRICE COLUMN */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-red-600 to-red-600 text-white">
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Product Code
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Item Name
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Current Stock
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Min Stock
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Unit
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Price per Item
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Total Price
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Array.isArray(filteredInventory) &&
                      filteredInventory.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-gray-50 transition-colors duration-150 ${
                            item.current_stock <= item.min_stock
                              ? "bg-red-50"
                              : ""
                          }`}
                        >
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
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            <span
                              className={
                                item.current_stock <= item.min_stock
                                  ? "text-red-600 font-bold"
                                  : ""
                              }
                            >
                              {typeof item.current_stock === "number"
                                ? item.current_stock.toFixed(2)
                                : parseFloat(item.current_stock || 0).toFixed(
                                    2
                                  )}{" "}
                              {item.display_unit || item.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {typeof item.min_stock === "number"
                              ? item.min_stock.toFixed(2)
                              : parseFloat(item.min_stock || 0).toFixed(2)}{" "}
                            {item.display_unit || item.unit}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {item.display_unit || item.unit}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-900">
                            {item.price > 0 ? (
                              <>₱{parseFloat(item.price || 0).toFixed(2)}</>
                            ) : (
                              <span className="text-gray-400">No price</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-blue-900">
                            {item.total_price > 0 ? (
                              <>
                                ₱{parseFloat(item.total_price || 0).toFixed(2)}
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                item.current_stock <= 0
                                  ? "bg-red-100 text-red-800"
                                  : item.current_stock <= item.min_stock
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {item.current_stock <= 0
                                ? "Out of Stock"
                                : item.current_stock <= item.min_stock
                                ? "Low Stock"
                                : "In Stock"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleAddStock(item)}
                                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                              >
                                Stock
                              </button>
                              <button
                                onClick={() => handleEditInventory(item)}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteInventoryClick(item)}
                                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                    {(!Array.isArray(filteredInventory) ||
                      filteredInventory.length === 0) && (
                      <tr>
                        <td colSpan="10" className="text-center py-12">
                          <p className="text-gray-500 font-medium">
                            {inventorySearch
                              ? "No inventory items found matching your search"
                              : "No inventory items available"}
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            {inventorySearch
                              ? "Try a different search term"
                              : "Add your first inventory item to get started"}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-red-800 font-medium">
                    Low Stock Alert: {lowStockItems.length} item(s) need
                    restocking
                  </span>
                </div>
                <div className="mt-2 text-sm text-red-700">
                  {lowStockItems
                    .map(
                      (item) =>
                        `${item.name} (${
                          typeof item.current_stock === "number"
                            ? item.current_stock.toFixed(2)
                            : parseFloat(item.current_stock || 0).toFixed(2)
                        } ${item.display_unit || item.unit})`
                    )
                    .join(", ")}
                </div>
              </div>
            )}
          </>
        )}

        {/* Placeholder for other reports */}
        {activeReport !== "PRODUCTLIST" && activeReport !== "ITEMINVENTORY" && (
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

        {/* Add/Edit Product Modal */}
        {showFormModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
                    placeholder="Enter product code"
                    value={newItem.product_code}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        product_code: e.target.value.toUpperCase(),
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Important:</strong> Flavor items should have the
                    SAME product code as their base product
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
                      setNewItem({
                        ...newItem,
                        name: e.target.value,
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        category: e.target.value,
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  >
                    <option value="Food">Food</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Snack">Snack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description Type
                  </label>
                  <select
                    value={newItem.description_type}
                    onChange={(e) => {
                      const selectedType = e.target.value;
                      setNewItem({
                        ...newItem,
                        description_type: selectedType,
                        // Auto-fill price for flavor items
                        price:
                          selectedType === "k-street Flavor"
                            ? "0"
                            : newItem.price,
                      });
                    }}
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  >
                    <option value="k-street food">k-street food</option>
                    <option value="k-street Flavor">k-street Flavor</option>
                    <option value="k-street add sides">
                      k-street add sides
                    </option>
                    <option value="k-street upgrades">k-street upgrades</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>k-street Flavor:</strong> Automatically inherits
                    price from base product
                  </p>
                </div>

                {/* Price field sa modal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                    {newItem.description_type === "k-street Flavor" && (
                      <span className="text-xs text-blue-600 ml-2">
                        (Auto-inherited from base product)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={
                      newItem.description_type === "k-street Flavor"
                        ? "Auto-inherited"
                        : "0.00"
                    }
                    value={
                      newItem.description_type === "k-street Flavor"
                        ? "0"
                        : newItem.price
                    }
                    onChange={(e) => {
                      if (newItem.description_type !== "k-street Flavor") {
                        setNewItem({
                          ...newItem,
                          price: e.target.value,
                        });
                      }
                    }}
                    disabled={newItem.description_type === "k-street Flavor"}
                    className={`border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${
                      newItem.description_type === "k-street Flavor"
                        ? "bg-gray-100 text-gray-500"
                        : ""
                    }`}
                  />
                  {newItem.description_type === "k-street Flavor" && (
                    <p className="text-xs text-blue-600 mt-1">
                      ⓘ Price will be set to 0 in database. In POS, it will
                      inherit price from base product.
                    </p>
                  )}
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
                      setNewItem({
                        ...newItem,
                        image: e.target.value,
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>

                {newItem.image && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Image Preview:</p>
                    <img
                      src={newItem.image}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/150";
                      }}
                    />
                  </div>
                )}

                {/* Info Box for Flavor Items */}
                {newItem.description_type === "k-street Flavor" &&
                  newItem.product_code && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-800 mb-1">
                        Flavor Item Information
                      </h4>
                      <p className="text-xs text-blue-700 mb-1">
                        ✅ This is a flavor variation item
                      </p>
                      <p className="text-xs text-blue-700 mb-1">
                        ✅ Product Code: <strong>{newItem.product_code}</strong>
                      </p>
                      <p className="text-xs text-blue-700">
                        ✅ Price will be automatically inherited from the base
                        product
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        <strong>Note:</strong> Make sure the product code
                        matches the base product you want to create a flavor for
                      </p>
                    </div>
                  )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2.5 rounded-lg hover:from-red-700 hover:to-red-800 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
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

        {/* Add/Edit Inventory Modal */}
        {showInventoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingInventory
                  ? "Edit Inventory Item"
                  : "Add New Inventory Item"}
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Code *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter product code (e.g., BEEF001, BUN001)"
                    value={newInventoryItem.product_code}
                    onChange={(e) =>
                      setNewInventoryItem({
                        ...newInventoryItem,
                        product_code: e.target.value.toUpperCase(),
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter item name"
                    value={newInventoryItem.name}
                    onChange={(e) =>
                      setNewInventoryItem({
                        ...newInventoryItem,
                        name: e.target.value,
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newInventoryItem.category}
                    onChange={(e) =>
                      setNewInventoryItem({
                        ...newInventoryItem,
                        category: e.target.value,
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Meat">Meat</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Condiments">Condiments</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Enter item description"
                    value={newInventoryItem.description}
                    onChange={(e) =>
                      setNewInventoryItem({
                        ...newInventoryItem,
                        description: e.target.value,
                      })
                    }
                    rows="2"
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit *
                    </label>
                    <select
                      value={newInventoryItem.unit}
                      onChange={(e) => handleUnitChange(e.target.value)}
                      className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    >
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="grams">grams</option>
                      <option value="liters">liters</option>
                      <option value="packs">packs</option>
                      <option value="bottles">bottles</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {getCurrentStockLabel()}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0"
                      value={newInventoryItem.current_stock}
                      onChange={(e) =>
                        setNewInventoryItem({
                          ...newInventoryItem,
                          current_stock: e.target.value,
                        })
                      }
                      className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {getQuantityLabel()}
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="1"
                      value={newInventoryItem.quantity}
                      onChange={(e) =>
                        setNewInventoryItem({
                          ...newInventoryItem,
                          quantity: e.target.value,
                        })
                      }
                      className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per Item (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00 (Leave empty for migration)"
                      value={newInventoryItem.price}
                      onChange={(e) =>
                        setNewInventoryItem({
                          ...newInventoryItem,
                          price: e.target.value,
                        })
                      }
                      className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {getMinStockLabel()}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0"
                      value={newInventoryItem.min_stock}
                      onChange={(e) =>
                        setNewInventoryItem({
                          ...newInventoryItem,
                          min_stock: e.target.value,
                        })
                      }
                      className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier
                    </label>
                    <input
                      type="text"
                      placeholder="Enter supplier name"
                      value={newInventoryItem.supplier}
                      onChange={(e) =>
                        setNewInventoryItem({
                          ...newInventoryItem,
                          supplier: e.target.value,
                        })
                      }
                      className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Total Price Display (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Price (Auto-calculated)
                  </label>
                  <input
                    type="text"
                    value={`₱${calculateTotalPrice().toFixed(2)}`}
                    readOnly
                    className="border border-gray-300 p-2.5 rounded-lg w-full bg-gray-50 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-semibold text-green-600"
                  />
                </div>

                {/* Info box */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Price is optional for migration.
                    Leave empty if no price data available.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Total Quantity to Add:</strong>{" "}
                    {newInventoryItem.current_stock} {newInventoryItem.unit} ×{" "}
                    {newInventoryItem.quantity} items ={" "}
                    {calculateTotalQuantity()} {newInventoryItem.unit}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Total Price:</strong> ₱
                    {calculateTotalPrice().toFixed(2)}
                  </p>
                  {editingInventory && (
                    <p className="text-xs text-blue-600 mt-1">
                      <strong>Existing Stock:</strong>{" "}
                      {editingInventory.current_stock}{" "}
                      {editingInventory.display_unit || editingInventory.unit}
                    </p>
                  )}
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Final Stock:</strong>{" "}
                    {editingInventory
                      ? editingInventory.current_stock +
                        calculateTotalQuantity()
                      : calculateTotalQuantity()}{" "}
                    {newInventoryItem.unit}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleSaveInventory}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2.5 rounded-lg hover:from-red-700 hover:to-red-800 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {editingInventory ? "Update Item" : "Save Item"}
                </button>
                <button
                  onClick={() => {
                    setShowInventoryModal(false);
                    setEditingInventory(null);
                  }}
                  className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stock Transaction Modal - UPDATED WITH PRICE AND QUANTITY */}
        {showStockModal && selectedInventory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">
                Stock Management - {selectedInventory.name}
              </h2>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Current Stock:{" "}
                  <strong>
                    {typeof selectedInventory.current_stock === "number"
                      ? selectedInventory.current_stock.toFixed(2)
                      : parseFloat(
                          selectedInventory.current_stock || 0
                        ).toFixed(2)}{" "}
                    {selectedInventory.display_unit || selectedInventory.unit}
                  </strong>
                </p>
                <p className="text-sm text-gray-600">
                  Minimum Stock:{" "}
                  <strong>
                    {typeof selectedInventory.min_stock === "number"
                      ? selectedInventory.min_stock.toFixed(2)
                      : parseFloat(selectedInventory.min_stock || 0).toFixed(
                          2
                        )}{" "}
                    {selectedInventory.display_unit || selectedInventory.unit}
                  </strong>
                </p>
                {selectedInventory.unit === "liters" && (
                  <p className="text-xs text-blue-600 mt-1">
                    Note: 1 liter = 1000 ml
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={stockTransaction.type}
                    onChange={(e) =>
                      setStockTransaction({
                        ...stockTransaction,
                        type: e.target.value,
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  >
                    <option value="IN">Stock In (Add)</option>
                    <option value="OUT">Stock Out (Deduct)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock per Item *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder={`Stock per item in ${
                        selectedInventory.display_unit || selectedInventory.unit
                      }`}
                      value={stockTransaction.stockPerItem || ""}
                      onChange={(e) =>
                        setStockTransaction({
                          ...stockTransaction,
                          stockPerItem: e.target.value,
                        })
                      }
                      className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Number of items"
                      value={stockTransaction.quantity || ""}
                      onChange={(e) =>
                        setStockTransaction({
                          ...stockTransaction,
                          quantity: e.target.value,
                        })
                      }
                      className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price per Item (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price per item"
                    value={stockTransaction.pricePerItem || ""}
                    onChange={(e) =>
                      setStockTransaction({
                        ...stockTransaction,
                        pricePerItem: e.target.value,
                      })
                    }
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty if no price change
                  </p>
                </div>

                {/* Auto-calculated totals */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-2">
                  <h4 className="text-sm font-semibold text-blue-800 mb-1">
                    Calculations
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-blue-600">Total Stock to Add:</p>
                      <p className="font-semibold">
                        {calculateTotalStockToAdd().toFixed(2)}{" "}
                        {selectedInventory.display_unit ||
                          selectedInventory.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600">Total Price:</p>
                      <p className="font-semibold">
                        ₱{calculateTotalPriceToAdd().toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    <p>
                      <strong>Final Stock:</strong>{" "}
                      {parseFloat(selectedInventory.current_stock) +
                        (stockTransaction.type === "IN"
                          ? calculateTotalStockToAdd()
                          : -calculateTotalStockToAdd())}{" "}
                      {selectedInventory.display_unit || selectedInventory.unit}
                    </p>
                    {stockTransaction.pricePerItem && (
                      <p>
                        <strong>New Price per Item:</strong> ₱
                        {parseFloat(stockTransaction.pricePerItem || 0).toFixed(
                          2
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    placeholder="Enter notes (optional)"
                    value={stockTransaction.notes}
                    onChange={(e) =>
                      setStockTransaction({
                        ...stockTransaction,
                        notes: e.target.value,
                      })
                    }
                    rows="2"
                    className="border border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleStockTransaction}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2.5 rounded-lg hover:from-red-700 hover:to-red-800 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Process{" "}
                  {stockTransaction.type === "IN" ? "Stock In" : "Stock Out"}
                </button>
                <button
                  onClick={() => setShowStockModal(false)}
                  className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal for Products */}
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

        {/* Delete Confirmation Modal for Inventory */}
        {showDeleteInventoryModal && inventoryToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Delete Inventory Item
                </h2>
                <button
                  onClick={cancelDeleteInventory}
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
                  Are you sure you want to delete this inventory item?
                </p>
                <p className="text-center text-sm text-gray-600">
                  <strong>{inventoryToDelete.name}</strong>
                </p>
                <p className="text-center text-xs text-gray-500 mt-1">
                  Product Code:{" "}
                  <strong>{inventoryToDelete.product_code}</strong>
                </p>
                <p className="text-center text-sm text-red-500 mt-3">
                  This will permanently remove the item from inventory.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteInventory}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteInventory}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
                {successMessage}
              </h2>
              <p className="text-center text-gray-600 mb-6">
                Operation completed successfully!
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all"
              >
                Close
              </button>
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
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      viewItem.description_type === "k-street food"
                        ? "bg-green-100 text-green-800"
                        : viewItem.description_type === "k-street Flavor"
                        ? "bg-blue-100 text-blue-800"
                        : viewItem.description_type === "k-street add sides"
                        ? "bg-purple-100 text-purple-800"
                        : viewItem.description_type === "k-street upgrades"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {viewItem.description_type}
                  </span>
                </p>
                <p className="text-gray-700">
                  <strong className="text-gray-900">Price:</strong> ₱
                  {parseFloat(viewItem.price || 0).toFixed(2)}
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
