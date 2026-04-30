import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PantryList from "../pages/PantryList";
import * as authAPIModule from "../lib/authAPI";

// Mock APIs
vi.mock("../lib/authAPI", () => ({
  authAPI: {
    getUser: vi.fn(),
    logout: vi.fn(),
    getToken: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("PantryList", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
  };

  const mockItems = [
    {
      id: 1,
      name: "Milk",
      quantity: 2,
      unit: "liters",
      category: "Dairy",
      expirationDate: "2026-05-01",
      addedDate: "2026-03-25",
      notes: "Fresh milk",
    },
    {
      id: 2,
      name: "Bread",
      quantity: 1,
      unit: "loaf",
      category: "Bakery",
      expirationDate: "2026-03-30",
      addedDate: "2026-03-25",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue(mockUser);
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("test-token");

    // Mock successful fetch
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockItems),
    } as any);
  });

  it("should render pantry list page when user is authenticated", async () => {
    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pantry List").length).toBeGreaterThan(0);
    });
  });

  it("should redirect to login if user is not authenticated", () => {
    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue(null);

    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should fetch pantry items on mount", async () => {
    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/pantry/items"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });
  });

  it("should display pantry items", async () => {
    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Milk")).toBeDefined();
      expect(screen.getByText("Bread")).toBeDefined();
    });
  });

  it("should show item details", async () => {
    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Quantity:\s*2\s*liters/i)).toBeDefined();
      expect(screen.getByText(/Category:\s*Dairy/i)).toBeDefined();
      expect(screen.getAllByText(/Expires:/)[0]).toBeDefined();
    });
  });

  it("should show add item form when button is clicked", async () => {
    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const addButton = screen.getByText("+ Add Item");
      fireEvent.click(addButton);
    });

    expect(screen.getByPlaceholderText(/milk, chicken breast/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/e.g., 2/i)).toBeDefined();
  });

  it("should add new item to pantry list", async () => {
    const newItem = {
      id: 3,
      name: "Apples",
      quantity: 5,
      unit: "pieces",
      category: "Fruits",
      expiration_date: "2026-04-01",
      created_at: "2026-03-25T00:00:00Z",
    };

    vi.mocked(global.fetch).mockImplementation((url, options) => {
      if (options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(newItem),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockItems),
      } as any);
    });

    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const addButton = screen.getByText("+ Add Item");
      fireEvent.click(addButton);
    });

    fireEvent.change(screen.getByPlaceholderText(/milk, chicken breast/i), {
      target: { value: "Apples" },
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g., 2/i), {
      target: { value: "5" },
    });

    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => {
      expect(screen.getByText("Apples")).toBeDefined();
    });
  });

  it("should show edit form when edit button is clicked", async () => {
    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);
    });

    expect(screen.getByText("Edit Item: Milk")).toBeDefined();
    expect(screen.getByDisplayValue("Milk")).toBeDefined();
  });

  it("should update item when edit form is submitted", async () => {
    const updatedItem = {
      ...mockItems[0],
      name: "Updated Milk",
      quantity: 3,
    };

    vi.mocked(global.fetch).mockImplementation((url, options) => {
      if (options?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(updatedItem),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockItems),
      } as any);
    });

    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);
    });

    const nameInput = screen.getByDisplayValue("Milk");
    fireEvent.change(nameInput, { target: { value: "Updated Milk" } });

    const updateButton = screen.getByText("Update Item");
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText("Updated Milk")).toBeDefined();
    });
  });

  it("should delete item when delete button is clicked", async () => {
    vi.mocked(global.fetch).mockImplementation((url, options) => {
      if (options?.method === "DELETE") {
        return Promise.resolve({ ok: true } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockItems),
      } as any);
    });

    // Mock window.confirm
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.queryByText("Milk")).toBeNull();
    });
  });

  it("should show empty state when no items", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("No pantry items yet")).toBeDefined();
      expect(screen.getByText("Add Your First Item")).toBeDefined();
    });
  });

  it("should show error state when fetch fails", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeDefined();
    });
  });

  it("should highlight expired items", async () => {
    const expiredItems = [
      {
        ...mockItems[0],
        expirationDate: "2020-01-01", // Past date
      },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(expiredItems),
    } as any);

    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("EXPIRED")).toBeDefined();
    });
  });

  it("should highlight items expiring soon", async () => {
    const soonExpiringItems = [
      {
        ...mockItems[0],
        expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
      },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(soonExpiringItems),
    } as any);

    render(
      <BrowserRouter>
        <PantryList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("EXPIRING SOON")).toBeDefined();
    });
  });
});
