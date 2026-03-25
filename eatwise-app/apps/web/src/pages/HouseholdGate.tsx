import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../lib/authAPI";
import { householdAPI } from "../lib/householdAPI";

const HouseholdGate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

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
        } else {
          navigate("/household/create");
        }
      } catch (err: any) {
        console.error("Household gate error", err);
        setError(err?.message || "Could not determine household status");
      } finally {
        setLoading(false);
      }
    };

    checkHousehold();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Checking household membership...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md p-6 bg-white shadow rounded text-center">
        <h1 className="text-xl font-bold">Household Flow</h1>
        <p className="mt-4 text-red-600">{error}</p>
        <p className="mt-2 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
};

export default HouseholdGate;
