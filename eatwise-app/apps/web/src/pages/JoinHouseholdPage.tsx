import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { householdAPI } from "../lib/householdAPI";

const codePattern = /^[A-Za-z0-9\-]{6,20}$/;

const JoinHouseholdPage: React.FC = () => {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!inviteCode.trim()) {
      setError("Invite code is required.");
      return;
    }

    if (!codePattern.test(inviteCode.trim())) {
      setError("Invite code format is invalid. Use 6-20 alphanumeric characters or hyphens.");
      return;
    }

    setLoading(true);
    try {
      const resp = await householdAPI.joinHousehold(inviteCode.trim());
      setSuccess(`Joined household ${resp.household.name} successfully.`);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: any) {
      setError(err?.message || "Unable to join household.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Join Household</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
              Invite Code
            </label>
            <input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
              placeholder="ABC123-XYZ"
              disabled={loading}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-md transition disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Household"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/household/create")}
            className="w-full border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-100"
          >
            Create a new household instead
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinHouseholdPage;
