const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
    created_at: string;
  };
}

/**
 * Parse error response and return user-friendly message
 */
const parseAuthError = (response: Response, defaultMsg: string): string => {
  if (response.status === 400) return "Invalid email or password format";
  if (response.status === 409) return "Email already registered";
  if (response.status === 401) return "Invalid credentials";
  if (response.status === 404) return "User not found";
  if (response.status === 500) return "Server error. Please try again later.";
  return defaultMsg;
};

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password: string): string | null => {
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return null;
};

export const authAPI = {
  signup: async (
    email: string,
    password: string,
    fullName?: string,
  ): Promise<AuthResponse> => {
    // Validate inputs
    if (!email?.trim()) {
      throw new Error("Email is required");
    }
    if (!isValidEmail(email)) {
      throw new Error("Please enter a valid email address");
    }
    if (!password) {
      throw new Error("Password is required");
    }
    const passwordError = isValidPassword(password);
    if (passwordError) {
      throw new Error(passwordError);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName?.trim() || "",
        }),
      });

      if (!response.ok) {
        const errorMsg = parseAuthError(response, "Signup failed");
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (!data.token || !data.user) {
        throw new Error("Invalid response from server");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data;
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(
        "Network error. Please check your connection and try again.",
      );
    }
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    // Validate inputs
    if (!email?.trim()) {
      throw new Error("Email is required");
    }
    if (!isValidEmail(email)) {
      throw new Error("Please enter a valid email address");
    }
    if (!password) {
      throw new Error("Password is required");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const errorMsg = parseAuthError(response, "Login failed");
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (!data.token || !data.user) {
        throw new Error("Invalid response from server");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data;
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(
        "Network error. Please check your connection and try again.",
      );
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getUser: () => {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      // If parsing fails, clear invalid data
      localStorage.removeItem("user");
      return null;
    }
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },

  /**
   * Verify token validity (useful for checking session on app load)
   */
  verifyToken: (): boolean => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    return !!(token && user);
  },
};
