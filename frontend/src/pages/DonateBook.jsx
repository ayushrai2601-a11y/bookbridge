import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import StatusBadge from '../components/StatusBadge';
import { 
  HeartHandshake, BookOpen, Sparkles, CheckCircle2, 
  Clock, Shield, ArrowRight, Image as ImageIcon 
} from 'lucide-react';

export default function DonateBook() {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category_name: 'Fiction & Literature',
    condition: 'Good',
    description: '',
    cover_image: '',
  });

  const [categories, setCategories] = useState([]);
  const [userDonations, setUserDonations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const catRes = await api.categories.list();
        if (catRes.success) {
          setCategories(catRes.categories || []);
        }

        if (user) {
          const donRes = await api.donations.list(false);
          if (donRes.success) {
            setUserDonations(donRes.donations || []);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('Please log in to donate books', 'info');
      navigate('/login');
      return;
    }

    if (!formData.title.trim() || !formData.author.trim()) {
      addToast('Please provide book title and author', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.donations.create(formData);
      if (res.success) {
        addToast('Thank you! Your donation was submitted for librarian review.', 'success');
        setFormData({
          title: '',
          author: '',
          category_name: 'Fiction & Literature',
          condition: 'Good',
          description: '',
          cover_image: '',
        });
        // Refresh donations list
        const refresh = await api.donations.list(false);
        if (refresh.success) {
          setUserDonations(refresh.donations || []);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit donation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-forest-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-forest-700/60 text-emerald-200 border border-forest-600/50">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Community Book Drive</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white leading-tight">
            Give Your Pre-Loved Books a New Life.
          </h1>
          <p className="text-sm sm:text-base text-stone-300 leading-relaxed font-normal">
            Every donated book enriches our public stacks and helps students, lifelong learners, and readers who might not otherwise have access.
          </p>
        </div>

        <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12 pointer-events-none">
          <BookOpen className="w-96 h-96 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Donation Form Column */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-card">
          <div className="mb-6">
            <h2 className="text-xl font-serif font-bold text-stone-900">
              Submit a Book Donation
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Fill in the book details. Our curators will review it and add it to circulation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sapiens"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Author *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yuval Noah Harari"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Category / Subject *
                </label>
                <select
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="General Non-Fiction">General Non-Fiction</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Book Condition *
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20 bg-white"
                >
                  <option value="New">Brand New (Unread)</option>
                  <option value="Like New">Like New (Mint condition)</option>
                  <option value="Good">Good (Minor cosmetic wear)</option>
                  <option value="Fair">Fair (Readable, worn cover/pages)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Cover Image URL (Optional)
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20"
                />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Leave empty for a verified default cover artwork.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Notes & Description
              </label>
              <textarea
                rows={3}
                placeholder="Share any details about edition, notes, or why you loved reading this book..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-xl bg-forest-800 text-white font-semibold text-sm hover:bg-forest-700 active:scale-[0.99] transition-all shadow-md disabled:opacity-50"
            >
              {submitting ? 'Submitting Donation...' : 'Submit Book Donation'}
            </button>
          </form>
        </div>

        {/* Info & User Donation History Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* How Approval Works */}
          <div className="bg-cream-100/70 p-6 rounded-3xl border border-stone-200/90 space-y-4">
            <h3 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-forest-700" />
              Librarian Review Process
            </h3>

            <div className="space-y-3 text-xs text-stone-600">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-forest-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <p>
                  <strong>Verification:</strong> Our team checks the catalog to prevent duplicates and evaluate condition.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-forest-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </div>
                <p>
                  <strong>Approval & Cataloging:</strong> Approved books receive a unique barcode and appear in the public catalog immediately.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-forest-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </div>
                <p>
                  <strong>Recognition:</strong> You receive an in-app badge and notification thanking you for expanding community access!
                </p>
              </div>
            </div>
          </div>

          {/* User's Recent Donations */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-stone-900 text-base">
                Your Submitted Donations
              </h3>
              {user && (
                <Link
                  to="/profile?tab=donations"
                  className="text-xs font-semibold text-forest-700 hover:underline"
                >
                  View All
                </Link>
              )}
            </div>

            {!user ? (
              <div className="text-center py-6">
                <p className="text-xs text-stone-500 mb-3">
                  Please log in to track your book donations and librarian reviews.
                </p>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl bg-forest-800 text-white text-xs font-semibold"
                >
                  Sign In
                </Link>
              </div>
            ) : userDonations.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-400">
                You haven't submitted any donations yet. Submit your first book above!
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {userDonations.slice(0, 4).map((d) => (
                  <div key={d.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif font-bold text-xs text-stone-900 line-clamp-1">
                        {d.title}
                      </h4>
                      <p className="text-[11px] text-stone-500">by {d.author}</p>
                      <span className="text-[10px] text-stone-400">
                        {new Date(d.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
