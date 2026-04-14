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

const CATEGORY_KEYS = [
  "Dairy",
  "Vegetables",
  "Fruits",
  "Grains",
  "Meat",
  "Condiments",
  "Snacks",
  "Beverages",
  "Frozen",
  "Uncategorized",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

const normalizeCategory = (category?: string): CategoryKey => {
  const value = (category || "").trim().toLowerCase();

  if (!value || value === "uncategorized") return "Uncategorized";
  if (value === "dairy") return "Dairy";
  if (value === "vegetable" || value === "vegetables") return "Vegetables";
  if (value === "fruit" || value === "fruits") return "Fruits";
  if (value === "grain" || value === "grains") return "Grains";
  if (value === "meat" || value === "meats") return "Meat";
  if (
    value === "condiment" ||
    value === "condiments" ||
    value === "spice" ||
    value === "spices"
  ) {
    return "Condiments";
  }
  if (value === "snack" || value === "snacks") return "Snacks";
  if (
    value === "beverage" ||
    value === "beverages" ||
    value === "drink" ||
    value === "drinks"
  ) {
    return "Beverages";
  }
  if (value === "frozen") return "Frozen";

  return "Uncategorized";
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);

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

  const categoryCounts = useMemo<Record<CategoryKey, number>>(() => {
    const counts = CATEGORY_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: 0 }),
      {} as Record<CategoryKey, number>,
    );

    pantryItems.forEach((item) => {
      const key = normalizeCategory(item.category);
      counts[key] += 1;
    });

    return counts;
  }, [pantryItems]);

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
        setHouseholdLoading(true);
        setHouseholdError(null);
        const response = await householdAPI.getMyHousehold();
        if (response.household) {
          setHousehold(response.household);

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
          // No household found
          setHousehold(null);
          setMembers([]);
        }
      } catch (error) {
        console.error("Error fetching household:", error);
        setHouseholdError(
          error instanceof Error ? error.message : "Failed to load household"
        );
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

  const getAvatarColorClass = (color?: string): string => {
    if (color === "#FF6B6B") return "bg-red-400";
    if (color === "#4ECDC4") return "bg-teal-400";
    if (color === "#45B7D1") return "bg-sky-400";
    if (color === "#FFA07A") return "bg-orange-300";
    if (color === "#98D8C8") return "bg-emerald-300";
    return "bg-gray-400";
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
            Dashboard
          </button>
          <button
            onClick={() => navigate("/household/manage")}
            className="w-full text-left px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-3"
          >
            Manage Household
          </button>
          <button
            onClick={() => navigate("/pantry-list")}
            className="w-full text-left px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-3"
          >
            Pantry List
          </button>
          <button
            onClick={() => navigate("/shopping-list")}
            className="w-full text-left px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-3"
          >
            Shopping List
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
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <div className="font-semibold text-gray-900">
                    {user?.email?.split("@")[0] || "User"}
                  </div>
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
          {/* Greeting + Quick Stats */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              Good morning, {user?.email?.split("@")[0] || "User"}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-auto">
              <div className="bg-white rounded-lg p-5 border border-gray-200 min-w-[170px]">
                <p className="text-sm text-gray-600">TOTAL ITEMS</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalItems}
                </p>
              </div>

              <div className="bg-white rounded-lg p-5 border border-gray-200 min-w-[200px]">
                {householdLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mt-1"></div>
                  </div>
                ) : householdError ? (
                  <div>
                    <p className="text-sm text-gray-600">HOUSEHOLD</p>
                    <p className="text-lg font-bold text-red-600 mt-2">
                      Error loading
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {householdError}
                    </p>
                  </div>
                ) : household ? (
                  <div>
                    <p className="text-sm text-gray-600">HOUSEHOLD</p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      {household.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {stats.householdMembers}{" "}
                      {stats.householdMembers === 1 ? "member" : "members"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">HOUSEHOLD</p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      Personal
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {stats.householdMembers}{" "}
                      {stats.householdMembers === 1 ? "member" : "members"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate("/pantry-list")}
                className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                    📦
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Pantry List</div>
                    <div className="text-sm text-gray-600">
                      View and manage pantry items
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate("/shopping-list")}
                className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white">
                    🛒
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Shopping List
                    </div>
                    <div className="text-sm text-gray-600">
                      Plan your next grocery trip
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate("/household/manage")}
                className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white">
                    👥
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Manage Household
                    </div>
                    <div className="text-sm text-gray-600">
                      Invite members and settings
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pantry Overview + Inventory */}
            <div id="pantry-list-section" className="lg:col-span-2 space-y-8">
              {/* Pantry Overview by Category */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Pantry Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: "Dairy", key: "Dairy" },
                    { name: "Vegetables", key: "Vegetables" },
                    { name: "Fruits", key: "Fruits" },
                    { name: "Grains", key: "Grains" },
                    { name: "Meat", key: "Meat" },
                    { name: "Condiments", key: "Condiments" },
                    { name: "Snacks", key: "Snacks" },
                    { name: "Beverages", key: "Beverages" },
                    { name: "Frozen", key: "Frozen" },
                    { name: "Uncategorized", key: "Uncategorized" },
                  ].map((cat) => (
                    <div
                      key={cat.name}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 text-center hover:shadow-md transition cursor-pointer"
                    >
                      <div className="font-semibold text-gray-900 text-sm">
                        {cat.name}
                      </div>
                      <div className="text-2xl font-bold text-gray-700 mt-1">
                        {categoryCounts[cat.key as CategoryKey]}
                      </div>
                      <div className="text-xs text-gray-600">Items</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-8">
              {/* Expiry Notices */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Expiry Notices
                </h2>
                <div className="space-y-3">
                  {alerts
                    .filter((a) => a.severity !== "info")
                    .slice(0, 4)
                    .map((alert) => (
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
                            <div className="font-semibold text-gray-900">
                              {alert.itemName}
                            </div>
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
                            {alert.severity === "critical"
                              ? "EXPIRES TODAY"
                              : alert.severity === "warning"
                                ? "2 DAYS LEFT"
                                : "FRESH"}
                          </span>
                        </div>
                      </div>
                    ))}
                  {alerts.filter((a) => a.severity !== "info").length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">
                      All items are still fresh!
                    </p>
                  )}
                </div>
              </div>

              {/* Household Members */}
              <div
                id="household-section"
                className="bg-white rounded-lg p-6 border border-gray-200"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Household Members
                </h2>
                {householdLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : householdError ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">
                      Unable to load household members
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {householdError}
                    </p>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No household members</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColorClass(member.avatarColor)}`}
                        >
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-900">
                            {member.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.email}
                          </div>
                        </div>
                        {(member.role === "admin" || member.role === "owner") && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
                            {member.role === "owner" ? "Owner" : "Admin"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invite Code */}
              {household && (
                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-6 border border-green-200">
                  <h3 className="font-bold text-gray-900 mb-3">
                    Share Invite Code
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={household.invite_code}
                      readOnly
                      title="Household invite code"
                      placeholder="Invite code"
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg font-mono text-sm text-green-900"
                    />
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            household.invite_code,
                          );
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
