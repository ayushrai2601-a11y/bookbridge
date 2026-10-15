import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { 
  User, BookOpen, Clock, HeartHandshake, Repeat, 
  Bell, Edit3, Key, Calendar, AlertTriangle, Check, 
  X, CheckCircle, ArrowRightLeft, Shield 
} from 'lucide-react';

export default function UserProfile() {
  const { user, updateProfile } = useAuth();
  const { notifications, markAsRead, deleteNotification, addToast } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'borrowing';

  // Profile Edit Modal State
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    bio: user?.bio || '',
  });

  // Change Password Modal
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [passForm, setPassForm] = useState({
    current_password: '',
    new_password: '',
  });

  // Return Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedTxForReturn, setSelectedTxForReturn] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Tab data states
  const [activeLoans, setActiveLoans] = useState([]);
  const [historyLoans, setHistoryLoans] = useState([]);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [exchangeListings, setExchangeListings] = useState([]);
  const [incomingOffers, setIncomingOffers] = useState([]);
  const [outgoingOffers, setOutgoingOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [txRes, reqRes, donRes, exRes] = await Promise.all([
        api.borrowings.getTransactions(false),
        api.borrowings.getRequests(false),
        api.donations.list(false),
        api.exchanges.getMyRequests(),
      ]);

      if (txRes.success) {
        const txs = txRes.transactions || [];
        setActiveLoans(txs.filter((t) => t.status === 'active' || t.status === 'return_pending' || t.status === 'overdue'));
        setHistoryLoans(txs.filter((t) => t.status === 'returned'));
      }

      if (reqRes.success) {
        setBorrowRequests(reqRes.requests || []);
      }

      if (donRes.success) {
        setDonations(donRes.donations || []);
      }

      if (exRes.success) {
        setIncomingOffers(exRes.incoming || []);
        setOutgoingOffers(exRes.outgoing || []);
      }

      // Also get user's exchange listings
      const listRes = await api.exchanges.getListings({ status: 'mine' });
      if (listRes.success) {
        setExchangeListings(listRes.listings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  // Submit Profile update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProfile(profileForm);
      if (res.success) {
        addToast('Profile updated successfully', 'success');
        setEditProfileOpen(false);
      }
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    }
  };

  // Submit Password update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.auth.changePassword(passForm);
      if (res.success) {
        addToast('Password changed successfully', 'success');
        setPassModalOpen(false);
        setPassForm({ current_password: '', new_password: '' });
      }
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error');
    }
  };

  // Return Book Request
  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!selectedTxForReturn) return;
    setSubmittingReturn(true);
    try {
      const res = await api.returns.submit({
        transaction_id: selectedTxForReturn.id,
        condition_notes: returnNotes,
      });
      if (res.success) {
        addToast('Return request submitted for library inspection!', 'success');
        setReturnModalOpen(false);
        setSelectedTxForReturn(null);
        setReturnNotes('');
        loadUserData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit return', 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Cancel Borrow Request
  const handleCancelBorrowRequest = async (reqId) => {
    try {
      const res = await api.borrowings.cancelRequest(reqId);
      if (res.success) {
        addToast('Borrow request cancelled', 'success');
        loadUserData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to cancel', 'error');
    }
  };

  // Respond to Exchange Offer
  const handleRespondExchange = async (offerId, action) => {
    try {
      const res = await api.exchanges.respondRequest(offerId, { action });
      if (res.success) {
        addToast(`Exchange proposal ${action}ed!`, 'success');
        loadUserData();
      }
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    }
  };

  // Cancel Outgoing Offer
  const handleCancelOutgoingOffer = async (offerId) => {
    try {
      const res = await api.exchanges.cancelRequest(offerId);
      if (res.success) {
        addToast('Exchange offer cancelled', 'success');
        loadUserData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to cancel offer', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
              alt={user?.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-forest-800 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif font-black text-stone-900">{user?.name}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-forest-100 text-forest-800">
                  {user?.role} Member
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{user?.email}</p>
              {user?.address && (
                <p className="text-xs text-stone-600 mt-1">{user.address}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditProfileOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-500" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => setPassModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
            >
              <Key className="w-3.5 h-3.5 text-stone-500" />
              <span>Password</span>
            </button>
          </div>
        </div>

        {user?.bio && (
          <p className="text-xs text-stone-600 mt-4 pt-4 border-t border-stone-100 italic">
            "{user.bio}"
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200">
        {[
          { id: 'borrowing', label: `Active Loans (${activeLoans.length})`, icon: BookOpen },
          { id: 'history', label: `Borrow Requests & History (${borrowRequests.length})`, icon: Clock },
          { id: 'donations', label: `My Donations (${donations.length})`, icon: HeartHandshake },
          { id: 'exchanges', label: `My Exchanges (${exchangeListings.length})`, icon: Repeat },
          { id: 'notifications', label: `Notifications (${notifications.length})`, icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-forest-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Active Loans */}
      {activeTab === 'borrowing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-stone-900">Currently Borrowed Books</h2>
            <Link
              to="/library"
              className="text-xs font-semibold text-forest-700 hover:underline"
            >
              Borrow More Books
            </Link>
          </div>

          {activeLoans.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif font-bold text-stone-800 text-lg">No active loans</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                You do not have any books checked out right now. Explore the digital library to discover great literature.
              </p>
              <Link
                to="/library"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-forest-800 text-white text-xs font-semibold"
              >
                Explore Library
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeLoans.map((loan) => (
                <div
                  key={loan.id}
                  className={`bg-white rounded-3xl border p-6 shadow-card flex flex-col justify-between ${
                    loan.is_overdue
                      ? 'border-rose-300 ring-2 ring-rose-100'
                      : 'border-stone-200/90'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <StatusBadge status={loan.status} />
                      <span className="font-mono text-xs text-stone-400 font-semibold">
                        {loan.copy_number}
                      </span>
                    </div>

                    <div className="flex gap-4">
                      <img
                        src={loan.cover_image}
                        alt={loan.book_title}
                        className="w-16 h-24 object-cover rounded-xl shadow-sm shrink-0 border border-stone-200"
                      />
                      <div>
                        <h4 className="font-serif font-bold text-base text-stone-900 line-clamp-1">
                          {loan.book_title}
                        </h4>
                        <p className="text-xs text-stone-500">by {loan.book_author}</p>

                        <div className="mt-3 space-y-1 text-xs">
                          <p className="text-stone-500">
                            Borrowed: {new Date(loan.borrow_date).toLocaleDateString()}
                          </p>
                          <p
                            className={`font-semibold ${
                              loan.is_overdue ? 'text-rose-600 flex items-center gap-1' : 'text-stone-700'
                            }`}
                          >
                            {loan.is_overdue && <AlertTriangle className="w-3.5 h-3.5" />}
                            Due Date: {new Date(loan.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-5 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">
                      {loan.status === 'return_pending'
                        ? 'Return submitted, pending confirmation'
                        : loan.is_overdue
                        ? 'Overdue! Please return as soon as possible'
                        : 'Enjoy reading!'}
                    </span>

                    {loan.status !== 'return_pending' && (
                      <button
                        onClick={() => {
                          setSelectedTxForReturn(loan);
                          setReturnModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 shadow-sm"
                      >
                        Return Book
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Borrow Requests & History */}
      {activeTab === 'history' && (
        <div className="space-y-8">
          {/* Pending Borrow Requests */}
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900 mb-4">
              Pending Borrow Requests
            </h2>
            {borrowRequests.filter((r) => r.status === 'pending').length === 0 ? (
              <p className="text-xs text-stone-400 bg-white p-6 rounded-2xl border border-stone-200 text-center">
                No pending requests. All previous requests have been reviewed.
              </p>
            ) : (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-card">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-cream-100 text-stone-600 uppercase text-[11px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Book Title</th>
                      <th className="py-3 px-4">Requested Copy</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {borrowRequests
                      .filter((r) => r.status === 'pending')
                      .map((req) => (
                        <tr key={req.id}>
                          <td className="py-3 px-4 font-serif font-bold text-stone-900">
                            {req.book_title}
                          </td>
                          <td className="py-3 px-4 font-mono">{req.copy_number}</td>
                          <td className="py-3 px-4">{req.requested_duration_days} Days</td>
                          <td className="py-3 px-4">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleCancelBorrowRequest(req.id)}
                              className="px-3 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold"
                            >
                              Cancel Request
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Past Loans History */}
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900 mb-4">
              Previous Loan History
            </h2>
            {historyLoans.length === 0 ? (
              <p className="text-xs text-stone-400 bg-white p-6 rounded-2xl border border-stone-200 text-center">
                No past returned loans recorded yet.
              </p>
            ) : (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-card">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-cream-100 text-stone-600 uppercase text-[11px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Book Title</th>
                      <th className="py-3 px-4">Copy</th>
                      <th className="py-3 px-4">Borrowed Date</th>
                      <th className="py-3 px-4">Returned Date</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {historyLoans.map((h) => (
                      <tr key={h.id}>
                        <td className="py-3 px-4 font-serif font-bold text-stone-900">
                          {h.book_title}
                        </td>
                        <td className="py-3 px-4 font-mono">{h.copy_number}</td>
                        <td className="py-3 px-4 text-stone-500">
                          {new Date(h.borrow_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-emerald-700 font-medium">
                          {h.returned_date ? new Date(h.returned_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <StatusBadge status="returned" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: My Donations */}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-stone-900">
              Donated Books & Curations
            </h2>
            <Link
              to="/donate"
              className="px-4 py-2 rounded-xl bg-forest-800 text-white text-xs font-semibold hover:bg-forest-700"
            >
              Donate Another Book
            </Link>
          </div>

          {donations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
              <HeartHandshake className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif font-bold text-stone-800 text-lg">No donations yet</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Donate pre-loved books to share knowledge with students and the wider community.
              </p>
              <Link
                to="/donate"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-forest-800 text-white text-xs font-semibold"
              >
                Donate a Book
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {donations.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-3xl border border-stone-200 p-6 shadow-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-forest-700 uppercase">
                        {d.category_name}
                      </span>
                      <StatusBadge status={d.status} />
                    </div>

                    <div className="flex gap-4">
                      <img
                        src={d.cover_image}
                        alt={d.title}
                        className="w-16 h-22 object-cover rounded-xl shadow-sm border border-stone-200 shrink-0"
                      />
                      <div>
                        <h4 className="font-serif font-bold text-base text-stone-900">{d.title}</h4>
                        <p className="text-xs text-stone-500">by {d.author}</p>
                        <span className="inline-block mt-2 text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                          Condition: {d.condition}
                        </span>
                      </div>
                    </div>

                    {d.admin_notes && (
                      <div className="mt-4 p-3 rounded-xl bg-cream-50 border border-stone-200 text-xs text-stone-600">
                        <span className="font-bold text-stone-700 block">Librarian Note:</span>
                        {d.admin_notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 text-[11px] text-stone-400">
                    Submitted on {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: My Exchanges */}
      {activeTab === 'exchanges' && (
        <div className="space-y-8">
          {/* Incoming Offers */}
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900 mb-4">
              Incoming Offers on Your Books ({incomingOffers.filter((o) => o.status === 'pending').length} Pending)
            </h2>

            {incomingOffers.length === 0 ? (
              <p className="text-xs text-stone-400 bg-white p-6 rounded-2xl border border-stone-200 text-center">
                No incoming exchange proposals received yet.
              </p>
            ) : (
              <div className="space-y-4">
                {incomingOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-white p-6 rounded-3xl border border-stone-200 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-stone-800">
                          From: {offer.proposer_name} ({offer.proposer_email})
                        </span>
                        <StatusBadge status={offer.status} />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-stone-500">
                          For your book:{' '}
                          <span className="font-serif font-bold text-stone-900">{offer.listing_title}</span>
                        </p>
                        <p className="text-sm font-semibold text-stone-900">
                          Offered: {offer.offered_title} by {offer.offered_author} ({offer.offered_condition})
                        </p>
                        {offer.message && (
                          <p className="text-xs text-stone-600 italic">"{offer.message}"</p>
                        )}
                      </div>
                    </div>

                    {offer.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRespondExchange(offer.id, 'accept')}
                          className="px-4 py-2 rounded-xl bg-forest-800 text-white text-xs font-semibold hover:bg-forest-700 shadow-sm"
                        >
                          Accept Swap
                        </button>
                        <button
                          onClick={() => handleRespondExchange(offer.id, 'reject')}
                          className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Offers */}
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900 mb-4">
              Your Outgoing Exchange Proposals
            </h2>

            {outgoingOffers.length === 0 ? (
              <p className="text-xs text-stone-400 bg-white p-6 rounded-2xl border border-stone-200 text-center">
                You haven't proposed any book exchanges yet.
              </p>
            ) : (
              <div className="space-y-4">
                {outgoingOffers.map((out) => (
                  <div
                    key={out.id}
                    className="bg-white p-6 rounded-3xl border border-stone-200 shadow-card flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-serif font-bold text-sm text-stone-900">
                          Requested: {out.listing_title}
                        </span>
                        <StatusBadge status={out.status} />
                      </div>
                      <p className="text-xs text-stone-600">
                        You offered: <strong>{out.offered_title}</strong> by {out.offered_author}
                      </p>
                    </div>

                    {out.status === 'pending' && (
                      <button
                        onClick={() => handleCancelOutgoingOffer(out.id)}
                        className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                      >
                        Cancel Proposal
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-stone-900">Library Notifications</h2>
          <div className="bg-white rounded-3xl border border-stone-200 shadow-card divide-y divide-stone-100 overflow-hidden">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No notifications to display.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900 text-sm">{n.title}</span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-forest-700" />
                      )}
                    </div>
                    <p className="text-xs text-stone-600">{n.message}</p>
                    <span className="text-[10px] text-stone-400 block pt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="p-1.5 text-stone-500 hover:text-forest-800 rounded-lg"
                        title="Mark Read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Profile */}
      <Modal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Update Profile Information"
      >
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Phone Number</label>
            <input
              type="text"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Address / Location</label>
            <input
              type="text"
              value={profileForm.address}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Reading Bio</label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setEditProfileOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 rounded-xl"
            >
              Save Profile
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Change Password */}
      <Modal
        isOpen={passModalOpen}
        onClose={() => setPassModalOpen(false)}
        title="Change Security Password"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Current Password</label>
            <input
              type="password"
              required
              value={passForm.current_password}
              onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={passForm.new_password}
              onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setPassModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 rounded-xl"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Return Book Request */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Submit Book Return Request"
      >
        {selectedTxForReturn && (
          <form onSubmit={handleSubmitReturn} className="space-y-4">
            <div className="p-3 bg-cream-50 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-400">Book to Return</span>
              <p className="font-serif font-bold text-stone-900">{selectedTxForReturn.book_title}</p>
              <p className="font-mono text-xs text-stone-500">Copy: {selectedTxForReturn.copy_number}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Book Condition / Return Notes
              </label>
              <textarea
                rows={3}
                placeholder="Confirm that pages are intact and no water damage occurred..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReturn}
                className="px-5 py-2 text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 rounded-xl disabled:opacity-50"
              >
                {submittingReturn ? 'Submitting...' : 'Confirm Return Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
