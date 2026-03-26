import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { householdAPI } from "../lib/householdAPI";
import { authAPI } from "../lib/authAPI";

const CreateHouseholdPage: React.FC = () => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [createdHousehold, setCreatedHousehold] = useState<string | null>(null);
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

    if (!name.trim()) {
      setError("Household name is required.");
      return;
    }

    setLoading(true);
    try {
      const response = await householdAPI.createHousehold(name.trim());
      setCreatedHousehold(response.household.name);
      setInviteCode(response.invite_code);
      setError(""); // Clear any existing errors
      // Auto-redirect after 2 seconds so user sees success
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Unable to create household.");
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      alert("Invite code copied to clipboard.");
    } catch {
      alert("Copy to clipboard failed. Please copy manually.");
    }
  };

  const continueToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {checking ? (
        <div className="text-xl text-gray-600">
          Checking household status...
        </div>
      ) : (
        <div className="w-full max-w-lg bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Create Household
          </h1>

          {!inviteCode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700"
                  htmlFor="householdName"
                >
                  Household Name
                </label>
                <input
                  id="householdName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  placeholder="e.g. The Fridge Guardians"
                  disabled={loading}
                  required
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-md transition disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Household"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/household/join")}
                className="w-full border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-100"
              >
                I already have an invite code
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-green-700 font-medium">
                Household "{createdHousehold}" created!
              </p>
              <p className="text-sm text-gray-600">
                Share this invite code with family members:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteCode}
                  readOnly
                  title="Household invite code"
                  placeholder="Invite code"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 bg-gray-100"
                />
                <button
                  type="button"
                  onClick={copyInvite}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
              <button
                type="button"
                onClick={continueToDashboard}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-md"
              >
                Continue to Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateHouseholdPage;
