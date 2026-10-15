import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import BookCard from '../components/BookCard';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Search, Filter, SlidersHorizontal, BookOpen, Check, Calendar, AlertCircle } from 'lucide-react';

export default function DigitalLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total_items: 0 });
  const [loading, setLoading] = useState(true);

  // Filters from URL or state
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const availableOnly = searchParams.get('available') === 'true';
  const sortBy = searchParams.get('sort_by') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Local search input
  const [searchInput, setSearchInput] = useState(search);

  // Borrow Modal
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [selectedBook, setSelectedBook] = useState(null);
  const [durationDays, setDurationDays] = useState(14);
  const [borrowSubmitting, setBorrowSubmitting] = useState(false);
  const navigate = useNavigate();

  // Load categories once
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.categories.list();
        if (res.success) {
          setCategories(res.categories || []);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    loadCategories();
  }, []);

  // Fetch books when searchParams change
  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      try {
        const params = {
          page,
          per_page: 12,
          search,
          category,
          available: availableOnly,
          sort_by: sortBy,
        };
        const res = await api.books.list(params);
        if (res.success) {
          setBooks(res.books || []);
          setPagination(res.pagination || { page: 1, total_pages: 1, total_items: 0 });
        }
      } catch (err) {
        console.error('Failed to fetch books', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, [search, category, availableOnly, sortBy, page]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // reset page on filter change
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  const handleQuickBorrow = (book) => {
    if (!user) {
      addToast('Please sign in to borrow books', 'info');
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
        // Refresh catalog
        const params = { page, per_page: 12, search, category, available: availableOnly, sort_by: sortBy };
        const refresh = await api.books.list(params);
        if (refresh.success) {
          setBooks(refresh.books || []);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit borrow request', 'error');
    } finally {
      setBorrowSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title & Search Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-200/80 pb-8">
        <div>
          <span className="text-xs font-bold text-forest-700 uppercase tracking-wider block">
            Digital Catalog
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-forest-900 mt-1">
            Browse Public Collection
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Showing {pagination.total_items} {pagination.total_items === 1 ? 'book' : 'books'} in library
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96">
          <div className="relative flex items-center bg-white rounded-xl border border-stone-300 shadow-sm p-1.5 focus-within:ring-2 focus-within:ring-forest-700/20">
            <Search className="w-4 h-4 text-stone-400 ml-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search title, author, or ISBN..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-2.5 py-1 text-sm text-stone-900 placeholder-stone-400 focus:outline-none bg-transparent"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateParam('search', '');
                }}
                className="text-stone-400 hover:text-stone-600 text-xs px-2"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-forest-800 text-white text-xs font-semibold hover:bg-forest-700 transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/90 shadow-sm">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => updateParam('category', 'all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              category === 'all'
                ? 'bg-forest-800 text-white shadow-sm'
                : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
            }`}
          >
            All Genres
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParam('category', cat.slug)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                category === cat.slug
                  ? 'bg-forest-800 text-white shadow-sm'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Availability Toggle and Sort */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => updateParam('available', e.target.checked ? 'true' : '')}
              className="w-4 h-4 rounded text-forest-800 focus:ring-forest-700 border-stone-300"
            />
            <span>Available Only</span>
          </label>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-stone-400" />
            <select
              value={sortBy}
              onChange={(e) => updateParam('sort_by', e.target.value)}
              className="text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="newest">Newest Added</option>
              <option value="title">Title (A - Z)</option>
              <option value="author">Author (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 animate-pulse">
              <div className="aspect-[3/4] bg-stone-200 rounded-xl w-full" />
              <div className="h-4 bg-stone-200 rounded w-3/4" />
              <div className="h-3 bg-stone-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200/90 shadow-sm p-8 space-y-4">
          <BookOpen className="w-12 h-12 text-stone-300 mx-auto stroke-[1.5]" />
          <h3 className="font-serif font-bold text-xl text-stone-800">No books found</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            We couldn't find any books matching your current filters. Try adjusting your search query or category selection.
          </p>
          <button
            onClick={() => {
              setSearchInput('');
              setSearchParams(new URLSearchParams());
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onQuickBorrow={handleQuickBorrow} />
            ))}
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.total_pages}
            onPageChange={(p) => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('page', p.toString());
              setSearchParams(newParams);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}

      {/* Borrow Modal */}
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
