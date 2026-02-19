import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../lib/authAPI";
import type {
  PantryItem,
  AlertItem,
  DashboardStats,
  HouseholdMember,
} from "../types";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([
    {
      id: 1,
      name: "Milk",
      quantity: 2,
      unit: "liters",
      category: "Dairy",
      expirationDate: "2025-02-25",
      addedDate: "2025-02-18",
      notes: "Whole milk",
    },
    {
      id: 2,
      name: "Tomatoes",
      quantity: 4,
      unit: "pieces",
      category: "Vegetables",
      expirationDate: "2025-02-22",
      addedDate: "2025-02-16",
      notes: "Fresh from market",
    },
    {
      id: 3,
      name: "Bread",
      quantity: 1,
      unit: "loaf",
      category: "Bakery",
      expirationDate: "2025-02-20",
      addedDate: "2025-02-18",
      notes: "Whole wheat",
    },
    {
      id: 4,
      name: "Chicken Breast",
      quantity: 500,
      unit: "grams",
      category: "Meat",
      expirationDate: "2025-02-24",
      addedDate: "2025-02-17",
      notes: "Frozen",
    },
  ]);

  const [alerts] = useState<AlertItem[]>([
    {
      id: 1,
      itemId: 3,
      itemName: "Bread",
      expirationDate: "2025-02-20",
      daysUntilExpiry: 2,
      severity: "critical",
    },
    {
      id: 2,
      itemId: 2,
      itemName: "Tomatoes",
      expirationDate: "2025-02-22",
      daysUntilExpiry: 4,
      severity: "warning",
    },
  ]);

  const [members] = useState<HouseholdMember[]>([
    {
      id: 1,
      name: "You",
      email: "you@example.com",
      role: "admin",
      joinedDate: "2025-01-15",
      avatarColor: "#FF6B6B",
    },
    {
      id: 2,
      name: "Partner",
      email: "partner@example.com",
      role: "member",
      joinedDate: "2025-01-20",
      avatarColor: "#4ECDC4",
    },
  ]);

  const stats: DashboardStats = {
    totalItems: pantryItems.length,
    expiringInWeek: alerts.length,
    expiredItems: 0,
    householdMembers: members.length,
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

  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
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

  const categories = [
    "all",
    ...Array.from(
      new Set(pantryItems.map((item) => item.category || "Uncategorized")),
    ),
  ];
  const filteredItems =
    selectedCategory === "all"
      ? pantryItems
      : pantryItems.filter(
          (item) => (item.category || "Uncategorized") === selectedCategory,
        );

  const handleDelete = (id: number) => {
    setPantryItems(pantryItems.filter((item) => item.id !== id));
  };

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem: PantryItem = {
      id: Math.max(0, ...pantryItems.map((i) => i.id)) + 1,
      name: formData.get("name") as string,
      quantity: parseInt(formData.get("quantity") as string),
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
      expirationDate: (formData.get("expirationDate") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      addedDate: new Date().toISOString().split("T")[0],
    };
    setPantryItems([...pantryItems, newItem]);
    setShowAddForm(false);
    (e.target as HTMLFormElement).reset();
  };

  const getExpiryStatus = (expirationDate?: string) => {
    if (!expirationDate)
      return {
        status: "unknown",
        color: "bg-gray-100",
        textColor: "text-gray-700",
      };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0)
      return {
        status: "expired",
        color: "bg-gray-100",
        textColor: "text-gray-700",
      };
    if (daysUntilExpiry <= 2)
      return {
        status: "critical",
        color: "bg-red-50",
        textColor: "text-red-700",
      };
    if (daysUntilExpiry <= 7)
      return {
        status: "warning",
        color: "bg-yellow-50",
        textColor: "text-yellow-700",
      };
    return {
      status: "fresh",
      color: "bg-green-50",
      textColor: "text-green-700",
    };
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

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold text-amber-600">EatWise</span>
              </div>
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
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900">
              Welcome to Your Dashboard
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Manage your pantry, track expirations, and collaborate with your
              household.
            </p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 rounded p-6">
              <p className="text-gray-600 text-sm font-medium">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalItems}</p>
            </div>
            <div className="bg-gray-50 rounded p-6">
              <p className="text-gray-600 text-sm font-medium">Expiring Soon</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.expiringInWeek}</p>
            </div>
            <div className="bg-gray-50 rounded p-6">
              <p className="text-gray-600 text-sm font-medium">Expired Items</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.expiredItems}</p>
            </div>
            <div className="bg-gray-50 rounded p-6">
              <p className="text-gray-600 text-sm font-semibold uppercase">
                Members
              </p>
              <p className="text-4xl font-bold text-blue-600 mt-2">
                {stats.householdMembers}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded p-6 border border-gray-300">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Pantry Inventory
                  </h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    + Add Item
                  </button>
                </div>

                {showAddForm && (
                  <form
                    onSubmit={handleAddItem}
                    className="mb-6 p-4 bg-gray-50 rounded border border-gray-300"
                  >
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <input
                        name="name"
                        placeholder="Item name"
                        className="col-span-2 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
                        required
                      />
                      <input
                        name="quantity"
                        type="number"
                        placeholder="Quantity"
                        className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
                        required
                      />
                      <select name="unit" className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm">
                        <option>pieces</option>
                        <option>grams</option>
                        <option>kilograms</option>
                        <option>liters</option>
                        <option>cups</option>
                      </select>
                      <select
                        name="category"
                        className="col-span-2 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
                      >
                        <option value="Uncategorized">Uncategorized</option>
                        <option>Dairy</option>
                        <option>Vegetables</option>
                        <option>Bakery</option>
                        <option>Meat</option>
                        <option>Beverages</option>
                        <option>Fruits</option>
                        <option>Pantry</option>
                        <option>Frozen</option>
                      </select>
                      <input
                        name="expirationDate"
                        type="date"
                        className="col-span-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                      <textarea
                        name="notes"
                        placeholder="Notes (optional)"
                        className="col-span-2 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
                        rows={2}
                      ></textarea>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium transition"
                      >
                        Add Item
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded font-medium transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1 rounded text-sm font-medium transition ${
                        selectedCategory === cat
                          ? "bg-amber-600 text-white"
                          : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                      }`}
                    >
                      {cat === "all" ? "All Items" : cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.map((item) => {
                    const status = getExpiryStatus(item.expirationDate);
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded ${status.color}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">
                                {getCategoryEmoji(item.category)}
                              </span>
                              <h3 className="font-bold text-lg text-gray-800">
                                {item.name}
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600">
                              {item.quantity} {item.unit}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        {item.expirationDate && (
                          <p
                            className={`text-sm font-semibold mb-2 ${status.textColor}`}
                          >
                            Expires:{" "}
                            {new Date(item.expirationDate).toLocaleDateString()}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-gray-600 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded p-6 border border-gray-300">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Household Members
                </h3>
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {member.email}
                        </p>
                      </div>
                      {member.role === "admin" && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-semibold">
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
