import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../lib/authAPI";
import {
  householdAPI,
  type Household,
  type HouseholdMember as APIHouseholdMember,
} from "../lib/householdAPI";
import type {
  PantryItem,
  AlertItem,
  DashboardStats,
  HouseholdMember,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const alerts = useMemo<AlertItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pantryItems
      .filter((item) => item.expirationDate)
      .map((item) => {
        const expiry = new Date(item.expirationDate as string);
        const daysUntilExpiry = Math.ceil(
          (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        let severity: AlertItem["severity"] = "info";
        if (daysUntilExpiry <= 2) severity = "critical";
        else if (daysUntilExpiry <= 7) severity = "warning";
        return {
          id: item.id,
          itemId: item.id,
          itemName: item.name,
          expirationDate: item.expirationDate as string,
          daysUntilExpiry,
          severity,
        };
      });
  }, [pantryItems]);

  const stats = useMemo<DashboardStats>(() => {
    const expiredItems = alerts.filter((a) => a.daysUntilExpiry < 0).length;
    return {
      totalItems: pantryItems.length,
      expiringInWeek: alerts.length,
      expiredItems,
      householdMembers: members.length,
    };
  }, [alerts, members.length, pantryItems.length]);

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

  // Fetch household data
  useEffect(() => {
    if (!user) return;

    const fetchHousehold = async () => {
      try {
        setHouseholdError(null);
        const response = await householdAPI.getMyHousehold();
        if (response.household) {
          setHousehold(response.household);
          const myMembership = (response.members || []).find(
            (member) =>
              member.user_id === user.id || member.email === user.email,
          );
          setCurrentUserRole(
            myMembership?.role === "owner" ? "owner" : "member",
          );

          // Set members from response
          const householdMembers: HouseholdMember[] = (
            response.members || []
          ).map((member: APIHouseholdMember) => ({
            id: member.user_id,
            name: member.full_name || member.email.split("@")[0],
            email: member.email,
            role: member.role === "owner" ? "owner" : "member",
            joinedDate: new Date().toISOString().split("T")[0],
            avatarColor: generateAvatarColor(member.email),
          }));
          setMembers(householdMembers);
        } else {
          // Fallback: set current user as member if no household
          setMembers([
            {
              id: user.id,
              name: user.full_name || user.email.split("@")[0],
              email: user.email,
              role: "owner",
              joinedDate: new Date().toISOString().split("T")[0],
              avatarColor: generateAvatarColor(user.email),
            },
          ]);
        }
      } catch (error) {
        console.error("Error fetching household:", error);
        setHouseholdError(
          error instanceof Error ? error.message : "Failed to load household",
        );
        // Fallback: set current user as member on error
        setMembers([
          {
            id: user.id,
            name: user.full_name || user.email.split("@")[0],
            email: user.email,
            role: "owner",
            joinedDate: new Date().toISOString().split("T")[0],
            avatarColor: generateAvatarColor(user.email),
          },
        ]);
      } finally {
        setHouseholdLoading(false);
      }
    };

    fetchHousehold();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchItems = async () => {
      try {
        const token = authAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/api/pantry/items`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch pantry items");
        }
        const items = await response.json();
        const mappedItems: PantryItem[] = (items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || undefined,
          category: item.category || undefined,
          expirationDate:
            item.expiration_date || item.expirationDate || undefined,
          addedDate: item.created_at
            ? String(item.created_at).split("T")[0]
            : item.addedDate,
          notes: item.notes || undefined,
        }));
        setPantryItems(mappedItems);
      } catch (error) {
        console.error("Error fetching pantry items:", error);
      }
    };
    fetchItems();
  }, [user]);

  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
  };

  const generateAvatarColor = (email: string): string => {
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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

  const handleDelete = async (id: number) => {
    try {
      const token = authAPI.getToken();
      const response = await fetch(`${API_BASE_URL}/api/pantry/items/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      setPantryItems(pantryItems.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item from pantry");
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem = {
      name: formData.get("name") as string,
      quantity: parseInt(formData.get("quantity") as string),
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
      expirationDate: (formData.get("expirationDate") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    if (!newItem.name?.trim()) {
      alert("Name is required");
      return;
    }

    if (Number.isNaN(newItem.quantity)) {
      alert("Quantity is required");
      return;
    }

    try {
      const token = authAPI.getToken();
      if (!token) {
        alert("You must be logged in to add items");
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/pantry/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newItem.name,
          quantity: newItem.quantity,
          unit: newItem.unit,
          category: newItem.category,
          expiration_date: newItem.expirationDate || "",
          notes: newItem.notes,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to add item (${response.status})`);
      }

      const savedItem = await response.json();
      const mappedItem: PantryItem = {
        id: savedItem.id || 0,
        name: savedItem.name || newItem.name,
        quantity: savedItem.quantity ?? newItem.quantity,
        unit: savedItem.unit || newItem.unit,
        category: savedItem.category || newItem.category,
        expirationDate:
          savedItem.expiration_date ||
          savedItem.expirationDate ||
          newItem.expirationDate,
        addedDate: savedItem.created_at
          ? String(savedItem.created_at).split("T")[0]
          : new Date().toISOString().split("T")[0],
        notes: savedItem.notes || newItem.notes,
      };
      setPantryItems([...pantryItems, mappedItem]);
      setShowAddForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error adding item:", error);
      alert(
        error instanceof Error ? error.message : "Failed to add item to pantry",
      );
    }
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

  const wasteScore = Math.min(100, 90 - stats.expiredItems * 5);
  const estimatedSavings = (pantryItems.length * 2.5).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-64 h-screen bg-white border-r border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold">
            E
          </div>
          <div>
            <div className="font-bold text-lg text-gray-900">EatWise</div>
            <div className="text-xs text-gray-500">Organic Curator</div>
          </div>
        </div>
        
        <nav className="space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-lg bg-green-50 text-green-700 font-medium flex items-center gap-3">
            <span>📊</span> Dashboard
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-3">
            <span>📝</span> Pantry List
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-3">
            <span>🛒</span> Grocery List
          </button>
        </nav>
      </aside>

      <div className="ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search your pantry..."
                className="w-full px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="flex items-center gap-6">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <span className="text-xl">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <div className="font-semibold text-gray-900">{user?.email?.split("@")[0] || "User"}</div>
                  <div className="text-xs text-gray-500">Pantry Master</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="p-8">
          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Good morning, {user?.email?.split("@")[0] || "User"}</h1>
            <p className="text-gray-600 mt-1">Your pantry is {wasteScore}% fresh today. Let's minimize some waste.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Total Items Card */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <p className="text-sm text-gray-600">TOTAL ITEMS</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{stats.totalItems}</p>
            </div>

            {/* Members Card */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <p className="text-sm text-gray-600">HOUSEHOLD</p>
              <p className="text-lg font-bold text-gray-900 mt-2">{household?.name || "Personal"}</p>
              <p className="text-sm text-gray-600 mt-2">{stats.householdMembers} {stats.householdMembers === 1 ? "member" : "members"}</p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pantry Overview + Inventory */}
            <div className="lg:col-span-2 space-y-8">
              {/* Pantry Overview by Category */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Pantry Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: "Grains", icon: "🌾", count: pantryItems.filter(i => i.category === "Grains").length },
                    { name: "Dairy", icon: "🥛", count: pantryItems.filter(i => i.category === "Dairy").length },
                    { name: "Vegetables", icon: "🥬", count: pantryItems.filter(i => i.category === "Vegetables").length },
                    { name: "Fruits", icon: "🍎", count: pantryItems.filter(i => i.category === "Fruits").length },
                    { name: "Spices", icon: "🌶️", count: pantryItems.filter(i => i.category === "Condiments").length },
                    { name: "Meat", icon: "🍗", count: pantryItems.filter(i => i.category === "Meat").length },
                  ].map((cat) => (
                    <div
                      key={cat.name}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 text-center hover:shadow-md transition cursor-pointer"
                    >
                      <div className="text-4xl mb-2">{cat.icon}</div>
                      <div className="font-semibold text-gray-900 text-sm">{cat.name}</div>
                      <div className="text-2xl font-bold text-gray-700 mt-1">{cat.count}</div>
                      <div className="text-xs text-gray-600">Items</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Item Button */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center gap-2"
                >
                  <span className="text-xl">+</span> Add New Item
                </button>
              </div>

              {/* Add Item Form */}
              {showAddForm && (
                <div className="bg-white rounded-lg p-6 border-2 border-green-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Item</h3>
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                        <input
                          name="name"
                          placeholder="e.g., Milk, Tomatoes"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                          name="quantity"
                          type="number"
                          placeholder="Amount"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                        <select name="unit" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option>pieces</option>
                          <option>grams</option>
                          <option>kg</option>
                          <option>liters</option>
                          <option>cups</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select name="category" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option value="Uncategorized">Uncategorized</option>
                          <option>Dairy</option>
                          <option>Vegetables</option>
                          <option>Meat</option>
                          <option>Fruits</option>
                          <option>Grains</option>
                          <option>Condiments</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                        <input name="expirationDate" type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600">Add Item</button>
                      <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-300">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Recent Items */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Recent Items</h2>
                  <button className="text-green-600 font-semibold text-sm hover:text-green-700">View All</button>
                </div>

                <div className="space-y-3">
                  {pantryItems.slice(0, 5).map((item) => {
                    const status = getExpiryStatus(item.expirationDate);
                    return (
                      <div key={item.id} className={`flex items-center justify-between p-4 rounded-lg ${status.color} border border-gray-200`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getCategoryEmoji(item.category)}</span>
                          <div>
                            <div className="font-semibold text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-600">{item.quantity} {item.unit}</div>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xl">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-8">
              {/* Smart Expiry Alerts */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Smart Expiry Alerts</h2>
                <div className="space-y-3">
                  {alerts.filter(a => a.severity !== "info").slice(0, 4).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.severity === "critical"
                          ? "bg-red-50 border-red-400 border"
                          : alert.severity === "warning"
                          ? "bg-yellow-50 border-yellow-400 border"
                          : "bg-blue-50 border-blue-400 border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{alert.itemName}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {alert.daysUntilExpiry <= 0
                              ? "Expired"
                              : `${alert.daysUntilExpiry} days left`}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            alert.severity === "critical"
                              ? "bg-red-600 text-white"
                              : alert.severity === "warning"
                              ? "bg-yellow-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {alert.severity === "critical" ? "EXPIRES TODAY" : alert.severity === "warning" ? "2 DAYS LEFT" : "FRESH"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {alerts.filter(a => a.severity !== "info").length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">All items are still fresh!</p>
                  )}
                </div>
              </div>

              {/* Household Members */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Household Members</h2>
                <div className="space-y-3">
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
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </div>
                      {(member.role === "admin" || member.role === "owner") && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
                          {member.role === "owner" ? "Owner" : "Admin"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite Code */}
              {household && (
                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-6 border border-green-200">
                  <h3 className="font-bold text-gray-900 mb-3">Share Invite Code</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={household.invite_code}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg font-mono text-sm text-green-900"
                    />
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(household.invite_code);
                          alert("Code copied!");
                        } catch {
                          alert("Failed to copy");
                        }
                      }}
                      className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
