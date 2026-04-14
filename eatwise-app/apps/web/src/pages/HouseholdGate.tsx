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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Setting up your household
          </h2>
          <p className="text-gray-600">
            Checking your household membership...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="max-w-md p-8 bg-white shadow-lg rounded-lg text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unable to Load Household
          </h1>
          <p className="text-gray-600 mb-6">
            We encountered an issue while checking your household status. This might be a temporary problem.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back to Login
            </button>
          </div>
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Technical Details
            </summary>
            <p className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
              {error}
            </p>
          </details>
        </div>
      </div>
    );
  }
};

export default HouseholdGate;
