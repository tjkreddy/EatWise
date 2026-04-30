import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SignupPage from "../pages/SignupPage";
import * as authAPIModule from "../lib/authAPI";

// Mock authAPI
vi.mock("../lib/authAPI", () => ({
  authAPI: {
    signup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
    getToken: vi.fn(),
    isAuthenticated: vi.fn(),
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

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it("should render signup form with email, password, and confirm password inputs", () => {
    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    expect(screen.getByText("Sign Up for EatWise")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
  });

  it("should render sign up button and login link", () => {
    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    expect(screen.getByRole("button", { name: /sign up/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /login/i })).toBeDefined();
  });

  it("should fill form fields with input", () => {
    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      "Confirm Password",
    ) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password123" },
    });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
    expect(confirmPasswordInput.value).toBe("password123");
  });

  it("should display error when passwords do not match", async () => {
    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password456" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeDefined();
    });
  });

  it("should display error when password is too short", async () => {
    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "pass" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "pass" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 6 characters long"),
      ).toBeDefined();
    });
  });

  it("should call authAPI.signup on form submit with valid data", async () => {
    const mockSignup = vi.fn().mockResolvedValue({
      token: "test-token",
      user: { id: "user-123", email: "test@example.com", full_name: "" },
    });
    vi.mocked(authAPIModule.authAPI.signup).mockImplementation(mockSignup);

    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password123" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
        undefined,
      );
    });
  });

  it("should display success message on successful signup", async () => {
    const mockSignup = vi.fn().mockResolvedValue({
      token: "test-token",
      user: { id: "user-123", email: "test@example.com" },
    });
    vi.mocked(authAPIModule.authAPI.signup).mockImplementation(mockSignup);

    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password123" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Account created successfully! Redirecting..."),
      ).toBeDefined();
    });
  });

  it("should display error message on signup failure", async () => {
    const mockSignup = vi
      .fn()
      .mockRejectedValue(new Error("Email already registered"));
    vi.mocked(authAPIModule.authAPI.signup).mockImplementation(mockSignup);

    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password123" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email already registered")).toBeDefined();
    });
  });

  it("should show loading state during form submission", async () => {
    const mockSignup = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                token: "test-token",
                user: { id: "user-123", email: "test@example.com" },
              }),
            100,
          ),
        ),
    );
    vi.mocked(authAPIModule.authAPI.signup).mockImplementation(mockSignup);

    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", {
      name: /sign up/i,
    }) as HTMLButtonElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password123" },
    });
    fireEvent.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton.disabled).toBe(true);

    await waitFor(() => {
      expect(
        screen.getByText("Account created successfully! Redirecting..."),
      ).toBeDefined();
    });
  });

  it("should navigate to household-gate after successful signup", async () => {
    const mockSignup = vi.fn().mockResolvedValue({
      token: "test-token",
      user: { id: "user-123", email: "test@example.com" },
    });
    vi.mocked(authAPIModule.authAPI.signup).mockImplementation(mockSignup);

    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password123" },
    });
    fireEvent.click(submitButton);

    // Wait for navigation to be called
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/household-gate");
      },
      { timeout: 2000 },
    );
  });
});
