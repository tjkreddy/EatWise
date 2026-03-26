import { describe, it, expect, beforeEach, vi } from "vitest";
import { shoppingListAPI } from "../lib/shoppingListAPI";

describe("shoppingListAPI", () => {
  const mockToken = "test-token-123";
  const mockItem = {
    id: 1,
    name: "Milk",
    quantity: 1,
    unit: "liters",
    category: "Dairy",
    purchased: false,
    created_at: "2026-03-25T00:00:00Z",
  };

  beforeEach(() => {
    localStorage.setItem("token", mockToken);
    vi.clearAllMocks();
  });

  describe("getItems", () => {
    it("should fetch shopping list items", async () => {
      const mockItems = [mockItem];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockItems),
        })
      ) as any;

      const items = await shoppingListAPI.getItems();

      expect(items).toEqual(mockItems);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/shopping-list"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it("should throw an error when fetch fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Failed to fetch"),
        })
      ) as any;

      await expect(shoppingListAPI.getItems()).rejects.toThrow(
        "Failed to fetch"
      );
    });
  });

  describe("addItem", () => {
    it("should add a new shopping list item", async () => {
      const newItem = {
        name: "Bread",
        quantity: 2,
        unit: "pieces",
        category: "Bakery",
      };

      const response = { id: 2, ...newItem, purchased: false };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        })
      ) as any;

      const result = await shoppingListAPI.addItem(newItem);

      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/shopping-list"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(newItem),
        })
      );
    });

    it("should throw an error when add fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Failed to add item"),
        })
      ) as any;

      await expect(
        shoppingListAPI.addItem({
          name: "Test",
          quantity: 1,
        })
      ).rejects.toThrow("Failed to add item");
    });
  });

  describe("updateItem", () => {
    it("should update a shopping list item", async () => {
      const updates = { purchased: true };
      const updatedItem = { ...mockItem, purchased: true };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(updatedItem),
        })
      ) as any;

      const result = await shoppingListAPI.updateItem(1, updates);

      expect(result).toEqual(updatedItem);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/shopping-list/1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(updates),
        })
      );
    });
  });

  describe("deleteItem", () => {
    it("should delete a shopping list item", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
        })
      ) as any;

      await shoppingListAPI.deleteItem(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/shopping-list/1"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("should throw an error when delete fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Failed to delete"),
        })
      ) as any;

      await expect(shoppingListAPI.deleteItem(1)).rejects.toThrow(
        "Failed to delete"
      );
    });
  });

  describe("markPurchased", () => {
    it("should mark item as purchased", async () => {
      const purchasedItem = { ...mockItem, purchased: true };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(purchasedItem),
        })
      ) as any;

      const result = await shoppingListAPI.markPurchased(1);

      expect(result.purchased).toBe(true);
    });
  });

  describe("markUnpurchased", () => {
    it("should mark item as unpurchased", async () => {
      const unpurchasedItem = { ...mockItem, purchased: false };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(unpurchasedItem),
        })
      ) as any;

      const result = await shoppingListAPI.markUnpurchased(1);

      expect(result.purchased).toBe(false);
    });
  });
});
