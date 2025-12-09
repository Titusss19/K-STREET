import React, { useState, useEffect } from "react";
import axios from "axios";

const Items = () => {
  // GET USER FROM LOCALSTORAGE
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });

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
    price: "",
    total_price: "",
    quantity: 1,
  });
  const [inventorySearch, setInventorySearch] = useState("");
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);

  // Stock transaction state
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

  // ADMIN/OWNER STATES
  const [allBranches, setAllBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);

  // API endpoints - UPDATED TO INCLUDE BRANCH
  const API_ALL_ITEMS = "http://localhost:3002/all-items";
  const API_ITEMS = "http://localhost:3002/items";
  const API_INVENTORY = "http://localhost:3002/inventory";
  const API_ADMIN_ALL_ITEMS = "http://localhost:3002/admin/all-items";
  const API_ADMIN_ALL_INVENTORY = "http://localhost:3002/admin/all-inventory";
  const API_USERS = "http://localhost:3002/users";

  // Function to get axios headers with user info
  const getAxiosHeaders = () => {
    const storedUser = localStorage.getItem("user");
    let headers = {};

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const user = parsedUser.user || parsedUser;

        headers["x-user"] = JSON.stringify({
          id: user.id,
          email: user.email,
          role: user.role || "cashier",
          branch: user.branch || "main",
        });
      } catch (error) {
        console.error("Error parsing user:", error);
      }
    }

    return headers;
  };

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

  // Function to fetch all branches from users
  const fetchAllBranches = async () => {
    try {
      const headers = getAxiosHeaders();
      const res = await axios.get(API_USERS, { headers: headers });

      if (Array.isArray(res.data)) {
        // Extract unique branches from users
        const branches = [
          ...new Set(
            res.data.map((user) => user.branch).filter((branch) => branch)
          ),
        ];
        setAllBranches(branches);
        console.log("Available branches:", branches);
        return branches;
      }
      return [];
    } catch (err) {
      console.error("Error fetching branches:", err);
      return [];
    }
  };

  // Fetch ALL items from backend with BRANCH FILTER
  const fetchAllItems = async () => {
    try {
      // Check if user is admin/owner
      if (isAdmin && selectedBranch) {
        console.log("Admin fetching items for branch:", selectedBranch);
        // Use admin endpoint to fetch items for selected branch
        const headers = getAxiosHeaders();
        const res = await axios.get(API_ADMIN_ALL_ITEMS, { headers: headers });

        // Filter by selected branch
        let allItems = [];
        if (Array.isArray(res.data)) {
          allItems = res.data;
        } else if (res.data && Array.isArray(res.data.items)) {
          allItems = res.data.items;
        } else if (res.data && Array.isArray(res.data.data)) {
          allItems = res.data.data;
        }

        // Filter by selected branch if not "all"
        const filteredItems =
          selectedBranch === "all"
            ? allItems
            : allItems.filter((item) => item.branch === selectedBranch);

        setItems(filteredItems);
        setFilteredItems(filteredItems);
        console.log(
          `Found ${filteredItems.length} items for branch ${selectedBranch}`
        );
      } else {
        // Non-admin users or admin without branch selection
        const userBranch = user?.branch;
        if (!userBranch) {
          console.log("No user branch found");
          setItems([]);
          setFilteredItems([]);
          return;
        }

        console.log("Fetching items for branch:", userBranch);

        // Get headers with user info
        const headers = getAxiosHeaders();

        // Fetch items filtered by branch WITH HEADERS
        const res = await axios.get(`${API_ITEMS}?branch=${userBranch}`, {
          headers: headers,
        });

        // Ensure the response data is an array
        let itemsData = [];
        if (Array.isArray(res.data)) {
          itemsData = res.data;
        } else if (res.data && Array.isArray(res.data.items)) {
          itemsData = res.data.items;
        } else if (res.data && Array.isArray(res.data.data)) {
          itemsData = res.data.data;
        }

        setItems(itemsData);
        setFilteredItems(itemsData);
        console.log(`Found ${itemsData.length} items for branch ${userBranch}`);
      }
    } catch (err) {
      console.error("Error fetching all items: ", err);
      setItems([]);
      setFilteredItems([]);
    }
  };

  // Fetch inventory items from MySQL with BRANCH FILTER
  const fetchInventoryItems = async () => {
    try {
      // Check if user is admin/owner
      if (isAdmin && selectedBranch) {
        console.log("Admin fetching inventory for branch:", selectedBranch);
        // Use admin endpoint to fetch inventory for selected branch
        const headers = getAxiosHeaders();
        const res = await axios.get(API_ADMIN_ALL_INVENTORY, {
          headers: headers,
        });

        // Filter by selected branch
        let allInventory = [];
        if (Array.isArray(res.data)) {
          allInventory = res.data;
        } else if (res.data && Array.isArray(res.data.items)) {
          allInventory = res.data.items;
        } else if (res.data && Array.isArray(res.data.data)) {
          allInventory = res.data.data;
        }

        // Filter by selected branch if not "all"
        const filteredInventory =
          selectedBranch === "all"
            ? allInventory
            : allInventory.filter((item) => item.branch === selectedBranch);

        // Convert liters to ml for display
        const convertedItems = filteredInventory.map((item) =>
          convertToDisplayUnit(item)
        );
        setInventoryItems(convertedItems);
        setFilteredInventory(convertedItems);
        console.log(
          `Found ${convertedItems.length} inventory items for branch ${selectedBranch}`
        );
      } else {
        // Non-admin users or admin without branch selection
        const userBranch = user?.branch;
        if (!userBranch) {
          console.log("No user branch found for inventory");
          setInventoryItems([]);
          setFilteredInventory([]);
          return;
        }

        console.log("Fetching inventory for branch:", userBranch);

        // Get headers with user info
        const headers = getAxiosHeaders();

        // Fetch inventory filtered by branch WITH HEADERS
        const res = await axios.get(`${API_INVENTORY}?branch=${userBranch}`, {
          headers: headers,
        });

        let inventoryData = [];

        // Handle different possible response formats
        if (Array.isArray(res.data)) {
          inventoryData = res.data;
        } else if (res.data && Array.isArray(res.data.items)) {
          inventoryData = res.data.items;
        } else if (res.data && Array.isArray(res.data.data)) {
          inventoryData = res.data.data;
        } else if (res.data && typeof res.data === "object") {
          inventoryData = [res.data];
        }

        // Convert liters to ml for display
        const convertedItems = inventoryData.map((item) =>
          convertToDisplayUnit(item)
        );
        setInventoryItems(convertedItems);
        setFilteredInventory(convertedItems);
        console.log(
          `Found ${convertedItems.length} inventory items for branch ${userBranch}`
        );
      }
    } catch (err) {
      console.error("Error fetching inventory: ", err);
      setInventoryItems([]);
      setFilteredInventory([]);
    }
  };

  // Fetch data when component mounts AND when user changes
  useEffect(() => {
    if (user) {
      // Check if user is admin/owner
      const userIsAdmin = user.role === "admin" || user.role === "owner";
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        // For admin, fetch all branches first
        fetchAllBranches().then(() => {
          // After fetching branches, set default to "all" and fetch data
          setSelectedBranch("all");
          // DIRECTLY FETCH DATA HERE INSTEAD OF WAITING FOR ANOTHER useEffect
          fetchAllItems();
          fetchInventoryItems();
        });
      } else {
        // For non-admin, just fetch data for their branch
        if (user.branch) {
          console.log("User branch detected:", user.branch);
          fetchAllItems();
          fetchInventoryItems();
        }
      }
    } else {
      console.log("Waiting for user data...");
    }
  }, [user]);

  // Fetch data when selected branch changes (for admin)
  useEffect(() => {
    if (isAdmin && selectedBranch) {
      // Check which report is active and fetch accordingly
      if (activeReport === "PRODUCTLIST") {
        fetchAllItems();
      } else if (activeReport === "ITEMINVENTORY") {
        fetchInventoryItems();
      }
    }
  }, [selectedBranch, isAdmin]);

  // AUTOMATICALLY FETCH DATA WHEN SWITCHING REPORTS
  useEffect(() => {
    if (activeReport === "PRODUCTLIST") {
      console.log("Switched to PRODUCTLIST, fetching products...");
      fetchAllItems();
    } else if (activeReport === "ITEMINVENTORY") {
      console.log("Switched to ITEMINVENTORY, fetching inventory...");
      fetchInventoryItems();
    }
  }, [activeReport]);

  // Search functionality for products
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

  // Search functionality for inventory
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

  // Save handler (Add or Edit) - UPDATED WITH BRANCH
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

    // Check if user has branch (for non-admin)
    if (!user?.branch && !isAdmin) {
      alert("Cannot determine your branch. Please login again.");
      return;
    }

    try {
      // Determine which branch to use
      const targetBranch = isAdmin
        ? selectedBranch === "all"
          ? user.branch
          : selectedBranch
        : user.branch;

      if (!targetBranch) {
        alert("Please select a branch!");
        return;
      }

      // Prepare data for API - INCLUDE USER'S BRANCH
      const saveData = {
        product_code: newItem.product_code,
        name: newItem.name,
        category: newItem.category,
        description_type: newItem.description_type,
        image: newItem.image,
        price:
          newItem.description_type === "k-street Flavor" ? "0" : newItem.price,
        branch: targetBranch, // AUTO-ADD USER'S BRANCH
      };

      console.log("Saving item with branch:", targetBranch);
      console.log("Data:", saveData);

      // Get headers with user info
      const headers = getAxiosHeaders();

      let response;
      if (editingItem) {
        response = await axios.put(`${API_ITEMS}/${editingItem.id}`, saveData, {
          headers: headers,
        });
        setSuccessMessage("Product updated successfully!");
      } else {
        response = await axios.post(API_ITEMS, saveData, {
          headers: headers,
        });
        setSuccessMessage("Product added successfully!");
      }

      if (response.data.success) {
        setShowSuccessModal(true);
        fetchAllItems(); // Refresh data
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
      alert("Error saving item. Please try again.");
    }
  };

  // Save inventory item - UPDATED WITH BRANCH
  const handleSaveInventory = async () => {
    if (
      !newInventoryItem.product_code ||
      !newInventoryItem.name ||
      !newInventoryItem.unit
    ) {
      alert("Please fill in all required fields!");
      return;
    }

    // Check if user has branch (for non-admin)
    if (!user?.branch && !isAdmin) {
      alert("Cannot determine your branch. Please login again.");
      return;
    }

    try {
      // Determine which branch to use
      const targetBranch = isAdmin
        ? selectedBranch === "all"
          ? user.branch
          : selectedBranch
        : user.branch;

      if (!targetBranch) {
        alert("Please select a branch!");
        return;
      }

      // Calculate total current stock
      const stockPerItem = parseFloat(newInventoryItem.current_stock || 0);
      const numberOfItems = parseFloat(newInventoryItem.quantity || 1);
      const totalCurrentStock = stockPerItem * numberOfItems;

      // Calculate total price
      const pricePerItem = parseFloat(newInventoryItem.price || 0);
      const totalPrice = pricePerItem * numberOfItems;

      // For new items, set current stock to calculated total
      // For editing items, add calculated total to existing stock
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
        price: pricePerItem,
        total_price: totalPrice,
      });

      // Prepare data for backend - INCLUDE USER'S BRANCH
      const inventoryData = {
        product_code: itemToSave.product_code,
        name: itemToSave.name,
        category: itemToSave.category || "Raw Material",
        description: itemToSave.description || "",
        unit: itemToSave.unit,
        current_stock: itemToSave.current_stock,
        min_stock: itemToSave.min_stock,
        supplier: itemToSave.supplier || "",
        price: itemToSave.price,
        total_price: itemToSave.total_price,
        branch: targetBranch, // AUTO-ADD USER'S BRANCH
      };

      console.log("Saving inventory with branch:", targetBranch);
      console.log("Data:", inventoryData);

      // Get headers with user info
      const headers = getAxiosHeaders();

      if (editingInventory) {
        await axios.put(
          `${API_INVENTORY}/${editingInventory.id}`,
          inventoryData,
          { headers: headers }
        );
        setSuccessMessage("Inventory item updated successfully!");
      } else {
        await axios.post(API_INVENTORY, inventoryData, { headers: headers });
        setSuccessMessage("Inventory item added successfully!");
      }

      fetchInventoryItems(); // Refresh inventory data
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
      alert("Error saving inventory item. Please try again.");
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

  // Handle stock transaction
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
      const rawInventoryItem = selectedInventory;

      // Calculate total stock to add
      const stockPerItem = parseFloat(stockTransaction.stockPerItem);
      const quantity = parseFloat(stockTransaction.quantity);
      let totalStockToAdd = stockPerItem * quantity;

      // Check if we need to convert ml to liters
      const needsConversion =
        rawInventoryItem.display_unit === "ml" &&
        rawInventoryItem.unit === "liters";

      if (needsConversion) {
        totalStockToAdd = totalStockToAdd / 1000;
      }

      // Calculate total price to add
      const pricePerItem = parseFloat(stockTransaction.pricePerItem || 0);
      const totalPriceToAdd = pricePerItem * quantity;

      // Get current stock
      let currentStock = parseFloat(rawInventoryItem.current_stock || 0);

      if (needsConversion) {
        currentStock = currentStock / 1000;
      }

      // Calculate new stock
      const newStock =
        stockTransaction.type === "IN"
          ? currentStock + totalStockToAdd
          : currentStock - totalStockToAdd;

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

      // Prepare data for backend
      const updatedItem = {
        product_code: rawInventoryItem.product_code,
        name: rawInventoryItem.name,
        category: rawInventoryItem.category,
        description: rawInventoryItem.description || "",
        unit: rawInventoryItem.unit,
        current_stock: newStock,
        min_stock: rawInventoryItem.min_stock,
        supplier: rawInventoryItem.supplier || "",
        price: newPrice,
        total_price: newTotalPrice,
        branch: rawInventoryItem.branch, // KEEP ORIGINAL BRANCH
      };

      // Get headers with user info
      const headers = getAxiosHeaders();

      const updateResponse = await axios.put(
        `${API_INVENTORY}/${selectedInventory.id}`,
        updatedItem,
        { headers: headers }
      );

      if (updateResponse.data.success) {
        setSuccessMessage(
          `Stock ${
            stockTransaction.type === "IN" ? "added" : "deducted"
          } successfully!`
        );

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
      }
    } catch (err) {
      console.error("Error processing stock transaction: ", err);
      alert("Error processing stock transaction. Please try again.");
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
        // Get headers with user info
        const headers = getAxiosHeaders();

        await axios.delete(`${API_ITEMS}/${itemToDelete.id}`, {
          headers: headers,
        });
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
        // Get headers with user info
        const headers = getAxiosHeaders();

        await axios.delete(`${API_INVENTORY}/${inventoryToDelete.id}`, {
          headers: headers,
        });
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

  // Edit product
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
      current_stock: 0, // Reset to 0 when editing
      min_stock: displayItem.min_stock,
      supplier: displayItem.supplier,
      price: displayItem.price || "",
      total_price: displayItem.total_price || "",
      quantity: 1,
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

  // Handle branch change (for admin)
  const handleBranchChange = (branch) => {
    setSelectedBranch(branch);
    setCurrentPage(1); // Reset to first page when changing branch

    // Automatically fetch data when branch changes
    if (isAdmin) {
      if (activeReport === "PRODUCTLIST") {
        fetchAllItems();
      } else if (activeReport === "ITEMINVENTORY") {
        fetchInventoryItems();
      }
    }
  };

  // Handle report navigation
  const handleReportNavigation = (reportType) => {
    setActiveReport(reportType);
    setCurrentPage(1);

    // Automatically fetch data when switching reports
    if (reportType === "PRODUCTLIST") {
      console.log("Switching to PRODUCTLIST, fetching products...");
      fetchAllItems();
    } else if (reportType === "ITEMINVENTORY") {
      console.log("Switching to ITEMINVENTORY, fetching inventory...");
      fetchInventoryItems();
    }
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

  // Get quantity label
  const getQuantityLabel = () => {
    return "Number of Items";
  };

  // Get min stock label
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

  // Calculate total quantity to add
  const calculateTotalQuantity = () => {
    const stockPerItem = parseFloat(newInventoryItem.current_stock || 0);
    const numberOfItems = parseFloat(newInventoryItem.quantity || 1);
    return stockPerItem * numberOfItems;
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    const pricePerItem = parseFloat(newInventoryItem.price || 0);
    const numberOfItems = parseFloat(newInventoryItem.quantity || 1);
    return pricePerItem * numberOfItems;
  };

  // Refresh inventory when stock modal closes
  useEffect(() => {
    if (!showStockModal && !showSuccessModal) {
      setTimeout(() => {
        fetchInventoryItems();
      }, 500);
    }
  }, [showStockModal, showSuccessModal]);

  // Pagination logic
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

  // Calculate low stock items
  const lowStockItems = Array.isArray(inventoryItems)
    ? inventoryItems.filter((item) => item.current_stock <= item.min_stock)
    : [];

  // Loading state
  if (!user) {
    return (
      <div className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow">
          <div className="text-center py-12">
            <p className="text-gray-500 font-medium">Loading user data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow">
        {/* HEADER WITH BRANCH INFO */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">PRODUCTS</h1>
        </div>

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
           
          </div>
        </div>

        {/* PRODUCT LIST VIEW */}
        {activeReport === "PRODUCTLIST" && (
          <>
            {/* Search Bar with Branch Filter */}
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                {/* Branch Filter Dropdown (for Admin) */}
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      Branch:
                    </span>
                    <select
                      value={selectedBranch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white min-w-[180px]"
                    >
                      <option value="all">All Branches</option>
                      {allBranches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch} {branch === user.branch ? "(Current)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Search Bar for Products */}
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
                    placeholder="Search products..."
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
              </div>

              {/* BRANCH INFO IN SEARCH RESULTS (for non-admin) */}
              {!isAdmin && user.branch && searchTerm && (
                <div className="text-sm text-red-600">
                  Searching in branch: <strong>{user.branch}</strong>
                </div>
              )}

              {/* Add Product Button */}
              <button
                onClick={() => {
                  if (!user?.branch && !isAdmin) {
                    alert("Cannot determine your branch. Please login again.");
                    return;
                  }

                  if (isAdmin && !selectedBranch) {
                    alert("Please select a branch first!");
                    return;
                  }

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
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 whitespace-nowrap"
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
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Branch
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
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              item.description_type === "k-street food"
                                ? "bg-green-100 text-green-800"
                                : item.description_type === "k-street add-ons"
                                ? "bg-blue-100 text-blue-800"
                                : item.description_type === "k-street add sides"
                                ? "bg-purple-100 text-purple-800"
                                : item.description_type === "k-street upgrades"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {item.description_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              isAdmin
                                ? item.branch === user.branch
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {item.branch || user.branch}
                            {isAdmin && item.branch === user.branch && (
                              <span className="ml-1">(Current)</span>
                            )}
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

                    {currentItems.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center py-12">
                          <p className="text-gray-500 font-medium">
                            {searchTerm
                              ? "No items found matching your search"
                              : "No items available"}
                          </p>
                          {!searchTerm && (
                            <p className="text-gray-400 text-sm mt-1">
                              {isAdmin
                                ? selectedBranch === "all"
                                  ? "No items found in any branch"
                                  : `No items available in branch: ${selectedBranch}`
                                : `Add your first item to branch: ${user.branch}`}
                            </p>
                          )}
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
              {/* Search and Add Button with Branch Filter */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {/* Branch Filter Dropdown (for Admin) */}
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Branch:
                      </span>
                      <select
                        value={selectedBranch}
                        onChange={(e) => handleBranchChange(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white min-w-[180px]"
                      >
                        <option value="all">All Branches</option>
                        {allBranches.map((branch) => (
                          <option key={branch} value={branch}>
                            {branch} {branch === user.branch ? "" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Search Bar for Inventory */}
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
                </div>

                {/* Add Inventory Button */}
                <button
                  onClick={() => {
                    if (!user?.branch && !isAdmin) {
                      alert(
                        "Cannot determine your branch. Please login again."
                      );
                      return;
                    }

                    if (isAdmin && !selectedBranch) {
                      alert("Please select a branch first!");
                      return;
                    }

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
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center whitespace-nowrap"
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

            {/* Inventory Table */}
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
                      <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide">
                        Branch
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
                    {/* Calculate pagination for inventory items */}
                    {(() => {
                      const inventoryIndexOfLastItem =
                        currentPage * itemsPerPage;
                      const inventoryIndexOfFirstItem =
                        inventoryIndexOfLastItem - itemsPerPage;
                      const currentInventoryItems = Array.isArray(
                        filteredInventory
                      )
                        ? filteredInventory.slice(
                            inventoryIndexOfFirstItem,
                            inventoryIndexOfLastItem
                          )
                        : [];
                      const inventoryTotalPages = Math.ceil(
                        (Array.isArray(filteredInventory)
                          ? filteredInventory.length
                          : 0) / itemsPerPage
                      );

                      return (
                        <>
                          {currentInventoryItems.map((item) => (
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
                                    : parseFloat(
                                        item.current_stock || 0
                                      ).toFixed(2)}{" "}
                                  {item.display_unit || item.unit}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {typeof item.min_stock === "number"
                                  ? item.min_stock.toFixed(2)
                                  : parseFloat(item.min_stock || 0).toFixed(
                                      2
                                    )}{" "}
                                {item.display_unit || item.unit}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {item.display_unit || item.unit}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-green-900">
                                {item.price > 0 ? (
                                  <>₱{parseFloat(item.price || 0).toFixed(2)}</>
                                ) : (
                                  <span className="text-gray-400">
                                    No price
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-blue-900">
                                {item.total_price > 0 ? (
                                  <>
                                    ₱
                                    {parseFloat(item.total_price || 0).toFixed(
                                      2
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                    isAdmin
                                      ? item.branch === user.branch
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {item.branch || user.branch}
                                </span>
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
                                    onClick={() =>
                                      handleDeleteInventoryClick(item)
                                    }
                                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}

                          {currentInventoryItems.length === 0 && (
                            <tr>
                              <td colSpan="11" className="text-center py-12">
                                <p className="text-gray-500 font-medium">
                                  {inventorySearch
                                    ? "No inventory items found matching your search"
                                    : "No inventory items available"}
                                </p>
                                {!inventorySearch && (
                                  <p className="text-gray-400 text-sm mt-1">
                                    {isAdmin
                                      ? selectedBranch === "all"
                                        ? "No inventory items found in any branch"
                                        : `No inventory items available in branch: ${selectedBranch}`
                                      : `Add your first inventory item to branch: ${user.branch}`}
                                  </p>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* INVENTORY PAGINATION */}
              {filteredInventory.length > 0 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {Math.min(
                        (currentPage - 1) * itemsPerPage + 1,
                        filteredInventory.length
                      )}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredInventory.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {filteredInventory.length}
                    </span>{" "}
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
                      Page {currentPage} of{" "}
                      {Math.ceil(filteredInventory.length / itemsPerPage)}
                    </div>
                    <button
                      onClick={handleNextPage}
                      disabled={
                        currentPage ===
                        Math.ceil(filteredInventory.length / itemsPerPage)
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentPage ===
                        Math.ceil(filteredInventory.length / itemsPerPage)
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

        {/* Add/Edit Product Modal */}
        {showFormModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingItem ? "Edit Product" : "Add New Product"}
              </h2>

              {/* BRANCH INFO IN MODAL */}
              <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                {isAdmin ? (
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Select Branch for this Product *
                    </label>
                    <select
                      value={
                        newItem.branch ||
                        (selectedBranch === "all"
                          ? user.branch
                          : selectedBranch)
                      }
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          branch: e.target.value,
                        })
                      }
                      className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {allBranches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}{" "}
                          {branch === user.branch ? "(Your Branch)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-sm text-blue-700 font-medium">
                    This product will be added to:{" "}
                    <span className="font-bold">{user.branch}</span> branch
                  </p>
                )}
              </div>

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
                      setNewItem({ ...newItem, name: e.target.value })
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
                      setNewItem({ ...newItem, category: e.target.value })
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
                        setNewItem({ ...newItem, price: e.target.value });
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
                      setNewItem({ ...newItem, image: e.target.value })
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

              {/* BRANCH INFO IN MODAL */}
              <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                {isAdmin ? (
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Select Branch for this Inventory Item *
                    </label>
                    <select
                      value={
                        newInventoryItem.branch ||
                        (selectedBranch === "all"
                          ? user.branch
                          : selectedBranch)
                      }
                      onChange={(e) =>
                        setNewInventoryItem({
                          ...newInventoryItem,
                          branch: e.target.value,
                        })
                      }
                      className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {allBranches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}{" "}
                          {branch === user.branch ? "(Your Branch)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-sm text-blue-700 font-medium">
                    This inventory item will be added to:{" "}
                    <span className="font-bold">{user.branch}</span> branch
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Code *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter product code"
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
                      placeholder="0.00"
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

                {/* Total Price Display */}
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
                    <strong>Note:</strong> Price is optional.
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

        {/* Stock Transaction Modal */}
        {showStockModal && selectedInventory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">
                Stock Management - {selectedInventory.name}
              </h2>

              {/* BRANCH INFO */}
              {selectedInventory.branch && (
                <div className="mb-3 bg-blue-50 p-2 rounded-lg">
                  <p className="text-xs text-blue-700">
                    Branch: <strong>{selectedInventory.branch}</strong>
                  </p>
                </div>
              )}

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

                {/* Calculations */}
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
                <p className="text-center text-xs text-gray-500 mt-1">
                  Branch: <strong>{itemToDelete.branch || user?.branch}</strong>
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
                <p className="text-center text-xs text-gray-500 mt-1">
                  Branch:{" "}
                  <strong>{inventoryToDelete.branch || user?.branch}</strong>
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
              {selectedBranch && isAdmin && (
                <p className="text-center text-sm text-blue-600 mb-2">
                  Branch:{" "}
                  <strong>
                    {selectedBranch === "all" ? "All Branches" : selectedBranch}
                  </strong>
                </p>
              )}
              {!isAdmin && user?.branch && (
                <p className="text-center text-sm text-blue-600 mb-2">
                  Branch: <strong>{user.branch}</strong>
                </p>
              )}
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
                {viewItem.branch && (
                  <p className="text-gray-700">
                    <strong className="text-gray-900">Branch:</strong>{" "}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isAdmin && viewItem.branch === user.branch
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {viewItem.branch}
                      {isAdmin && viewItem.branch === user.branch && (
                        <span className="ml-1">(Current)</span>
                      )}
                    </span>
                  </p>
                )}
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
