import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ManageHouseholdPage from "../pages/ManageHouseholdPage";
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
    getMyHousehold: vi.fn(),
    leaveHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
    removeMember: vi.fn(),
    transferOwnership: vi.fn(),
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

describe("ManageHouseholdPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("shows Remove button for owner and calls removeMember", async () => {
    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue({
      id: "owner-1",
      email: "owner@example.com",
    } as any);

    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue(
      {
        household: {
          id: "house-1",
          name: "Test Household",
          invite_code: "ABC123",
        },
        members: [
          {
            user_id: "owner-1",
            email: "owner@example.com",
            role: "owner",
          },
          {
            user_id: "member-1",
            email: "member@example.com",
            role: "member",
            full_name: "Member One",
          },
        ],
      },
    );

    render(
      <BrowserRouter>
        <ManageHouseholdPage />
      </BrowserRouter>,
    );

    const removeButton = await screen.findByRole("button", { name: "Remove" });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(householdAPIModule.householdAPI.removeMember).toHaveBeenCalledWith(
        "house-1",
        "member-1",
      );
    });
  });

  it("does not show Remove button for non-owner users", async () => {
    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue({
      id: "member-1",
      email: "member@example.com",
    } as any);

    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue(
      {
        household: {
          id: "house-1",
          name: "Test Household",
          invite_code: "ABC123",
        },
        members: [
          {
            user_id: "owner-1",
            email: "owner@example.com",
            role: "owner",
          },
          {
            user_id: "member-1",
            email: "member@example.com",
            role: "member",
          },
        ],
      },
    );

    render(
      <BrowserRouter>
        <ManageHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByText("Members");
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("filters members by search query", async () => {
    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue({
      id: "owner-1",
      email: "owner@example.com",
    } as any);

    vi.mocked(householdAPIModule.householdAPI.getMyHousehold).mockResolvedValue(
      {
        household: {
          id: "house-1",
          name: "Test Household",
          invite_code: "ABC123",
        },
        members: [
          {
            user_id: "owner-1",
            email: "owner@example.com",
            role: "owner",
            full_name: "Owner One",
          },
          {
            user_id: "member-1",
            email: "member@example.com",
            role: "member",
            full_name: "Member One",
          },
        ],
      },
    );

    render(
      <BrowserRouter>
        <ManageHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByText("Owner One");
    const searchInput = screen.getByPlaceholderText(
      "Search members by name, email, or role",
    );
    fireEvent.change(searchInput, { target: { value: "member one" } });

    expect(screen.getByText("Member One")).toBeDefined();
    expect(screen.queryByText("Owner One")).toBeNull();
  });

  it("refresh button reloads household members", async () => {
    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue({
      id: "owner-1",
      email: "owner@example.com",
    } as any);

    vi.mocked(householdAPIModule.householdAPI.getMyHousehold)
      .mockResolvedValueOnce({
        household: {
          id: "house-1",
          name: "Test Household",
          invite_code: "ABC123",
        },
        members: [
          {
            user_id: "owner-1",
            email: "owner@example.com",
            role: "owner",
            full_name: "Owner One",
          },
        ],
      })
      .mockResolvedValueOnce({
        household: {
          id: "house-1",
          name: "Test Household",
          invite_code: "ABC123",
        },
        members: [
          {
            user_id: "owner-1",
            email: "owner@example.com",
            role: "owner",
            full_name: "Owner One",
          },
          {
            user_id: "member-2",
            email: "newmember@example.com",
            role: "member",
            full_name: "New Member",
          },
        ],
      });

    render(
      <BrowserRouter>
        <ManageHouseholdPage />
      </BrowserRouter>,
    );

    await screen.findByText("Owner One");
    expect(screen.queryByText("New Member")).toBeNull();

    const refreshButton = screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText("New Member")).toBeDefined();
    });
    expect(
      householdAPIModule.householdAPI.getMyHousehold,
    ).toHaveBeenCalledTimes(2);
  });

  it("shows transfer ownership modal and transfers ownership", async () => {
    const getMyHousehold = vi.mocked(
      householdAPIModule.householdAPI.getMyHousehold,
    );

    getMyHousehold
      .mockResolvedValueOnce({
        household: {
          id: "house-1",
          name: "Test Household",
          invite_code: "ABC123",
        },
        members: [
          {
            user_id: "owner-1",
            email: "owner@example.com",
            role: "owner",
            full_name: "Owner One",
          },
          {
            user_id: "member-1",
            email: "member@example.com",
            role: "member",
            full_name: "Member One",
          },
        ],
      })
      .mockResolvedValueOnce({
        household: {
          id: "house-1",
          name: "Test Household",
          invite_code: "ABC123",
        },
        members: [
          {
            user_id: "owner-1",
            email: "owner@example.com",
            role: "member",
            full_name: "Owner One",
          },
          {
            user_id: "member-1",
            email: "member@example.com",
            role: "owner",
            full_name: "Member One",
          },
        ],
      });

    vi.mocked(authAPIModule.authAPI.getUser).mockReturnValue({
      id: "owner-1",
      email: "owner@example.com",
    } as any);

    vi.mocked(
      householdAPIModule.householdAPI.transferOwnership,
    ).mockResolvedValue({
      message: "Ownership transferred successfully",
    });

    render(
      <BrowserRouter>
        <ManageHouseholdPage />
      </BrowserRouter>,
    );

    const transferButton = await screen.findByRole("button", {
      name: "Transfer Ownership",
    });
    fireEvent.click(transferButton);

    const select = await screen.findByLabelText("New Owner");
    fireEvent.change(select, { target: { value: "member-1" } });

    const confirmButton = screen.getByRole("button", {
      name: "Confirm Transfer",
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(
        householdAPIModule.householdAPI.transferOwnership,
      ).toHaveBeenCalledWith("house-1", "member-1");
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Transfer Ownership" }),
      ).toBeNull();
    });
  });
});
