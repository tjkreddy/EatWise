import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState<string | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const [user] = useState(() => authAPI.getUser());

  const loadHousehold = useCallback(
    async (showInitialLoader = false) => {
      if (!user) {
        navigate("/login");
        return;
      }

      if (showInitialLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

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
        setRefreshing(false);
      }
    },
    [navigate, user?.id],
  );

  useEffect(() => {
    loadHousehold(true);
  }, [loadHousehold]);

  const currentRole = useMemo(() => {
    if (!user) return "member";
    const me = members.find(
      (m) =>
        m.user_id === user.id ||
        m.email.toLowerCase() === String(user.email).toLowerCase(),
    );
    return me?.role === "owner" ? "owner" : "member";
  }, [members, user]);

  const ownerCount = useMemo(
    () => members.filter((member) => member.role === "owner").length,
    [members],
  );

  const memberCount = useMemo(
    () => members.filter((member) => member.role !== "owner").length,
    [members],
  );

  const transferCandidates = useMemo(() => {
    if (!user) return [];
    return members.filter((member) => member.user_id !== user.id);
  }, [members, user]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      const displayName = (member.full_name || "").toLowerCase();
      return (
        displayName.includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query)
      );
    });
  }, [memberSearch, members]);

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

  const handleRemoveMember = async (member: HouseholdMember) => {
    if (!household) return;
    if (
      !window.confirm(
        `Remove ${member.full_name || member.email} from this household?`,
      )
    ) {
      return;
    }

    setRemovingMemberId(member.user_id);
    setError(null);
    try {
      await householdAPI.removeMember(household.id, member.user_id);
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleOpenTransferModal = () => {
    setTransferError(null);
    setTransferSuccess(null);
    setSelectedTransferUserId(transferCandidates[0]?.user_id ?? null);
    setShowTransferModal(true);
  };

  const handleCloseTransferModal = () => {
    setShowTransferModal(false);
    setSelectedTransferUserId(null);
    setTransferError(null);
  };

  const handleConfirmTransfer = async () => {
    if (!household || !selectedTransferUserId) {
      setTransferError("Please select a household member to transfer ownership to.");
      return;
    }

    setTransferLoading(true);
    setTransferError(null);
    try {
      const response = await householdAPI.transferOwnership(
        household.id,
        selectedTransferUserId,
      );
      setTransferSuccess(response.message || "Ownership transferred successfully.");
      setShowTransferModal(false);
      await loadHousehold(false);
    } catch (err) {
      setTransferError(
        err instanceof Error ? err.message : "Failed to transfer ownership",
      );
    } finally {
      setTransferLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadHousehold(false);
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

              {transferSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                  {transferSuccess}
                </div>
              )}

              {currentRole === "owner" && (
                <div className="flex flex-col gap-3 mb-4">
                  {transferCandidates.length > 0 ? (
                    <button
                      onClick={handleOpenTransferModal}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                    >
                      Transfer Ownership
                    </button>
                  ) : (
                    <div className="text-sm text-gray-600">
                      Add members before transferring ownership.
                    </div>
                  )}
                </div>
              )}

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
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">Members</h2>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 font-semibold">
                      Total: {members.length}
                    </span>
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-semibold">
                      Owners: {ownerCount}
                    </span>
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold">
                      Members: {memberCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search members by name, email, or role"
                    title="Search members"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-3 py-2 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {filteredMembers.map((member) => (
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-semibold">
                        {member.role}
                      </span>
                      {currentRole === "owner" &&
                        member.role !== "owner" &&
                        member.user_id !== user?.id && (
                          <button
                            onClick={() => handleRemoveMember(member)}
                            disabled={removingMemberId === member.user_id}
                            className="text-xs px-3 py-1 rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                          >
                            {removingMemberId === member.user_id
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        )}
                    </div>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-sm text-gray-600">No members found.</div>
                )}
                {members.length > 0 && filteredMembers.length === 0 && (
                  <div className="text-sm text-gray-600">
                    No members match your search.
                  </div>
                )}
              </div>
            </div>

            {showTransferModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
                <div className="w-full max-w-lg bg-white rounded-lg shadow-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Transfer Ownership
                    </h2>
                    <button
                      onClick={handleCloseTransferModal}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Select a household member to become the new owner.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="newOwner"
                        className="block text-sm font-medium text-gray-700"
                      >
                        New Owner
                      </label>
                      <select
                        id="newOwner"
                        value={selectedTransferUserId ?? ""}
                        onChange={(e) => setSelectedTransferUserId(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                      >
                        <option value="" disabled>
                          Select member
                        </option>
                        {transferCandidates.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.full_name || member.email} ({member.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    {transferError && (
                      <div className="text-sm text-red-600">
                        {transferError}
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={handleCloseTransferModal}
                      className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmTransfer}
                      disabled={transferLoading}
                      className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {transferLoading ? "Transferring..." : "Confirm Transfer"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ManageHouseholdPage;
