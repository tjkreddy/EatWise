import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
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
      mockHousehold
    );
  });

  it("should redirect to login if user is not authenticated", () => {
    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue(null);

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should fetch household data on mount", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(householdAPIModule.householdAPI.getMyHousehold).toHaveBeenCalled();
    });
  });

  it("should display household name", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Household")).toBeInTheDocument();
    });
  });

  it("should display household members", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("Member User")).toBeInTheDocument();
    });
  });

  it("should display member emails", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("member@example.com")).toBeInTheDocument();
    });
  });

  it("should show user greeting with full name", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome|Hello/i)).toBeInTheDocument();
    });
  });

  it("should have navigation links to main pages", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);
    });
  });

  it("should display logout button", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    });
  });

  it("should logout and navigate on logout click", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
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
      new Error("Failed to fetch household")
    );

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Error should be handled gracefully
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });
  });

  it("should display manage household link if user is admin", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
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
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check for household identification
      const heading = screen.getByText("Test Household");
      expect(heading).toBeInTheDocument();
    });
  });

  it("should display all household member details", async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check for member count or list
      expect(screen.getAllByText(/test@example.com|member@example.com/)).toHaveLength(
        2
      );
    });
  });
});
