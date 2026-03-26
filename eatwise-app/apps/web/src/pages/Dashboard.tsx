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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(true);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<
    "owner" | "member" | null
  >(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold text-amber-600">
                  EatWise
                </span>
              </div>
              {household && (
                <div className="text-gray-700">
                  <span className="font-semibold">{household.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/shopping-list")}
                className="text-gray-700 hover:text-amber-600 text-sm font-medium transition"
              >
                Shopping List
              </button>
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
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalItems}
              </p>
            </div>
            <div className="bg-gray-50 rounded p-6">
              <p className="text-gray-600 text-sm font-medium">Expiring Soon</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {stats.expiringInWeek}
              </p>
            </div>
            <div className="bg-gray-50 rounded p-6">
              <p className="text-gray-600 text-sm font-medium">Expired Items</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {stats.expiredItems}
              </p>
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
                    className="mb-6 p-6 bg-white rounded border-2 border-amber-200"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Add New Item
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item Name *
                        </label>
                        <input
                          name="name"
                          placeholder="e.g., Milk, Tomatoes"
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
                          placeholder="Amount"
                          className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit *
                        </label>
                        <select
                          name="unit"
                          className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                          <option>pieces</option>
                          <option>grams</option>
                          <option>kilograms</option>
                          <option>liters</option>
                          <option>cups</option>
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
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiration Date
                        </label>
                        <input
                          name="expirationDate"
                          type="date"
                          className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          placeholder="Optional notes"
                          className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                          rows={2}
                        ></textarea>
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

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded p-6 border border-amber-200">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Invite to Household
                </h3>
                {!householdLoading && household ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Household Name
                      </p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {household.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-2">
                        Invite Code
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={household.invite_code}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded font-mono text-sm font-bold text-center text-amber-900"
                        />
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                household.invite_code,
                              );
                              alert("Invite code copied!");
                            } catch {
                              alert("Failed to copy invite code");
                            }
                          }}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors text-sm"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 italic">
                      Share this code with family members so they can join your
                      household.
                    </p>
                    {currentUserRole === "owner" ? (
                      <button
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Delete household \"${household.name}\"? This will remove all household data for every member.`,
                            )
                          ) {
                            return;
                          }
                          setDeleteLoading(true);
                          try {
                            await householdAPI.deleteHousehold();
                            navigate("/household/create");
                          } catch (err) {
                            alert(
                              err instanceof Error
                                ? err.message
                                : "Failed to delete household",
                            );
                          } finally {
                            setDeleteLoading(false);
                          }
                        }}
                        disabled={deleteLoading}
                        className="w-full mt-4 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleteLoading ? "Deleting..." : "Delete Household"}
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "Are you sure you want to leave this household?",
                            )
                          ) {
                            return;
                          }
                          setLeaveLoading(true);
                          try {
                            await householdAPI.leaveHousehold();
                            navigate("/household/create");
                          } catch (err) {
                            alert(
                              err instanceof Error
                                ? err.message
                                : "Failed to leave household",
                            );
                          } finally {
                            setLeaveLoading(false);
                          }
                        }}
                        disabled={leaveLoading}
                        className="w-full mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {leaveLoading ? "Leaving..." : "Leave Household"}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">
                    Loading household info...
                  </p>
                )}
              </div>

              <div className="bg-white rounded p-6 border border-gray-300">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Household Members
                </h3>
                {householdLoading && (
                  <div className="text-center py-4">
                    <p className="text-gray-600">Loading members...</p>
                  </div>
                )}
                {householdError && (
                  <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {householdError}
                  </div>
                )}
                {members.length === 0 && !householdLoading && (
                  <div className="text-center py-4">
                    <p className="text-gray-600 text-sm">No members yet</p>
                  </div>
                )}
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
                      {(member.role === "admin" || member.role === "owner") && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-semibold">
                          {member.role === "owner" ? "Owner" : "Admin"}
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
