import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../lib/authAPI";
import type { PantryItem } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const PantryList: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PantryItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const userData = authAPI.getUser();
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchItems = async () => {
      try {
        setError(null);
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

        const data = await response.json();
        const mapped: PantryItem[] = (data || []).map((item: any) => ({
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

        setItems(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch items");
      }
    };

    fetchItems();
  }, [user]);

  const filteredItems = useMemo(() => items, [items]);

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
      setError("Name is required");
      return;
    }

    if (Number.isNaN(newItem.quantity)) {
      setError("Quantity is required");
      return;
    }

    try {
      setError(null);
      const token = authAPI.getToken();
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
        throw new Error(errorText || "Failed to add item");
      }

      const saved = await response.json();
      setItems((prev) => [
        ...prev,
        {
          id: saved.id,
          name: saved.name,
          quantity: saved.quantity,
          unit: saved.unit,
          category: saved.category,
          expirationDate: saved.expiration_date || saved.expirationDate,
          addedDate: saved.created_at
            ? String(saved.created_at).split("T")[0]
            : new Date().toISOString().split("T")[0],
          notes: saved.notes,
        },
      ]);

      setShowAddForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    }
  };

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

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-amber-600">EatWise</span>
              <span className="text-gray-700 font-medium">Pantry List</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-700 hover:text-amber-600 text-sm font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate("/shopping-list")}
                className="text-gray-700 hover:text-amber-600 text-sm font-medium"
              >
                Shopping List
              </button>
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Pantry List</h1>
          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-medium"
          >
            {showAddForm ? "Cancel" : "+ Add Item"}
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddItem}
            className="mb-6 p-5 border border-amber-200 rounded bg-amber-50"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                name="name"
                placeholder="Item name"
                className="p-2 border rounded"
                required
              />
              <input
                name="quantity"
                type="number"
                placeholder="Quantity"
                className="p-2 border rounded"
                required
              />
              <select name="unit" className="p-2 border rounded" title="Unit">
                <option value="">Select unit</option>
                <option value="pieces">pieces</option>
                <option value="grams">grams</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="liters">liters</option>
                <option value="cups">cups</option>
                <option value="tbsp">tbsp</option>
                <option value="tsp">tsp</option>
                <option value="packets">packets</option>
              </select>
              <select
                name="category"
                className="p-2 border rounded"
                title="Category"
              >
                <option value="">Select category</option>
                <option value="Dairy">Dairy</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Grains">Grains</option>
                <option value="Meat">Meat</option>
                <option value="Condiments">Condiments</option>
                <option value="Snacks">Snacks</option>
                <option value="Beverages">Beverages</option>
                <option value="Frozen">Frozen</option>
                <option value="Uncategorized">Uncategorized</option>
              </select>
              <input
                name="expirationDate"
                type="date"
                title="Expiration date"
                className="p-2 border rounded"
              />
              <input
                name="notes"
                placeholder="Notes"
                className="p-2 border rounded"
              />
            </div>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Save Item
            </button>
          </form>
        )}

        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded"
            >
              <div>
                <div className="font-semibold text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-600">
                  {item.quantity} {item.unit || "units"}
                  {item.category ? ` • ${item.category}` : ""}
                  {item.expirationDate
                    ? ` • Expires ${item.expirationDate}`
                    : ""}
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                Delete
              </button>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-gray-600 border border-dashed rounded">
              No pantry items yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PantryList;
