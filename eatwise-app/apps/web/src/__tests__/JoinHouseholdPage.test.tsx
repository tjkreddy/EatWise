import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import JoinHouseholdPage from "../pages/JoinHouseholdPage";
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
    joinHousehold: vi.fn(),
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

describe("JoinHouseholdPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it("redirects to dashboard if user already has household", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("token");
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue({
      household: { id: "1", name: "Existing", invite_code: "ABC123" },
    });

    render(
      <BrowserRouter>
        <JoinHouseholdPage />
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
        <JoinHouseholdPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("joins household and shows success message", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("token");
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue({
      household: undefined,
    });
    vi.mocked(householdAPIModule.householdAPI.joinHousehold).mockResolvedValue({
      message: "Successfully joined the household!",
      household: { id: "1", name: "Test Household", invite_code: "XYZ789" },
    });

    render(
      <BrowserRouter>
        <JoinHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByRole("heading", { name: "Join Household" });

    const codeInput = screen.getByLabelText("Invite Code");
    const submitButton = screen.getByRole("button", { name: "Join Household" });

    fireEvent.change(codeInput, { target: { value: "ABC123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Successfully joined the household!")).toBeDefined();
    });

    // Should navigate after delay
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    }, { timeout: 2000 });
  });

  it("shows error when join fails", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("token");
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue({
      household: undefined,
    });
    vi.mocked(householdAPIModule.householdAPI.joinHousehold).mockRejectedValue(
      new Error("Invalid invite code")
    );

    render(
      <BrowserRouter>
        <JoinHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByRole("heading", { name: "Join Household" });

    const codeInput = screen.getByLabelText("Invite Code");
    const submitButton = screen.getByRole("button", { name: "Join Household" });

    fireEvent.change(codeInput, { target: { value: "INVALID" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid invite code")).toBeDefined();
    });
  });

  it("validates invite code format", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("token");
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue({
      household: undefined,
    });

    render(
      <BrowserRouter>
        <JoinHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByRole("heading", { name: "Join Household" });

    const codeInput = screen.getByLabelText("Invite Code");
    const submitButton = screen.getByRole("button", { name: "Join Household" });

    fireEvent.change(codeInput, { target: { value: "AB" } });
    fireEvent.click(submitButton);

    expect(screen.getByText("Invite code format is invalid. Use 6-20 alphanumeric characters or hyphens.")).toBeDefined();
  });

  it("validates empty invite code", async () => {
    vi.mocked(authAPIModule.authAPI.getToken).mockReturnValue("token");
    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue({
      household: undefined,
    });

    render(
      <BrowserRouter>
        <JoinHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByRole("heading", { name: "Join Household" });

    const codeInput = screen.getByLabelText("Invite Code");
    const submitButton = screen.getByRole("button", { name: "Join Household" });

    fireEvent.change(codeInput, { target: { value: "   " } });
    fireEvent.click(submitButton);

    expect(screen.getByText("Invite code is required.")).toBeDefined();
  });
});