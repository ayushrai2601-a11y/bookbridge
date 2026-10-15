import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { BookOpen, LogIn, Shield, User, Sparkles, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login({ email, password });
      if (res.success) {
        addToast(`Welcome back, ${res.user.name}!`, 'success');
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-forest-800 text-white flex items-center justify-center mx-auto shadow-md">
          <BookOpen className="w-6 h-6 stroke-[2.2]" />
        </div>
        <h2 className="text-3xl font-serif font-black text-stone-900 tracking-tight">
          Welcome to BookBridge
        </h2>
        <p className="text-xs sm:text-sm text-stone-500">
          Sign in to access your digital loans, community exchanges, and donations.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-stone-200/90 shadow-xl space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="reader@bookbridge.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-forest-800 text-white font-semibold text-sm hover:bg-forest-700 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-stone-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2 text-center">
              Demo Credentials (1-Click Fill)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@bookbridge.org', 'admin123')}
                className="p-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100/80 text-amber-900 text-left text-xs transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-amber-700 shrink-0" />
                <div className="truncate">
                  <strong className="block text-[11px]">Head Librarian</strong>
                  <span className="text-[10px] text-amber-800">admin@bookbridge.org</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sarah@example.com', 'user123')}
                className="p-2 rounded-xl border border-stone-200 bg-cream-50 hover:bg-cream-100 text-stone-800 text-left text-xs transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4 text-forest-700 shrink-0" />
                <div className="truncate">
                  <strong className="block text-[11px]">Member Sarah</strong>
                  <span className="text-[10px] text-stone-500">sarah@example.com</span>
                </div>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-stone-500">
            Don't have a library account?{' '}
            <Link to="/register" className="font-semibold text-forest-800 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
