import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { 
  ArrowLeft, BookOpen, Calendar, Check, Clock, Globe, 
  Layers, Bookmark, Share2, ShieldCheck, UserCheck 
} from 'lucide-react';

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [durationDays, setDurationDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const fetchBook = async () => {
    setLoading(true);
    try {
      const res = await api.books.get(id);
      if (res.success) {
        setBook(res.book);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load book details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBook();
  }, [id]);

  const handleBorrowClick = () => {
    if (!user) {
      addToast('Please log in to borrow books', 'info');
      navigate('/login');
      return;
    }
    setBorrowModalOpen(true);
  };

  const handleConfirmBorrow = async () => {
    setSubmitting(true);
    try {
      const res = await api.borrowings.requestBorrow({
        book_id: book.id,
        duration_days: durationDays,
      });
      if (res.success) {
        addToast(res.message || 'Borrow request submitted successfully!', 'success');
        setBorrowModalOpen(false);
        fetchBook();
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit borrow request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 animate-pulse space-y-8">
        <div className="h-6 bg-stone-200 rounded w-24" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="aspect-[3/4] bg-stone-200 rounded-2xl" />
          <div className="md:col-span-2 space-y-4">
            <div className="h-8 bg-stone-200 rounded w-3/4" />
            <div className="h-4 bg-stone-200 rounded w-1/2" />
            <div className="h-24 bg-stone-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-stone-300 mx-auto" />
        <h2 className="text-xl font-serif font-bold text-stone-800">Book Not Found</h2>
        <p className="text-xs text-stone-500">The book you are looking for does not exist in the catalog.</p>
        <Link
          to="/library"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-800 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </Link>
      </div>
    );
  }

  const isAvailable = book.is_available && book.available_copies_count > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/library"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Public Library</span>
        </Link>
      </div>

      {/* Main Book Detail Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl overflow-hidden p-6 sm:p-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Cover Column */}
          <div className="md:col-span-4 flex flex-col items-center">
            <div className="relative aspect-[3/4] w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl border border-stone-200/80 bg-cream-100">
              <img
                src={book.cover_image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600'}
                alt={book.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600';
                }}
              />
              <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 to-transparent pointer-events-none" />
            </div>

            {/* Quick status pill under image */}
            <div className="mt-6 w-full max-w-xs flex items-center justify-center">
              <span
                className={`w-full py-2 px-4 rounded-xl text-center text-xs font-bold border ${
                  isAvailable
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isAvailable
                  ? `✓ ${book.available_copies_count} of ${book.total_copies_count} Copies Available`
                  : 'All Copies Currently Checked Out'}
              </span>
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-forest-100 text-forest-800">
                  {book.category_name}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  ISBN: {book.isbn || 'N/A'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-serif font-black text-stone-900 tracking-tight leading-snug">
                {book.title}
              </h1>
              <p className="text-base sm:text-lg font-medium text-stone-600 mt-1">
                by <span className="text-stone-900 font-semibold">{book.author}</span>
              </p>

              {/* Metadata specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 my-6 border-y border-stone-100 text-xs">
                <div>
                  <span className="text-stone-400 block font-medium">Publisher</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block truncate">
                    {book.publisher || 'Public Domain'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block font-medium">Published</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block">
                    {book.publication_year || 'Classic'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block font-medium">Page Count</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block">
                    {book.page_count ? `${book.page_count} pages` : '250+ pages'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block font-medium">Language</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block">
                    {book.language || 'English'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Overview & Synopsis
                </h3>
                <p className="text-sm text-stone-700 leading-relaxed font-normal whitespace-pre-line">
                  {book.description || 'No description provided for this catalog title.'}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-stone-100 flex flex-wrap items-center gap-4">
              {isAvailable ? (
                <button
                  onClick={handleBorrowClick}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-forest-800 text-white font-semibold text-sm hover:bg-forest-700 active:scale-95 transition-all shadow-md"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Borrow This Book</span>
                </button>
              ) : (
                <button
                  disabled
                  className="px-6 py-3 rounded-xl bg-stone-200 text-stone-500 font-semibold text-sm cursor-not-allowed"
                >
                  Currently Unavailable
                </button>
              )}

              <Link
                to="/exchanges"
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition-colors"
              >
                <span>Find Peer Copies to Exchange</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Physical Copies Inventory Table */}
        <div className="mt-12 pt-8 border-t border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Library Copies Inventory
              </h3>
              <p className="text-xs text-stone-500">
                Every physical copy is individually cataloged and tracked.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-stone-100 text-stone-700 rounded-lg">
              Total Copies: {book.copies?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-cream-100 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Barcode / ID</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Catalog Status</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {book.copies && book.copies.length > 0 ? (
                  book.copies.map((copy) => (
                    <tr key={copy.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-stone-900">
                        {copy.copy_number}
                      </td>
                      <td className="py-3 px-4">{copy.condition}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={copy.status} />
                      </td>
                      <td className="py-3 px-4 text-right text-stone-500">
                        Main Stacks, Shelf {book.category_id}-{copy.id}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-stone-400">
                      No copies cataloged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Borrow Confirmation Modal */}
      <Modal
        isOpen={borrowModalOpen}
        onClose={() => setBorrowModalOpen(false)}
        title="Confirm Book Borrowing"
      >
        <div className="space-y-5">
          <div className="p-4 bg-cream-50 rounded-xl border border-stone-200 space-y-1">
            <h4 className="font-serif font-bold text-stone-900">{book.title}</h4>
            <p className="text-xs text-stone-500">by {book.author}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Select Loan Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[7, 14, 21, 28].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    durationDays === days
                      ? 'bg-forest-800 text-white border-forest-800 shadow-sm'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 mt-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              Due date will be set to: {new Date(Date.now() + durationDays * 86400000).toLocaleDateString()}
            </p>
          </div>

          <div className="p-3 bg-forest-50 border border-forest-100 rounded-xl text-xs text-forest-800 space-y-1">
            <p className="font-semibold">Library Borrowing Policy:</p>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Our library operates on mutual community trust. Please return or renew your book before the due date so other readers can enjoy it.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setBorrowModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBorrow}
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Confirm Loan Request'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
