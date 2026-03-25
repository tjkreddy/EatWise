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
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch shopping list";
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
    const formData = new FormData(e.currentTarget);
    
    const name = formData.get("name") as string;
    const quantity = parseInt(formData.get("quantity") as string);
    const unit = (formData.get("unit") as string) || undefined;
    const category = (formData.get("category") as string) || undefined;

    if (!name?.trim()) {
      setError("Item name is required");
      return;
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
      setError("Quantity must be a positive number");
      return;
    }

    try {
      setError(null);
      const newItem = await shoppingListAPI.addItem({
        name: name.trim(),
        quantity,
        unit,
        category,
      });
      setItems([...items, newItem]);
      setShowAddForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to add item";
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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update item";
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
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete item";
      setError(errorMsg);
      console.error("Error deleting item:", err);
    }
  };

  const getCategoryEmoji = (category?: string) => {
    const emojiMap: { [key: string]: string } = {
      Dairy: "🥛",
      Vegetables: "🥬",
      Bakery: "🍞",
      Meat: "🍗",
      Beverages: "🥤",
      Fruits: "🍎",
      Pantry: "🥫",
      Frozen: "🧊",
      Condiments: "🫙",
      Uncategorized: "📦",
    };
    return emojiMap[category || "Uncategorized"] || "📦";
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
          <h1 className="text-4xl font-extrabold text-gray-900">Shopping List</h1>
          <p className="mt-2 text-lg text-gray-600">
            Keep track of items to buy for your household.
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
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
              className="mb-8 p-6 bg-white rounded border-2 border-amber-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add New Shopping Item
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    name="name"
                    placeholder="e.g., Milk, Tomatoes, Bread"
                    className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    placeholder="Amount"
                    className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    name="unit"
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
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
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded font-semibold transition"
                >
                  Add Item
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
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              To Buy ({pendingItems.length})
            </h2>
            {pendingItems.length === 0 ? (
              <div className="p-8 bg-gray-50 rounded border border-gray-200 text-center">
                <p className="text-gray-600">No items to buy!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingItems.map((item) => (
                  <div key={item.id} className="p-4 bg-white rounded border border-gray-200">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleMarkPurchased(item.id, true)}
                        className="mt-1 w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">
                            {getCategoryEmoji(item.category)}
                          </span>
                          <h3 className="font-bold text-gray-800">{item.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.unit || "units"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 font-bold text-lg"
                      >
                        ✕
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
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Already Bought ({completedItems.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedItems.map((item) => (
                  <div key={item.id} className="p-4 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleMarkPurchased(item.id, false)}
                        className="mt-1 w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">
                            {getCategoryEmoji(item.category)}
                          </span>
                          <h3 className="font-bold text-gray-500 line-through">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500">
                          {item.quantity} {item.unit || "units"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 font-bold text-lg"
                      >
                        ✕
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
