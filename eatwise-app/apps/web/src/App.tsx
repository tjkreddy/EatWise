import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PantryList from "./pages/PantryList";
import ShoppingList from "./pages/ShoppingList";
import ManageHouseholdPage from "./pages/ManageHouseholdPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HouseholdGate from "./pages/HouseholdGate";
import CreateHouseholdPage from "./pages/CreateHouseholdPage";
import JoinHouseholdPage from "./pages/JoinHouseholdPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/household-gate" element={<HouseholdGate />} />
        <Route path="/household/create" element={<CreateHouseholdPage />} />
        <Route path="/household/join" element={<JoinHouseholdPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/household/manage" element={<ManageHouseholdPage />} />
        <Route path="/pantry-list" element={<PantryList />} />
        <Route path="/shopping-list" element={<ShoppingList />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
