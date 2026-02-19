import React from "react";
import { Link } from "react-router-dom";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="text-2xl font-bold text-amber-600">EatWise</div>
          <div className="flex gap-4">
            <Link to="/login" className="border border-amber-600 text-amber-600 hover:bg-amber-50 px-4 py-2 rounded font-medium transition">
              Login
            </Link>
            <Link to="/signup" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-medium">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div
        className="relative bg-cover bg-center h-screen flex items-center justify-center text-white p-4"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
        }}
      >
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10 text-center max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-4 text-amber-300">
            EatWise: Smart Kitchen, Zero Waste.
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-amber-100">
            Effortless pantry management, expiration tracking, and meal planning
            to reduce food waste and save money.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/signup"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition duration-300 hover:scale-105"
            >
              Get Started Now
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition duration-300 hover:scale-105"
            >
              Login
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How EatWise Transforms Your Kitchen
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Manage your pantry smarter and reduce food waste
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-lg border border-gray-200 hover:border-amber-300 transition">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Smart Inventory
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Keep track of every item in your pantry and fridge with ease.
                Never forget what you have again.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg border border-gray-200 hover:border-amber-300 transition">
              <div className="text-5xl mb-4">🍳</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Meal Planning
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Plan your meals efficiently based on your current inventory and
                upcoming expiration dates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Why EatWise?
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            EatWise empowers households to make smarter food choices, reduce their environmental footprint by cutting down on waste, and ultimately save money. Join our community and experience the future of sustainable living.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            Impact by the Numbers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="text-6xl font-bold text-amber-600 mb-3">1/3</div>
              <p className="text-gray-600 text-lg">
                of food is wasted at home. We help you prevent that.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="text-6xl font-bold text-amber-600 mb-3">$1,500</div>
              <p className="text-gray-600 text-lg">
                Average family saves per year by reducing food waste.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="text-6xl font-bold text-amber-600 mb-3">100%</div>
              <p className="text-gray-600 text-lg">
                Free to use. No hidden costs or premium features.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-amber-100 text-amber-700 rounded-full w-20 h-20 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create Account
              </h3>
              <p className="text-gray-600 text-sm">
                Sign up in seconds to get started managing your pantry.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 text-amber-700 rounded-full w-20 h-20 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add Items
              </h3>
              <p className="text-gray-600 text-sm">
                Log your groceries and set expiration dates easily.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 text-amber-700 rounded-full w-20 h-20 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Get Ideas
              </h3>
              <p className="text-gray-600 text-sm">
                Receive meal ideas based on what you have.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 text-amber-700 rounded-full w-20 h-20 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Save & Share
              </h3>
              <p className="text-gray-600 text-sm">
                Track savings and collaborate with others.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            Why Choose EatWise?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded bg-amber-600 text-white font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Save Money
                </h3>
                <p className="mt-1 text-gray-600">
                  Reduce waste and make the most of your groceries.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded bg-amber-600 text-white font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Help the Environment
                </h3>
                <p className="mt-1 text-gray-600">
                  Every item tracked is a step towards sustainability.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded bg-amber-600 text-white font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Easy to Use
                </h3>
                <p className="mt-1 text-gray-600">
                  Intuitive interface that anyone can master in minutes.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded bg-amber-600 text-white font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Family Friendly
                </h3>
                <p className="mt-1 text-gray-600">
                  Invite household members and collaborate together.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-amber-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Kitchen?
          </h2>
          <p className="text-lg text-amber-100 mb-8">
            Start your journey towards smarter shopping and zero waste today.
          </p>
          <Link
            to="/signup"
            className="bg-white hover:bg-gray-100 text-amber-600 font-bold py-3 px-8 rounded transition inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} EatWise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
