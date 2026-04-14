import { authAPI } from "./authAPI";

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by?: string;
  created_at?: string;
}

export interface HouseholdMember {
  user_id: string;
  email: string;
  role: string;
  full_name?: string;
}

export interface CreateHouseholdResponse {
  household: Household;
  invite_code: string;
}

export interface JoinHouseholdResponse {
  message: string;
  household: Household;
}

export interface TransferOwnershipResponse {
  message: string;
}

export interface GetMyHouseholdResponse {
  household?: Household;
  members?: HouseholdMember[];
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const makeAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${authAPI.getToken()}`,
});

export const householdAPI = {
  createHousehold: async (name: string): Promise<CreateHouseholdResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/households`, {
      method: "POST",
      headers: makeAuthHeaders(),
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 400) {
        throw new Error(errorText || "Invalid household name");
      } else if (response.status === 401) {
        throw new Error("Authentication required");
      } else if (response.status === 403) {
        throw new Error("Insufficient permissions");
      } else if (response.status === 404) {
        throw new Error("Resource not found");
      } else {
        throw new Error(errorText || "Failed to create household");
      }
    }

    return response.json();
  },

  joinHousehold: async (inviteCode: string): Promise<JoinHouseholdResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/households/join`, {
      method: "POST",
      headers: makeAuthHeaders(),
      body: JSON.stringify({ invite_code: inviteCode }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 400) {
        throw new Error(errorText || "Invalid invite code");
      } else if (response.status === 401) {
        throw new Error("Authentication required");
      } else if (response.status === 403) {
        throw new Error("Insufficient permissions");
      } else if (response.status === 404) {
        throw new Error("Household not found");
      } else {
        throw new Error(errorText || "Failed to join household");
      }
    }

    return response.json();
  },

  getMyHousehold: async (): Promise<GetMyHouseholdResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/households/me`, {
      method: "GET",
      headers: makeAuthHeaders(),
    });

    if (response.status === 404) {
      return { household: undefined };
    }

    if (!response.ok) {
      throw new Error((await response.text()) || "Failed to get household");
    }

    return response.json();
  },

  leaveHousehold: async (): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/households/leave`, {
      method: "POST",
      headers: makeAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error((await response.text()) || "Failed to leave household");
    }
  },

  deleteHousehold: async (): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/households`, {
      method: "DELETE",
      headers: makeAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error((await response.text()) || "Failed to delete household");
    }
  },

  removeMember: async (
    householdId: string,
    memberUserId: string,
  ): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/api/households/${householdId}/members/${memberUserId}`,
      {
        method: "DELETE",
        headers: makeAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error((await response.text()) || "Failed to remove member");
    }
  },

  transferOwnership: async (
    householdId: string,
    newOwnerUserId: string,
  ): Promise<TransferOwnershipResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/api/households/${householdId}/transfer-ownership`,
      {
        method: "POST",
        headers: makeAuthHeaders(),
        body: JSON.stringify({ new_owner_user_id: newOwnerUserId }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 400) {
        throw new Error(errorText || "Invalid request");
      } else if (response.status === 401) {
        throw new Error("Authentication required");
      } else if (response.status === 403) {
        throw new Error("Insufficient permissions");
      } else if (response.status === 404) {
        throw new Error("Household or user not found");
      } else {
        throw new Error(errorText || "Failed to transfer ownership");
      }
    }

    return response.json();
  },
};
