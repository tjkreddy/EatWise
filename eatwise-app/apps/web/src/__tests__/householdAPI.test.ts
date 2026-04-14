import { describe, it, expect, beforeEach, vi } from "vitest";
import { householdAPI } from "../lib/householdAPI";

describe("householdAPI", () => {
  const mockToken = "test-token-123";
  const mockHousehold = {
    id: "household-123",
    name: "Test Household",
    invite_code: "ABC123",
    created_by: "user-123",
    created_at: "2026-03-25T00:00:00Z",
  };

  beforeEach(() => {
    localStorage.setItem("token", mockToken);
    vi.clearAllMocks();
  });

  describe("createHousehold", () => {
    it("should create a new household", async () => {
      const response = {
        household: mockHousehold,
        invite_code: "ABC123",
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      ) as any;

      const result = await householdAPI.createHousehold("Test Household");

      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/households"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Test Household" }),
        }),
      );
    });

    it("should throw an error when creation fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Failed to create household"),
        }),
      ) as any;

      await expect(householdAPI.createHousehold("Test")).rejects.toThrow(
        "Failed to create household",
      );
    });
  });

  describe("joinHousehold", () => {
    it("should join a household with invite code", async () => {
      const response = { message: "Successfully joined household", household: mockHousehold };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      ) as any;

      const result = await householdAPI.joinHousehold("ABC123");

      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/households/join"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ invite_code: "ABC123" }),
        }),
      );
    });

    it("should throw an error when join fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Invalid invite code"),
        }),
      ) as any;

      await expect(householdAPI.joinHousehold("INVALID")).rejects.toThrow(
        "Invalid invite code",
      );
    });
  });

  describe("getMyHousehold", () => {
    it("should fetch current user's household", async () => {
      const response = {
        household: mockHousehold,
        members: [
          {
            user_id: "user-123",
            email: "test@example.com",
            role: "admin",
          },
        ],
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      ) as any;

      const result = await householdAPI.getMyHousehold();

      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/households/me"),
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("should return empty object when user has no household", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          status: 404,
          ok: false,
        }),
      ) as any;

      const result = await householdAPI.getMyHousehold();

      expect(result).toEqual({ household: undefined });
    });
  });

  describe("leaveHousehold", () => {
    it("should leave the current household", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      ) as any;

      await householdAPI.leaveHousehold();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/households/leave"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should throw an error when leave fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Failed to leave"),
        }),
      ) as any;

      await expect(householdAPI.leaveHousehold()).rejects.toThrow(
        "Failed to leave",
      );
    });
  });

  describe("deleteHousehold", () => {
    it("should delete the household", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
        }),
      ) as any;

      await householdAPI.deleteHousehold();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/households"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    it("should throw an error when delete fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Failed to delete"),
        }),
      ) as any;

      await expect(householdAPI.deleteHousehold()).rejects.toThrow(
        "Failed to delete",
      );
    });
  });

  describe("removeMember", () => {
    it("should remove a member from household", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
        }),
      ) as any;

      await householdAPI.removeMember("household-123", "user-456");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/households/household-123/members/user-456",
        ),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    it("should throw an error when remove member fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Failed to remove member"),
        }),
      ) as any;

      await expect(
        householdAPI.removeMember("household-123", "user-456"),
      ).rejects.toThrow("Failed to remove member");
    });
  });

  describe("transferOwnership", () => {
    it("should transfer ownership to another user", async () => {
      const response = { message: "Ownership transferred successfully" };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      ) as any;

      const result = await householdAPI.transferOwnership("household-123", "user-456");

      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/households/household-123/transfer-ownership",
        ),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ new_owner_user_id: "user-456" }),
        }),
      );
    });

    it("should throw an error when transfer ownership fails", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve("Failed to transfer ownership"),
        }),
      ) as any;

      await expect(
        householdAPI.transferOwnership("household-123", "user-456"),
      ).rejects.toThrow("Failed to transfer ownership");
    });
  });
});
