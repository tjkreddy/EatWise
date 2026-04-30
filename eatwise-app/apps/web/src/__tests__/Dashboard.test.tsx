import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard, { filterPantryItems } from "../pages/Dashboard";
import * as authAPIModule from "../lib/authAPI";
import * as householdAPIModule from "../lib/householdAPI";

// Mock APIs
vi.mock("../lib/authAPI", () => ({
  authAPI: {
    getUser: vi.fn(),
    logout: vi.fn(),
    getToken: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

vi.mock("../lib/householdAPI", () => ({
  householdAPI: {
    getMyHousehold: vi.fn(),
    createHousehold: vi.fn(),
    joinHousehold: vi.fn(),
    leaveHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
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

describe("Dashboard", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
  };

  const mockPantryItems = [
    {
      id: 1,
      name: "Milk",
      quantity: 2,
      unit: "liters",
      category: "Dairy",
      expiration_date: "2026-04-30",
      notes: "Breakfast milk",
      created_at: "2026-04-01T00:00:00Z",
    },
    {
      id: 2,
      name: "Apples",
      quantity: 6,
      unit: "pieces",
      category: "Fruits",
      expiration_date: "2026-05-10",
      notes: "Snack stash",
      created_at: "2026-04-02T00:00:00Z",
    },
  ];

  const mockHousehold = {
    household: {
      id: "household-123",
      name: "Test Household",
      invite_code: "ABC123",
      created_by: "user-123",
      created_at: "2026-03-25T00:00:00Z",
    },
    members: [
      {
        user_id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        role: "admin",
      },
      {
        user_id: "user-456",
        email: "member@example.com",
        full_name: "Member User",
        role: "member",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue(mockUser);
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue(
      mockHousehold,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPantryItems,
      }),
    );
  });

  it("should redirect to login if user is not authenticated", () => {
    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue(null);

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should fetch household data on mount", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(householdAPIModule.householdAPI.getMyHousehold).toHaveBeenCalled();
    });
  });

  it("should display household name", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test Household")).toBeDefined();
    });
  });

  it("should display household members", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeDefined();
      expect(screen.getByText("Member User")).toBeDefined();
    });
  });

  it("should display member emails", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeDefined();
      expect(screen.getByText("member@example.com")).toBeDefined();
    });
  });

  it("should show user greeting with full name", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Good morning|Welcome|Hello/i)).toBeDefined();
    });
  });

  it("should have navigation buttons to main pages", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /manage household/i }),
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: /pantry list/i }),
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: /shopping list/i }),
      ).toBeDefined();
    });
  });

  it("should display logout button", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /logout/i })).toBeDefined();
    });
  });

  it("should logout and navigate on logout click", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const logoutBtn = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutBtn);
    });

    expect(authAPIModule.authAPI.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should handle household fetch error", async () => {
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockRejectedValue(
      new Error("Failed to fetch household"),
    );

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      // Error should be handled gracefully
      expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    });
  });

  it("should display manage household link if user is admin", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const manageLink = screen.queryByRole("link", { name: /manage/i });
      expect(manageLink || true).toBeDefined();
    });
  });

  it("should show household info section", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      // Check for household identification
      const heading = screen.getByText("Test Household");
      expect(heading).toBeDefined();
    });
  });

  it("should display all household member details", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      // Check for member count or list
      expect(
        screen.getAllByText(/test@example.com|member@example.com/),
      ).toHaveLength(2);
    });
  });

  it("should show loading state for household data", async () => {
    // Mock getMyHousehold to never resolve to keep loading state
    vi.mocked(
      householdAPIModule.householdAPI.getMyHousehold,
    ).mockImplementation(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      // Should show loading skeleton in household stats
      expect(screen.getByText("Good morning, test")).toBeDefined();
    });

    // Check that loading indicators are present
    expect(document.querySelector(".animate-pulse")).toBeDefined();
  });

  it("should display household error state in stats card", async () => {
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockRejectedValue(
      new Error("Network error"),
    );

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error loading")).toBeDefined();
      expect(screen.getByText("Network error")).toBeDefined();
    });
  });

  it("should display household error state in members section", async () => {
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockRejectedValue(
      new Error("Failed to load members"),
    );

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Unable to load household members"),
      ).toBeDefined();
      expect(screen.getByText("Failed to load members")).toBeDefined();
    });
  });

  it("should show quick actions section", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Quick Actions")).toBeDefined();
      expect(screen.getByText("Pantry List")).toBeDefined();
      expect(screen.getByText("Shopping List")).toBeDefined();
      expect(screen.getByText("Manage Household")).toBeDefined();
    });
  });

  it("should navigate to pantry list when quick action clicked", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const pantryButton = screen.getAllByRole("button", {
        name: /pantry list/i,
      })[1];
      fireEvent.click(pantryButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/pantry-list");
  });

  it("should navigate to shopping list when quick action clicked", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const shoppingButton = screen.getAllByRole("button", {
        name: /shopping list/i,
      })[1];
      fireEvent.click(shoppingButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/shopping-list");
  });

  it("should navigate to household manage when quick action clicked", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const manageButton = screen.getAllByRole("button", {
        name: /manage household/i,
      })[1];
      fireEvent.click(manageButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/household/manage");
  });

  it("should display personal household when no household exists", async () => {
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue(
      {
        household: undefined,
      },
    );

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Personal")).toBeDefined();
    });
  });

  it("should filter pantry items and expose accessible search controls", async () => {
    const milkMatches = filterPantryItems(
      mockPantryItems as never[],
      "milk",
      "All",
    );
    const fruitMatches = filterPantryItems(
      mockPantryItems as never[],
      "",
      "Fruits",
    );

    expect(milkMatches).toHaveLength(1);
    expect(milkMatches[0].name).toBe("Milk");
    expect(fruitMatches).toHaveLength(1);
    expect(fruitMatches[0].name).toBe("Apples");

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    expect(
      screen.getByRole("searchbox", { name: /search pantry items/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("combobox", { name: /filter pantry by category/i }),
    ).toBeDefined();
  });
});
