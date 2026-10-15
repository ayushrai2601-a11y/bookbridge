import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { BookOpen, HeartHandshake, Repeat, ShieldCheck, User, LogOut, Menu, X, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-forest-800 text-white shadow-sm'
        : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100/80'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
      isActive
        ? 'bg-forest-800 text-white'
        : 'text-stone-700 hover:bg-stone-100'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-forest-800 flex items-center justify-center text-white shadow-md group-hover:bg-forest-700 transition-colors">
              <BookOpen className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-serif font-black text-2xl tracking-tight text-forest-900 block leading-none">
                BookBridge
              </span>
              <span className="text-[11px] font-semibold text-forest-600 tracking-wider uppercase block mt-0.5">
                Public Library & Exchange
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/library" className={navLinkClass}>
              <BookOpen className="w-4 h-4" />
              Digital Library
            </NavLink>
            <NavLink to="/donate" className={navLinkClass}>
              <HeartHandshake className="w-4 h-4" />
              Donate
            </NavLink>
            <NavLink to="/exchanges" className={navLinkClass}>
              <Repeat className="w-4 h-4" />
              Book Exchange
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Admin Panel
              </NavLink>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <NotificationBell />

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-stone-100 transition-all border border-stone-200/60"
                  >
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-stone-200"
                    />
                    <span className="hidden lg:inline text-xs font-semibold text-stone-800 pr-1 max-w-[120px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in"
                      onMouseLeave={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-sm font-bold text-stone-900 truncate">{user.name}</p>
                        <p className="text-xs text-stone-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-forest-50 text-forest-700 capitalize">
                          {user.role} Member
                        </span>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-cream-50 hover:text-stone-900 transition-colors"
                      >
                        <User className="w-4 h-4 text-stone-500" />
                        My Library Dashboard
                      </Link>

                      <Link
                        to="/donate"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-cream-50 hover:text-stone-900 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4 text-stone-500" />
                        Donate a Book
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-forest-700 hover:bg-forest-50 transition-colors font-medium"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Admin Console
                        </Link>
                      )}

                      <div className="border-t border-stone-100 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100/80 rounded-xl transition-all"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-forest-800 hover:bg-forest-700 rounded-xl shadow-sm transition-all"
                >
                  Join Community
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-cream-50 px-4 pt-3 pb-6 space-y-1">
          <NavLink
            to="/"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            Home
          </NavLink>
          <NavLink
            to="/library"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            <BookOpen className="w-5 h-5" />
            Digital Library
          </NavLink>
          <NavLink
            to="/donate"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            <HeartHandshake className="w-5 h-5" />
            Donate Books
          </NavLink>
          <NavLink
            to="/exchanges"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            <Repeat className="w-5 h-5" />
            Book Exchange
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              Admin Console
            </NavLink>
          )}

          {user && (
            <>
              <div className="border-t border-stone-200 my-2 pt-2" />
              <NavLink
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                <User className="w-5 h-5" />
                My Account
              </NavLink>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
