import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CreateHouseholdPage from "../pages/CreateHouseholdPage";
import * as authAPIModule from "../lib/authAPI";
import * as householdAPIModule from "../lib/householdAPI";

vi.mock("../lib/authAPI", () => ({
  authAPI: {
    getUser: vi.fn(),
    logout: vi.fn(),
    getToken: vi.fn(),
  },
}));

vi.mock("../lib/householdAPI", () => ({
  householdAPI: {
    createHousehold: vi.fn(),
    getMyHousehold: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("CreateHouseholdPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("redirects to dashboard if user already has household", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("token");
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue({
      household: { id: "1", name: "Existing", invite_code: "ABC123" },
    });

    render(
      <BrowserRouter>
        <CreateHouseholdPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects to login if no token", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue(null);

    render(
      <BrowserRouter>
        <CreateHouseholdPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("creates household and shows invite code", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("token");
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue({
      household: undefined,
    });
    vi.mocked(householdAPIModule.householdAPI.createHousehold).mockResolvedValue({
      household: { id: "1", name: "New Household", invite_code: "XYZ789" },
      invite_code: "XYZ789",
    });

    render(
      <BrowserRouter>
        <CreateHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByRole("heading", { name: "Create Household" });

    const nameInput = screen.getByLabelText("Household Name");
    const submitButton = screen.getByRole("button", { name: "Create Household" });

    fireEvent.change(nameInput, { target: { value: "New Household" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Household \"New Household\" created!")).toBeDefined();
    });

    expect(screen.getByDisplayValue("XYZ789")).toBeDefined();
  });

  it("shows error when creation fails", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("token");
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue({
      household: undefined,
    });
    vi.mocked(householdAPIModule.householdAPI.createHousehold).mockRejectedValue(
      new Error("Failed to create household")
    );

    render(
      <BrowserRouter>
        <CreateHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByRole("heading", { name: "Create Household" });

    const nameInput = screen.getByLabelText("Household Name");
    const submitButton = screen.getByRole("button", { name: "Create Household" });

    fireEvent.change(nameInput, { target: { value: "Test" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to create household")).toBeDefined();
    });
  });

  it("validates empty household name", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("token");
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue({
      household: undefined,
    });

    render(
      <BrowserRouter>
        <CreateHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByRole("heading", { name: "Create Household" });

    const nameInput = screen.getByLabelText("Household Name");
    const submitButton = screen.getByRole("button", { name: "Create Household" });

    // Enter whitespace and submit
    fireEvent.change(nameInput, { target: { value: "   " } });
    fireEvent.click(submitButton);

    expect(screen.getByText("Household name is required.")).toBeDefined();
  });
});