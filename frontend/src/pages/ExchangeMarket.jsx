import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { 
  Repeat, PlusCircle, Search, Filter, ArrowRightLeft, 
  User, Check, X, Clock, BookOpen, AlertCircle, Sparkles 
} from 'lucide-react';

export default function ExchangeMarket() {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [filterTab, setFilterTab] = useState('available'); // 'available', 'mine', 'all'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal 1: Create Listing
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newListing, setNewListing] = useState({
    title: '',
    author: '',
    category: 'Fiction & Literature',
    condition: 'Good',
    looking_for: '',
    description: '',
    cover_image: '',
  });
  const [creating, setCreating] = useState(false);

  // Modal 2: Propose Exchange Offer
  const [selectedListing, setSelectedListing] = useState(null);
  const [offerData, setOfferData] = useState({
    offered_title: '',
    offered_author: '',
    offered_condition: 'Good',
    message: '',
  });
  const [proposing, setProposing] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await api.exchanges.getListings({
        status: filterTab,
        search,
      });
      if (res.success) {
        setListings(res.listings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [filterTab, search]);

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('Please log in to list a book for exchange', 'info');
      navigate('/login');
      return;
    }

    setCreating(true);
    try {
      const res = await api.exchanges.createListing(newListing);
      if (res.success) {
        addToast('Exchange listing published successfully!', 'success');
        setCreateModalOpen(false);
        setNewListing({
          title: '',
          author: '',
          category: 'Fiction & Literature',
          condition: 'Good',
          looking_for: '',
          description: '',
          cover_image: '',
        });
        fetchListings();
      }
    } catch (err) {
      addToast(err.message || 'Failed to create listing', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleProposeOffer = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('Please log in to propose an exchange', 'info');
      navigate('/login');
      return;
    }

    if (!offerData.offered_title.trim() || !offerData.offered_author.trim()) {
      addToast('Please provide your book title and author', 'error');
      return;
    }

    setProposing(true);
    try {
      const res = await api.exchanges.createRequest({
        listing_id: selectedListing.id,
        ...offerData,
      });
      if (res.success) {
        addToast('Exchange proposal sent to owner!', 'success');
        setSelectedListing(null);
        setOfferData({
          offered_title: '',
          offered_author: '',
          offered_condition: 'Good',
          message: '',
        });
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit exchange proposal', 'error');
    } finally {
      setProposing(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to cancel this listing?')) return;
    try {
      const res = await api.exchanges.deleteListing(listingId);
      if (res.success) {
        addToast('Listing cancelled', 'success');
        fetchListings();
      }
    } catch (err) {
      addToast(err.message || 'Failed to cancel listing', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-stone-200/80 pb-8">
        <div>
          <span className="text-xs font-bold text-forest-700 uppercase tracking-wider block">
            Peer-to-Peer Community
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-forest-900 mt-1">
            Community Book Exchange
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Trade books directly with fellow readers. No money, just pure literary passion.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              addToast('Please log in to list a book', 'info');
              navigate('/login');
              return;
            }
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-forest-800 text-white text-xs sm:text-sm font-semibold hover:bg-forest-700 transition-all shadow-md self-start sm:self-auto active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>List a Book for Exchange</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/90 shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterTab('available')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterTab === 'available'
                ? 'bg-forest-800 text-white shadow-sm'
                : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
            }`}
          >
            Available Swaps
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterTab === 'all'
                ? 'bg-forest-800 text-white shadow-sm'
                : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
            }`}
          >
            All Listings
          </button>
          {user && (
            <button
              onClick={() => setFilterTab('mine')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filterTab === 'mine'
                  ? 'bg-forest-800 text-white shadow-sm'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              My Listings
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by book or what owner wants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest-700/20"
          />
        </div>
      </div>

      {/* Exchange Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-stone-200 rounded w-2/3" />
              <div className="h-3 bg-stone-200 rounded w-1/2" />
              <div className="h-16 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-4">
          <Repeat className="w-12 h-12 text-stone-300 mx-auto stroke-[1.5]" />
          <h3 className="font-serif font-bold text-xl text-stone-800">No exchange listings found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Be the first in your reading club or neighborhood to list a book for exchange!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => {
            const isOwner = user && user.id === item.user_id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-stone-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with user and status */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
                        {item.owner_name?.charAt(0) || 'U'}
                      </div>
                      <span className="text-xs font-semibold text-stone-800">
                        {item.owner_name}
                      </span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  {/* Book Card Preview */}
                  <div className="flex gap-4">
                    <img
                      src={item.cover_image}
                      alt={item.title}
                      className="w-20 h-28 object-cover rounded-xl shadow-md border border-stone-200 shrink-0"
                    />
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700 block">
                        {item.category}
                      </span>
                      <h4 className="font-serif font-bold text-base text-stone-900 line-clamp-2 mt-0.5">
                        {item.title}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">by {item.author}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700">
                        Condition: {item.condition}
                      </span>
                    </div>
                  </div>

                  {/* Looking For Wishlist box */}
                  <div className="mt-4 p-3 rounded-2xl bg-cream-100/80 border border-amber-200/60 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Looking To Trade For:
                    </span>
                    <p className="font-medium text-stone-800 leading-snug">
                      {item.looking_for}
                    </p>
                  </div>

                  {item.description && (
                    <p className="text-xs text-stone-500 mt-3 line-clamp-2 leading-relaxed">
                      "{item.description}"
                    </p>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-5 mt-5 border-t border-stone-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400">
                    Listed {new Date(item.created_at).toLocaleDateString()}
                  </span>

                  {isOwner ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/profile?tab=exchanges')}
                        className="px-3 py-1.5 text-xs font-semibold text-forest-800 hover:bg-forest-50 rounded-lg"
                      >
                        Manage Offers
                      </button>
                      {item.status === 'available' && (
                        <button
                          onClick={() => handleDeleteListing(item.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ) : item.status === 'available' ? (
                    <button
                      onClick={() => setSelectedListing(item)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 transition-colors shadow-sm active:scale-95"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Propose Swap</span>
                    </button>
                  ) : (
                    <span className="text-xs text-stone-400 italic">No longer open</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Create Listing */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="List a Book for Community Exchange"
      >
        <form onSubmit={handleCreateListing} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Book You Are Offering *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dune"
                value={newListing.title}
                onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Author *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Frank Herbert"
                value={newListing.author}
                onChange={(e) => setNewListing({ ...newListing, author: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Genre / Category
              </label>
              <select
                value={newListing.category}
                onChange={(e) => setNewListing({ ...newListing, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none bg-white"
              >
                <option value="Fiction & Literature">Fiction & Literature</option>
                <option value="Science & Technology">Science & Technology</option>
                <option value="History & Biography">History & Biography</option>
                <option value="Philosophy & Thought">Philosophy & Thought</option>
                <option value="Arts & Design">Arts & Design</option>
                <option value="Children & Young Adult">Children & Young Adult</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Condition
              </label>
              <select
                value={newListing.condition}
                onChange={(e) => setNewListing({ ...newListing, condition: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none bg-white"
              >
                <option value="Like New">Like New (Mint)</option>
                <option value="Good">Good (Light wear)</option>
                <option value="Fair">Fair (Readable)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
              What Are You Looking For in Exchange? *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Looking for Foundation by Isaac Asimov or any classic Sci-Fi"
              value={newListing.looking_for}
              onChange={(e) => setNewListing({ ...newListing, looking_for: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
              Cover Image URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={newListing.cover_image}
              onChange={(e) => setNewListing({ ...newListing, cover_image: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Share any details about edition, translation, or preferred meetup spot..."
              value={newListing.description}
              onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 rounded-xl disabled:opacity-50"
            >
              {creating ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Propose Exchange Offer */}
      <Modal
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        title="Propose Book Exchange Offer"
      >
        {selectedListing && (
          <form onSubmit={handleProposeOffer} className="space-y-4">
            <div className="p-3 bg-cream-50 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-500">
                You are requesting:
              </span>
              <p className="font-serif font-bold text-stone-900 text-sm mt-0.5">
                {selectedListing.title} by {selectedListing.author}
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Owner is looking for: <em>"{selectedListing.looking_for}"</em>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Book You Are Offering *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Neuromancer"
                  value={offerData.offered_title}
                  onChange={(e) => setOfferData({ ...offerData, offered_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Author *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. William Gibson"
                  value={offerData.offered_author}
                  onChange={(e) => setOfferData({ ...offerData, offered_author: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Condition of Your Book
              </label>
              <select
                value={offerData.offered_condition}
                onChange={(e) => setOfferData({ ...offerData, offered_condition: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none bg-white"
              >
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Message to Owner
              </label>
              <textarea
                rows={3}
                placeholder="Let them know why this is a great swap and how to coordinate..."
                value={offerData.message}
                onChange={(e) => setOfferData({ ...offerData, message: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={proposing}
                className="px-5 py-2 text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 rounded-xl disabled:opacity-50"
              >
                {proposing ? 'Sending Proposal...' : 'Send Exchange Proposal'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
