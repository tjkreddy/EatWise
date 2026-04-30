import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../lib/authAPI";
import { shoppingListAPI } from "../lib/shoppingListAPI";
import type { ShoppingItem } from "../types";

const ShoppingList: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [clearingPurchased, setClearingPurchased] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Check user and handle redirects
  useEffect(() => {
    const checkUser = () => {
      const userData = authAPI.getUser();
      if (!userData) {
        navigate("/login");
      } else {
        setUser(userData);
      }
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  // Fetch shopping list items
  useEffect(() => {
    if (!user) return;

    const fetchItems = async () => {
      try {
        setError(null);
        const fetchedItems = await shoppingListAPI.getItems();
        setItems(fetchedItems || []);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to fetch shopping list";
        setError(errorMsg);
        console.error("Error fetching shopping items:", err);
      }
    };

    fetchItems();
  }, [user]);

  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim();
    const quantityStr = formData.get("quantity") as string;
    const quantity = parseInt(quantityStr);

    const errors: Record<string, string> = {};

    if (!name) {
      errors.name = "Item name is required";
    } else if (name.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!quantityStr) {
      errors.quantity = "Quantity is required";
    } else if (isNaN(quantity) || quantity <= 0) {
      errors.quantity = "Quantity must be a positive number";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const unit = (formData.get("unit") as string) || undefined;
    const category = (formData.get("category") as string) || undefined;

    try {
      setError(null);
      const newItem = await shoppingListAPI.addItem({
        name,
        quantity,
        unit,
        category,
      });
      setItems([...items, newItem]);
      setShowAddForm(false);
      (e.target as HTMLFormElement).reset();
      showSuccess(`✓ "${newItem.name}" added to shopping list`);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to add item";
      setError(errorMsg);
      console.error("Error adding item:", err);
    }
  };

  const handleMarkPurchased = async (id: number, purchased: boolean) => {
    try {
      setError(null);
      const updatedItem = purchased
        ? await shoppingListAPI.markPurchased(id)
        : await shoppingListAPI.markUnpurchased(id);
      setItems(items.map((item) => (item.id === id ? updatedItem : item)));
      showSuccess(
        purchased
          ? `Marked "${updatedItem.name}" as purchased`
          : `Marked "${updatedItem.name}" as not purchased`,
      );
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update item";
      setError(errorMsg);
      console.error("Error updating item:", err);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      setError(null);
      await shoppingListAPI.deleteItem(id);
      const deletedItem = items.find((item) => item.id === id);
      setItems(items.filter((item) => item.id !== id));
      showSuccess(`Removed "${deletedItem?.name}" from shopping list`);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to delete item";
      setError(errorMsg);
      console.error("Error deleting item:", err);
    }
  };

  const handleClearPurchased = async () => {
    if (completedItems.length === 0) return;
    if (!window.confirm("Clear all purchased items from this shopping list?")) {
      return;
    }

    try {
      setClearingPurchased(true);
      setError(null);
      await shoppingListAPI.clearPurchased();
      const clearedCount = completedItems.length;
      setItems(items.filter((item) => !item.purchased));
      showSuccess(
        `Cleared ${clearedCount} purchased item${clearedCount !== 1 ? "s" : ""}`,
      );
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to clear purchased items";
      setError(errorMsg);
      console.error("Error clearing purchased items:", err);
    } finally {
      setClearingPurchased(false);
    }
  };

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-red-600">
          Error: User not found. Redirecting...
        </div>
      </div>
    );
  }

  const pendingItems = items.filter((item) => !item.purchased);
  const completedItems = items.filter((item) => item.purchased);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-amber-600">EatWise</span>
              <span className="ml-4 text-gray-600">Shopping List</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      </div>

      <div className="py-10">
        <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-gray-900">
            Shopping List
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Keep track of items to buy for your household.
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm font-medium">
              ✗ {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg text-green-800 text-sm font-medium">
              {successMessage}
            </div>
          )}

          {/* Add Item Form */}
          <div className="mb-8">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded font-medium transition-colors"
            >
              {showAddForm ? "Cancel" : "+ Add Item"}
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleAddItem}
              className="mb-8 p-6 bg-amber-50 rounded-lg border-2 border-amber-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add New Shopping Item
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    placeholder="e.g., Milk, Tomatoes, Bread"
                    className={`w-full p-2.5 border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${formErrors.name ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    required
                  />
                  {formErrors.name && (
                    <p className="text-red-600 text-xs mt-1">
                      {formErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    step="0.1"
                    placeholder="e.g., 2"
                    className={`w-full p-2.5 border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${formErrors.quantity ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    required
                  />
                  {formErrors.quantity && (
                    <p className="text-red-600 text-xs mt-1">
                      {formErrors.quantity}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    name="unit"
                    title="Unit"
                    className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select unit</option>
                    <option>pieces</option>
                    <option>grams</option>
                    <option>kilograms</option>
                    <option>liters</option>
                    <option>cups</option>
                    <option>tablespoons</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    title="Category"
                    className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Uncategorized</option>
                    <option>Dairy</option>
                    <option>Vegetables</option>
                    <option>Bakery</option>
                    <option>Meat</option>
                    <option>Beverages</option>
                    <option>Fruits</option>
                    <option>Pantry</option>
                    <option>Frozen</option>
                    <option>Condiments</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded font-medium transition"
                >
                  ✓ Add Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormErrors({});
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2.5 rounded font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2.5 rounded font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Pending Items */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
              <span className="text-amber-600">🛒</span>
              To Buy ({pendingItems.length})
            </h2>
            {pendingItems.length === 0 ? (
              <div className="p-8 bg-amber-50 rounded-lg border-2 border-dashed border-amber-200 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <p className="text-gray-600 text-lg font-medium mb-2">
                  All caught up!
                </p>
                <p className="text-gray-500 mb-4">
                  Your shopping list is empty. Add some items to get started.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded font-medium"
                >
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white rounded-lg border-2 border-amber-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleMarkPurchased(item.id, true)}
                        title="Mark as purchased"
                        className="mt-1 w-5 h-5 cursor-pointer text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">
                            {item.category || "Uncategorized"}
                          </span>
                          <h3 className="font-bold text-gray-800 flex-1">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.unit || "units"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 font-semibold text-sm opacity-60 hover:opacity-100 transition-opacity"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Items */}
          {completedItems.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Already Bought ({completedItems.length})
                </h2>
                <button
                  onClick={handleClearPurchased}
                  disabled={clearingPurchased}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {clearingPurchased ? "Clearing..." : "Clear All"}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-green-50 rounded-lg border-2 border-green-200 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleMarkPurchased(item.id, false)}
                        title="Mark as not purchased"
                        className="mt-1 w-5 h-5 cursor-pointer text-green-600 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                            {item.category || "Uncategorized"}
                          </span>
                          <h3 className="font-bold text-gray-600 line-through flex-1">
                            {item.name}
                          </h3>
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {item.quantity} {item.unit || "units"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 font-semibold text-sm opacity-60 hover:opacity-100 transition-opacity"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ShoppingList;
