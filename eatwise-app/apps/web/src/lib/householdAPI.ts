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
  household: Household;
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
      throw new Error((await response.text()) || "Failed to create household");
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
      throw new Error((await response.text()) || "Failed to join household");
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
};
