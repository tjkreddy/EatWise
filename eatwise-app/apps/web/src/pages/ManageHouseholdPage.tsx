import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../lib/authAPI";
import { householdAPI, type HouseholdMember } from "../lib/householdAPI";

const ManageHouseholdPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [household, setHousehold] = useState<{
    id: string;
    name: string;
    invite_code: string;
  } | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const user = authAPI.getUser();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadHousehold = async () => {
      try {
        setError(null);
        const response = await householdAPI.getMyHousehold();
        if (!response.household) {
          navigate("/household/create");
          return;
        }
        setHousehold(response.household);
        setMembers(response.members || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load household",
        );
      } finally {
        setLoading(false);
      }
    };

    loadHousehold();
  }, [navigate, user]);

  const currentRole = useMemo(() => {
    if (!user) return "member";
    const me = members.find(
      (m) =>
        m.user_id === user.id ||
        m.email.toLowerCase() === String(user.email).toLowerCase(),
    );
    return me?.role === "owner" ? "owner" : "member";
  }, [members, user]);

  const handleCopyInvite = async () => {
    if (!household) return;
    try {
      await navigator.clipboard.writeText(household.invite_code);
      alert("Invite code copied");
    } catch {
      alert("Failed to copy invite code");
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this household?"))
      return;
    setLeaveLoading(true);
    try {
      await householdAPI.leaveHousehold();
      navigate("/household/create");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to leave household");
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!household) return;
    if (
      !window.confirm(
        `Delete household \"${household.name}\"? This removes household data for all members.`,
      )
    ) {
      return;
    }
    setDeleteLoading(true);
    try {
      await householdAPI.deleteHousehold();
      navigate("/household/create");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete household");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading household...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-amber-600">EatWise</span>
              <span className="text-gray-700 font-medium">
                Manage Household
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-700 hover:text-amber-600 text-sm font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate("/pantry-list")}
                className="text-gray-700 hover:text-amber-600 text-sm font-medium"
              >
                Pantry List
              </button>
              <button
                onClick={() => navigate("/shopping-list")}
                className="text-gray-700 hover:text-amber-600 text-sm font-medium"
              >
                Shopping List
              </button>
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {household && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded p-5 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {household.name}
              </h1>
              <p className="text-sm text-gray-600 mb-4">
                Household ID: {household.id}
              </p>

              <div className="flex gap-2 items-center mb-4">
                <input
                  type="text"
                  readOnly
                  value={household.invite_code}
                  title="Household invite code"
                  placeholder="Invite code"
                  className="px-3 py-2 bg-white border border-amber-300 rounded font-mono text-sm"
                />
                <button
                  onClick={handleCopyInvite}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium"
                >
                  Copy Invite Code
                </button>
              </div>

              {currentRole === "owner" ? (
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded font-medium disabled:opacity-50"
                >
                  {deleteLoading ? "Deleting..." : "Delete Household"}
                </button>
              ) : (
                <button
                  onClick={handleLeave}
                  disabled={leaveLoading}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium disabled:opacity-50"
                >
                  {leaveLoading ? "Leaving..." : "Leave Household"}
                </button>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Members</h2>
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between border-b border-gray-100 pb-3"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.full_name || member.email.split("@")[0]}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.email}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-semibold">
                      {member.role}
                    </span>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-sm text-gray-600">No members found.</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ManageHouseholdPage;
