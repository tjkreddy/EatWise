import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import * as authAPIModule from "../lib/authAPI";

// Mock authAPI
vi.mock("../lib/authAPI", () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
    getToken: vi.fn(),
    isAuthenticated: vi.fn(),
    signup: vi.fn(),
    verifyToken: vi.fn(),
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

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it("should render login form with email and password inputs", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Login to EatWise")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });

  it("should render sign in button", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  it("should have link to signup page", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByRole("link", { name: /sign up/i })).toBeDefined();
  });

  it("should have link to welcome page", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByRole("link", { name: /back to welcome/i })).toBeDefined();
  });

  it("should fill form fields with input", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
  });

  it("should call authAPI.login on form submit", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      token: "test-token",
      user: { id: "user-123", email: "test@example.com", full_name: "Test User", created_at: "2024-01-01" },
    });
    vi.mocked(authAPIModule.authAPI.login).mockImplementation(mockLogin);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  it("should navigate to household-gate on successful login", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      token: "test-token",
      user: { id: "user-123", email: "test@example.com", full_name: "Test User", created_at: "2024-01-01" },
    });
    vi.mocked(authAPIModule.authAPI.login).mockImplementation(mockLogin);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/household-gate");
    });
  });

  it("should display error message on login failure", async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
    vi.mocked(authAPIModule.authAPI.login).mockImplementation(mockLogin);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeDefined();
    });
  });

  it("should handle network errors gracefully", async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error("Network error. Please check your connection and try again."));
    vi.mocked(authAPIModule.authAPI.login).mockImplementation(mockLogin);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Network error. Please check your connection and try again.")).toBeDefined();
    });
  });

  it("should show loading state during form submission", async () => {
    const mockLogin = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        token: "test-token",
        user: { id: "user-123", email: "test@example.com", full_name: "Test User", created_at: "2024-01-01" },
      }), 100))
    );
    vi.mocked(authAPIModule.authAPI.login).mockImplementation(mockLogin);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: /sign in/i }) as HTMLButtonElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    // Button should show loading text and be disabled
    expect(submitButton.disabled).toBe(true);
    expect(screen.getByText("Signing In...")).toBeDefined();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/household-gate");
    });
  });

  it("should clear error message on new form submission attempt", async () => {
    const mockLogin = vi
      .fn()
      .mockRejectedValueOnce(new Error("Invalid credentials"))
      .mockResolvedValueOnce({
        token: "test-token",
        user: { id: "user-123", email: "test@example.com", full_name: "Test User", created_at: "2024-01-01" },
      });
    vi.mocked(authAPIModule.authAPI.login).mockImplementation(mockLogin);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    // First submission fails
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeDefined();
    });

    // Second submission with correct password
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/household-gate");
    });
  });
});
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeDefined();
    });
  });

  it("should disable button while loading", async () => {
    const mockLogin = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
    vi.mocked(authAPIModule.authAPI.login).mockImplementation(mockLogin);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toHaveProperty("disabled", true);
      expect(screen.getByText(/signing in/i)).toBeDefined();
    });
  });

  it("should have back to welcome link", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByRole("link", { name: /back to welcome/i })).toBeDefined();
  });
});
