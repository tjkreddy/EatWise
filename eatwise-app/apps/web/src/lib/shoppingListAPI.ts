import { authAPI } from "./authAPI";

export interface ShoppingItem {
  id: number;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  purchased: boolean;
  purchased_at?: string;
  created_at?: string;
}

export interface AddShoppingItemRequest {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
}

export interface UpdateShoppingItemRequest {
  purchased?: boolean;
  quantity?: number;
  unit?: string;
  category?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const makeAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${authAPI.getToken()}`,
});

export const shoppingListAPI = {
  getItems: async (): Promise<ShoppingItem[]> => {
    const response = await fetch(`${API_BASE_URL}/api/shopping-list`, {
      method: "GET",
      headers: makeAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        (await response.text()) || "Failed to fetch shopping items",
      );
    }

    return response.json();
  },

  addItem: async (item: AddShoppingItemRequest): Promise<ShoppingItem> => {
    const response = await fetch(`${API_BASE_URL}/api/shopping-list`, {
      method: "POST",
      headers: makeAuthHeaders(),
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error((await response.text()) || "Failed to add shopping item");
    }

    return response.json();
  },

  updateItem: async (
    id: number,
    updates: UpdateShoppingItemRequest,
  ): Promise<ShoppingItem> => {
    const response = await fetch(`${API_BASE_URL}/api/shopping-list/${id}`, {
      method: "PUT",
      headers: makeAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(
        (await response.text()) || "Failed to update shopping item",
      );
    }

    return response.json();
  },

  deleteItem: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/shopping-list/${id}`, {
      method: "DELETE",
      headers: makeAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        (await response.text()) || "Failed to delete shopping item",
      );
    }
  },

  clearPurchased: async (): Promise<{
    message: string;
    deleted_count: number;
  }> => {
    const response = await fetch(
      `${API_BASE_URL}/api/shopping-list/clear-purchased`,
      {
        method: "DELETE",
        headers: makeAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        (await response.text()) || "Failed to clear purchased items",
      );
    }

    return response.json();
  },

  markPurchased: async (id: number): Promise<ShoppingItem> => {
    return shoppingListAPI.updateItem(id, { purchased: true });
  },

  markUnpurchased: async (id: number): Promise<ShoppingItem> => {
    return shoppingListAPI.updateItem(id, { purchased: false });
  },
};
