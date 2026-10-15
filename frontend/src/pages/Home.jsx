import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import BookCard from '../components/BookCard';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  BookOpen, HeartHandshake, Repeat, Search, ArrowRight, 
  Users, BookMarked, CheckCircle2, Sparkles, BookCopy, 
  Library, Calendar, ShieldCheck 
} from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({
    total_books: 0,
    available_copies: 0,
    registered_members: 0,
    completed_exchanges: 0,
  });
  const [recentBooks, setRecentBooks] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Borrow Modal state
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [selectedBook, setSelectedBook] = useState(null);
  const [durationDays, setDurationDays] = useState(14);
  const [borrowSubmitting, setBorrowSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.stats.getPublic();
        if (res.success) {
          setStats(res.stats || {});
          setRecentBooks(res.recent_books || []);
          setPopularBooks(res.popular_books || []);
          setCategories(res.categories || []);
        }
      } catch (err) {
        console.error('Failed to load home stats', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/library?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/library');
    }
  };

  const handleQuickBorrow = (book) => {
    if (!user) {
      addToast('Please log in or register to borrow books', 'info');
      navigate('/login');
      return;
    }
    setSelectedBook(book);
  };

  const submitBorrow = async () => {
    if (!selectedBook) return;
    setBorrowSubmitting(true);
    try {
      const res = await api.borrowings.requestBorrow({
        book_id: selectedBook.id,
        duration_days: durationDays,
      });
      if (res.success) {
        addToast(res.message || 'Borrow request submitted!', 'success');
        setSelectedBook(null);
        // Refresh catalog numbers
        const refresh = await api.stats.getPublic();
        if (refresh.success) {
          setStats(refresh.stats);
          setRecentBooks(refresh.recent_books);
          setPopularBooks(refresh.popular_books);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit borrow request', 'error');
    } finally {
      setBorrowSubmitting(false);
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 bg-gradient-to-b from-cream-100 via-cream-50 to-cream-50 border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-forest-100 text-forest-800 border border-forest-200 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-forest-700" />
              <span>A Modern Digital Public Library & Community Exchange</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-forest-900 leading-tight">
              Where Every Book Finds a Reader, and Every Reader Finds a Home.
            </h1>

            <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto font-normal">
              Borrow from our verified digital collection, donate pre-loved books to fellow learners, and swap literary treasures with your community.
            </p>

            {/* Quick Search Box */}
            <form onSubmit={handleSearchSubmit} className="pt-4 max-w-xl mx-auto">
              <div className="relative flex items-center shadow-card hover:shadow-card-hover transition-shadow bg-white rounded-2xl border border-stone-300/80 p-2">
                <Search className="w-5 h-5 text-stone-400 ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by title, author, category, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none bg-transparent"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-forest-800 text-white text-xs sm:text-sm font-semibold hover:bg-forest-700 transition-colors shrink-0 shadow-sm"
                >
                  Find Book
                </button>
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/library"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-forest-800 text-white font-semibold text-sm hover:bg-forest-700 transition-all shadow-md hover:-translate-y-0.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>Browse Digital Library</span>
              </Link>
              <Link
                to="/donate"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition-all shadow-sm"
              >
                <HeartHandshake className="w-4 h-4 text-forest-700" />
                <span>Donate a Book</span>
              </Link>
              <Link
                to="/exchanges"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition-all shadow-sm"
              >
                <Repeat className="w-4 h-4 text-forest-700" />
                <span>Community Exchange</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Impact Statistics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-16">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 border-r border-stone-100 last:border-r-0">
            <div className="w-12 h-12 rounded-2xl bg-forest-50 text-forest-800 flex items-center justify-center mx-auto mb-3">
              <BookMarked className="w-6 h-6 stroke-[2]" />
            </div>
            <p className="text-3xl sm:text-4xl font-serif font-black text-forest-900">
              {stats.total_books || 0}
            </p>
            <p className="text-xs sm:text-sm font-medium text-stone-500 mt-1">Cataloged Titles</p>
          </div>

          <div className="p-4 border-r border-stone-100 last:border-r-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 stroke-[2]" />
            </div>
            <p className="text-3xl sm:text-4xl font-serif font-black text-emerald-700">
              {stats.available_copies || 0}
            </p>
            <p className="text-xs sm:text-sm font-medium text-stone-500 mt-1">Available Copies</p>
          </div>

          <div className="p-4 border-r border-stone-100 last:border-r-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 stroke-[2]" />
            </div>
            <p className="text-3xl sm:text-4xl font-serif font-black text-stone-900">
              {stats.registered_members || 0}
            </p>
            <p className="text-xs sm:text-sm font-medium text-stone-500 mt-1">Active Readers</p>
          </div>

          <div className="p-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto mb-3">
              <Repeat className="w-6 h-6 stroke-[2]" />
            </div>
            <p className="text-3xl sm:text-4xl font-serif font-black text-amber-700">
              {stats.completed_exchanges || 0}
            </p>
            <p className="text-xs sm:text-sm font-medium text-stone-500 mt-1">Exchanges Completed</p>
          </div>
        </div>
      </section>

      {/* Featured & Popular Books */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-forest-700 tracking-wider uppercase block">
              Curated Selection
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
              Popular in the Library
            </h2>
          </div>
          <Link
            to="/library"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-800 hover:text-forest-600 transition-colors group"
          >
            <span>Explore all books</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {popularBooks.slice(0, 4).map((book) => (
            <BookCard key={book.id} book={book} onQuickBorrow={handleQuickBorrow} />
          ))}
        </div>
      </section>

      {/* Explore Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold text-forest-700 tracking-wider uppercase block">
            Browse by Genre
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
            Explore Reading Categories
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-2">
            Dive into diverse disciplines curated by librarians and educators.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/library?category=${cat.slug}`}
              className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-card hover:shadow-card-hover hover:border-forest-700/40 transition-all text-center group flex flex-col items-center justify-center gap-2 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-cream-100 text-forest-800 flex items-center justify-center group-hover:bg-forest-800 group-hover:text-white transition-colors">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-semibold text-stone-900 text-xs sm:text-sm leading-snug group-hover:text-forest-800 transition-colors">
                {cat.name}
              </h3>
              <span className="text-[11px] text-stone-400">
                {cat.book_count || 0} {cat.book_count === 1 ? 'title' : 'titles'}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recently Added Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-forest-700 tracking-wider uppercase block">
              New Arrivals
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
              Fresh Off the Shelves
            </h2>
          </div>
          <Link
            to="/library?sort_by=newest"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-800 hover:text-forest-600 transition-colors group"
          >
            <span>View new arrivals</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {recentBooks.slice(0, 4).map((book) => (
            <BookCard key={book.id} book={book} onQuickBorrow={handleQuickBorrow} />
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-cream-100 to-cream-200 rounded-3xl p-8 sm:p-12 border border-stone-200/80">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-forest-900">
              How BookBridge Works
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-2">
              Empowering communities with zero-barrier book access and peer sharing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-200/60 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-forest-800 text-white flex items-center justify-center font-bold text-base">
                1
              </div>
              <h3 className="font-serif font-bold text-lg text-stone-900">Discover & Borrow</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Browse our curated public catalog. Request an available physical or digital copy for up to 30 days with automated due date tracking.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-200/60 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-forest-800 text-white flex items-center justify-center font-bold text-base">
                2
              </div>
              <h3 className="font-serif font-bold text-lg text-stone-900">Easy Returns & Renewals</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                View your loans with due date reminders. Submit a one-click return request, verified by our librarians to keep books circulating.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-200/60 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-forest-800 text-white flex items-center justify-center font-bold text-base">
                3
              </div>
              <h3 className="font-serif font-bold text-lg text-stone-900">Donate & Exchange</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Share pre-loved literature by donating to the main library or posting on the peer-to-peer exchange board to swap books with nearby readers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Borrow Modal */}
      <Modal
        isOpen={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        title="Borrow Book Copy"
      >
        {selectedBook && (
          <div className="space-y-5">
            <div className="flex gap-4 items-start p-3 bg-cream-50 rounded-xl border border-stone-200">
              <img
                src={selectedBook.cover_image}
                alt={selectedBook.title}
                className="w-16 h-22 object-cover rounded-md shadow-sm shrink-0"
              />
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-base">{selectedBook.title}</h4>
                <p className="text-xs text-stone-500">by {selectedBook.author}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {selectedBook.available_copies_count} copies available
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Borrow Duration
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
                Due approximately: {new Date(Date.now() + durationDays * 86400000).toLocaleDateString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-forest-50 border border-forest-100 text-xs text-forest-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-forest-700" />
                Library Policy
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Requests are processed by library administration. You will receive an in-app confirmation once approved.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitBorrow}
                disabled={borrowSubmitting}
                className="px-5 py-2 text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {borrowSubmitting ? 'Submitting...' : 'Confirm Borrow Request'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
