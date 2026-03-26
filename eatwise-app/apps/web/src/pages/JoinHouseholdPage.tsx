import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { householdAPI } from "../lib/householdAPI";
import { authAPI } from "../lib/authAPI";

const codePattern = /^[A-Za-z0-9\-]{6,20}$/;

const JoinHouseholdPage: React.FC = () => {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string>("");
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkHousehold = async () => {
      const token = authAPI.getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const resp = await householdAPI.getMyHousehold();
        if (resp.household && resp.household.id) {
          navigate("/dashboard");
        }
      } catch (err: any) {
        console.error("Error checking household:", err);
      } finally {
        setChecking(false);
      }
    };

    checkHousehold();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!inviteCode.trim()) {
      setError("Invite code is required.");
      return;
    }

    if (!codePattern.test(inviteCode.trim())) {
      setError(
        "Invite code format is invalid. Use 6-20 alphanumeric characters or hyphens.",
      );
      return;
    }

    setLoading(true);
    try {
      const resp = await householdAPI.joinHousehold(inviteCode.trim());
      setSuccess(`Joined household ${resp.household.name} successfully.`);
      setError(""); // Clear any errors
      // Auto-navigate after showing success
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      setError(err?.message || "Unable to join household.");
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {checking ? (
        <div className="text-xl text-gray-600">
          Checking household status...
        </div>
      ) : (
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Join Household
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="inviteCode"
                className="block text-sm font-medium text-gray-700"
              >
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
      )}
    </div>
  );
};

export default JoinHouseholdPage;
