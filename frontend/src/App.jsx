import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import DigitalLibrary from './pages/DigitalLibrary';
import BookDetail from './pages/BookDetail';
import DonateBook from './pages/DonateBook';
import ExchangeMarket from './pages/ExchangeMarket';
import AdminDashboard from './pages/AdminDashboard';
import UserProfile from './pages/UserProfile';
import Login from './pages/Login';
import Register from './pages/Register';

function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-serif font-black text-forest-900">404</h1>
      <h2 className="text-xl font-bold text-stone-800 mt-2">Page Not Found</h2>
      <p className="text-xs text-stone-500 mt-1 max-w-sm">
        The library corridor you are trying to visit does not exist or has been relocated.
      </p>
      <Link
        to="/"
        className="mt-6 px-5 py-2.5 rounded-xl bg-forest-800 text-white text-xs font-semibold hover:bg-forest-700 transition-colors shadow-sm"
      >
        Return to Reading Hall
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <div className="flex flex-col min-h-screen bg-cream-50 text-stone-800 font-sans selection:bg-forest-100 selection:text-forest-900">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/library" element={<DigitalLibrary />} />
                <Route path="/library/:id" element={<BookDetail />} />
                <Route path="/donate" element={<DonateBook />} />
                <Route path="/exchanges" element={<ExchangeMarket />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
