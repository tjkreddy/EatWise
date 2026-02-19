import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div
        className="relative bg-cover bg-center h-screen flex items-center justify-center text-white p-4"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542838131-92c478a531f9?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }}
      >
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10 text-center max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-4 animate-fade-in-down">
            EatWise: Smart Kitchen, Zero Waste.
          </h1>
          <p className="text-xl md:text-2xl mb-8 animate-fade-in-up">
            Effortless pantry management, expiration tracking, and meal planning to reduce food waste and save money.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/login"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition duration-300 hover:scale-105"
            >
              Get Started Now
            </Link>
            <Link
              to="/dashboard"
              className="border-2 border-white text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition duration-300 hover:scale-105"
            >
              Explore Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-12">How EatWise Transforms Your Kitchen</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Smart Inventory</h3>
              <p className="text-gray-600">Keep track of every item in your pantry and fridge with ease. Never forget what you have again.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Expiration Alerts</h3>
              <p className="text-gray-600">Receive timely notifications before your food goes bad, helping you minimize waste.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Meal Planning</h3>
              <p className="text-gray-600">Plan your meals efficiently based on your current inventory and upcoming expiration dates.</p>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="py-16 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-8">About EatWise</h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            EatWise is dedicated to revolutionizing kitchen management. Our mission is to empower households to make smarter food choices, reduce their environmental footprint by cutting down on waste, and ultimately save money. Join our community and experience the future of sustainable living.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} EatWise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

