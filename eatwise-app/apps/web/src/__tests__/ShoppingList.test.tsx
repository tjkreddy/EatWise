import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ShoppingList from "../pages/ShoppingList";
import * as authAPIModule from "../lib/authAPI";
import * as shoppingListAPIModule from "../lib/shoppingListAPI";

// Mock APIs
vi.mock("../lib/authAPI", () => ({
  authAPI: {
    getUser: vi.fn(),
    logout: vi.fn(),
    getToken: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

vi.mock("../lib/shoppingListAPI", () => ({
  shoppingListAPI: {
    getItems: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    markPurchased: vi.fn(),
    markUnpurchased: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ShoppingList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Mock authenticated user
    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue({
      id: "user-123",
      email: "test@example.com",
    });

    // Mock empty shopping list
    vi.mocked(shoppingListAPIModule.shoppingListAPI.getItems).mockResolvedValue(
      [],
    );
  });

  it("should render shopping list page when user is authenticated", async () => {
    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    // Wait for items to load
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: /shopping list/i }),
      ).toBeDefined();
    });
  });

  it("should redirect to login if user is not authenticated", () => {
    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue(null);

    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should fetch shopping list items on mount", async () => {
    const mockItems = [
      {
        id: 1,
        name: "Milk",
        quantity: 1,
        unit: "liters",
        category: "Dairy",
        purchased: false,
      },
    ];

    vi.mocked(shoppingListAPIModule.shoppingListAPI.getItems).mockResolvedValue(
      mockItems,
    );

    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(shoppingListAPIModule.shoppingListAPI.getItems).toHaveBeenCalled();
    });
  });

  it("should handle loading state", async () => {
    vi.mocked(
      shoppingListAPIModule.shoppingListAPI.getItems,
    ).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    // Component should render without crashing
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
  });

  it("should handle fetch error", async () => {
    vi.mocked(shoppingListAPIModule.shoppingListAPI.getItems).mockRejectedValue(
      new Error("Failed to fetch"),
    );

    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/failed to fetch/i) || screen.getByText(/error/i),
      ).toBeDefined();
    });
  });

  it("should display logout button", async () => {
    vi.mocked(shoppingListAPIModule.shoppingListAPI.getItems).mockResolvedValue(
      [],
    );

    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const logoutBtn = screen.queryByRole("button", { name: /logout/i });
      expect(logoutBtn).toBeDefined();
    });
  });

  it("should navigate to login on logout", async () => {
    vi.mocked(shoppingListAPIModule.shoppingListAPI.getItems).mockResolvedValue(
      [],
    );

    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const logoutBtn = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutBtn);
    });

    expect(authAPIModule.authAPI.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should show add item button", async () => {
    vi.mocked(shoppingListAPIModule.shoppingListAPI.getItems).mockResolvedValue(
      [],
    );

    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add item/i })).toBeDefined();
    });
  });

  it("should add new item to shopping list", async () => {
    const newItem = {
      id: 1,
      name: "Milk",
      quantity: 1,
      unit: "liters",
      category: "Dairy",
      purchased: false,
    };

    vi.mocked(shoppingListAPIModule.shoppingListAPI.addItem).mockResolvedValue(
      newItem,
    );
    vi.mocked(shoppingListAPIModule.shoppingListAPI.getItems).mockResolvedValue(
      [],
    );

    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: /shopping list/i }),
      ).toBeDefined();
    });

    const addButton = screen.getByRole("button", { name: /add item/i });
    fireEvent.click(addButton);

    // The form should appear after clicking add.
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/milk, tomatoes, bread/i),
      ).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText(/milk, tomatoes, bread/i), {
      target: { value: "Milk" },
    });
    fireEvent.change(screen.getByPlaceholderText(/amount/i), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() => {
      expect(shoppingListAPIModule.shoppingListAPI.addItem).toHaveBeenCalled();
    });
  });

  it("should display shopping list items", async () => {
    const mockItems = [
      {
        id: 1,
        name: "Milk",
        quantity: 1,
        unit: "liters",
        category: "Dairy",
        purchased: false,
      },
      {
        id: 2,
        name: "Bread",
        quantity: 2,
        unit: "pieces",
        category: "Bakery",
        purchased: false,
      },
    ];

    vi.mocked(shoppingListAPIModule.shoppingListAPI.getItems).mockResolvedValue(
      mockItems,
    );

    render(
      <BrowserRouter>
        <ShoppingList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Milk")).toBeDefined();
      expect(screen.getByText("Bread")).toBeDefined();
    });
  });
});
