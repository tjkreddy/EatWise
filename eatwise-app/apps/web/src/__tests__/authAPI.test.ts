import { describe, it, expect, beforeEach, vi } from "vitest";
import { authAPI, AuthResponse } from "../lib/authAPI";

describe("authAPI", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("getToken", () => {
    it("should return null when no token is stored", () => {
      const token = authAPI.getToken();
      expect(token).toBeNull();
    });

    it("should return the stored token", () => {
      const testToken = "test-token-123";
      localStorage.setItem("token", testToken);
      const token = authAPI.getToken();
      expect(token).toBe(testToken);
    });
  });

  describe("getUser", () => {
    it("should return null when no user is stored", () => {
      const user = authAPI.getUser();
      expect(user).toBeNull();
    });

    it("should return the stored user object", () => {
      const testUser = {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        created_at: "2026-03-25T00:00:00Z",
      };
      localStorage.setItem("user", JSON.stringify(testUser));
      const user = authAPI.getUser();
      expect(user).toEqual(testUser);
    });
  });

  describe("isAuthenticated", () => {
    it("should return false when no token is stored", () => {
      const isAuth = authAPI.isAuthenticated();
      expect(isAuth).toBe(false);
    });

    it("should return true when token is stored", () => {
      localStorage.setItem("token", "test-token");
      const isAuth = authAPI.isAuthenticated();
      expect(isAuth).toBe(true);
    });
  });

  describe("logout", () => {
    it("should clear token and user from localStorage", () => {
      localStorage.setItem("token", "test-token");
      localStorage.setItem("user", JSON.stringify({ id: "user-123" }));

      authAPI.logout();

      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
    });

    it("should work even if localStorage is empty", () => {
      expect(() => authAPI.logout()).not.toThrow();
    });
  });

  describe("signup", () => {
    it("should throw an error when signup fails", async () => {
      // Mock fetch to return error
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Signup failed"),
        })
      ) as any;

      await expect(
        authAPI.signup("test@example.com", "password123", "Test User")
      ).rejects.toThrow("Signup failed");
    });

    it("should store token and user on successful signup", async () => {
      const mockResponse = {
        token: "test-token-123",
        user: {
          id: "user-123",
          email: "test@example.com",
          full_name: "Test User",
          created_at: "2026-03-25T00:00:00Z",
        },
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const result = await authAPI.signup(
        "test@example.com",
        "password123",
        "Test User"
      );

      expect(result).toEqual(mockResponse);
      expect(localStorage.getItem("token")).toBe("test-token-123");
      expect(JSON.parse(localStorage.getItem("user")!).email).toBe(
        "test@example.com"
      );
    });
  });

  describe("login", () => {
    it("should throw an error when login fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve("Invalid credentials"),
        })
      ) as any;

      await expect(
        authAPI.login("test@example.com", "wrongpassword")
      ).rejects.toThrow("Invalid credentials");
    });

    it("should store token and user on successful login", async () => {
      const mockResponse = {
        token: "test-token-456",
        user: {
          id: "user-456",
          email: "user@example.com",
          full_name: "Test User",
          created_at: "2026-03-25T00:00:00Z",
        },
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as any;

      const result = await authAPI.login("user@example.com", "password");

      expect(result).toEqual(mockResponse);
      expect(localStorage.getItem("token")).toBe("test-token-456");
    });
  });
});
