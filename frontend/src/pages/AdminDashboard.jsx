import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { 
  Users, BookOpen, Clock, AlertTriangle, CheckCircle, 
  XCircle, PlusCircle, Trash2, Edit3, Shield, RefreshCw, 
  BarChart3, Layers, BookCheck, ArrowRightLeft, Search, Eye 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';

export default function AdminDashboard() {
  const { addToast } = useNotifications();

  const [activeTab, setActiveTab] = useState('overview'); // overview, books, borrows, returns, donations, overdue, users
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState({ category_data: [], trend_data: [] });
  const [loading, setLoading] = useState(true);

  // Data states
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Modals & form state
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category_id: 1,
    isbn: '',
    description: '',
    cover_image: '',
    publisher: '',
    publication_year: 2024,
    page_count: 300,
    copies_count: 2,
  });

  const [addCopyModalOpen, setAddCopyModalOpen] = useState(false);
  const [selectedBookForCopy, setSelectedBookForCopy] = useState(null);
  const [copyCondition, setCopyCondition] = useState('Good');

  const [adminNoteModal, setAdminNoteModal] = useState({
    open: false,
    type: '', // 'borrow_review', 'donation_review'
    id: null,
    status: '',
    notes: '',
  });

  const fetchOverview = async () => {
    try {
      const [ovRes, chRes] = await Promise.all([
        api.admin.getOverview(),
        api.admin.getCharts(),
      ]);
      if (ovRes.success) setStats(ovRes.stats || {});
      if (chRes.success) setChartData(chRes);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTabData = async (tab) => {
    try {
      if (tab === 'books') {
        const [bRes, cRes] = await Promise.all([
          api.books.list({ per_page: 100 }),
          api.categories.list(),
        ]);
        if (bRes.success) setBooks(bRes.books || []);
        if (cRes.success) {
          setCategories(cRes.categories || []);
          if (cRes.categories.length > 0 && !bookForm.category_id) {
            setBookForm((prev) => ({ ...prev, category_id: cRes.categories[0].id }));
          }
        }
      } else if (tab === 'borrows') {
        const res = await api.borrowings.getRequests(true);
        if (res.success) setBorrowRequests(res.requests || []);
      } else if (tab === 'returns') {
        const res = await api.returns.getRequests(true);
        if (res.success) setReturnRequests(res.return_requests || []);
      } else if (tab === 'donations') {
        const res = await api.donations.list(true);
        if (res.success) setDonations(res.donations || []);
      } else if (tab === 'overdue') {
        const res = await api.admin.getOverdue();
        if (res.success) setOverdueList(res.overdue_transactions || []);
      } else if (tab === 'users') {
        const res = await api.admin.getUsers();
        if (res.success) setUsersList(res.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchOverview().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  // Book Handlers
  const handleOpenBookModal = (book = null) => {
    if (book) {
      setEditingBook(book);
      setBookForm({
        title: book.title,
        author: book.author,
        category_id: book.category_id,
        isbn: book.isbn || '',
        description: book.description || '',
        cover_image: book.cover_image || '',
        publisher: book.publisher || '',
        publication_year: book.publication_year || 2024,
        page_count: book.page_count || 300,
        copies_count: 1,
      });
    } else {
      setEditingBook(null);
      setBookForm({
        title: '',
        author: '',
        category_id: categories[0]?.id || 1,
        isbn: '',
        description: '',
        cover_image: '',
        publisher: '',
        publication_year: 2024,
        page_count: 300,
        copies_count: 2,
      });
    }
    setBookModalOpen(true);
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        const res = await api.books.update(editingBook.id, bookForm);
        if (res.success) {
          addToast('Book updated successfully', 'success');
          setBookModalOpen(false);
          loadTabData('books');
        }
      } else {
        const res = await api.books.create(bookForm);
        if (res.success) {
          addToast('Book and copies cataloged successfully', 'success');
          setBookModalOpen(false);
          loadTabData('books');
          fetchOverview();
        }
      }
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book record?')) return;
    try {
      const res = await api.books.delete(bookId);
      if (res.success) {
        addToast('Book deleted from catalog', 'success');
        loadTabData('books');
        fetchOverview();
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete book', 'error');
    }
  };

  const handleAddCopy = async (e) => {
    e.preventDefault();
    if (!selectedBookForCopy) return;
    try {
      const res = await api.books.addCopy(selectedBookForCopy.id, { condition: copyCondition });
      if (res.success) {
        addToast('New copy added to inventory', 'success');
        setAddCopyModalOpen(false);
        loadTabData('books');
        fetchOverview();
      }
    } catch (err) {
      addToast(err.message || 'Failed to add copy', 'error');
    }
  };

  // Borrow Review
  const handleReviewBorrow = async (requestId, status, notes = '') => {
    try {
      const res = await api.borrowings.reviewRequest(requestId, {
        status,
        admin_notes: notes,
      });
      if (res.success) {
        addToast(`Borrow request ${status}`, 'success');
        loadTabData('borrows');
        fetchOverview();
      }
    } catch (err) {
      addToast(err.message || 'Failed to review request', 'error');
    }
  };

  // Return Confirm
  const handleConfirmReturn = async (returnId, status = 'confirmed') => {
    try {
      const res = await api.returns.confirm(returnId, { status });
      if (res.success) {
        addToast(`Return ${status} and copy availability restored!`, 'success');
        loadTabData('returns');
        fetchOverview();
      }
    } catch (err) {
      addToast(err.message || 'Failed to confirm return', 'error');
    }
  };

  // Donation Review
  const handleReviewDonation = async (donationId, status, notes = '') => {
    try {
      const res = await api.donations.review(donationId, {
        status,
        admin_notes: notes,
      });
      if (res.success) {
        addToast(`Donation ${status}!`, 'success');
        loadTabData('donations');
        fetchOverview();
      }
    } catch (err) {
      addToast(err.message || 'Failed to review donation', 'error');
    }
  };

  // User Role
  const handleToggleUserRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change role of ${user.name} to ${newRole}?`)) return;
    try {
      const res = await api.admin.updateUserRole(user.id, newRole);
      if (res.success) {
        addToast(`User role updated to ${newRole}`, 'success');
        loadTabData('users');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update user role', 'error');
    }
  };

  const COLORS = ['#1B4332', '#2D6A4F', '#40916C', '#52B788', '#D97706', '#3B82F6', '#8B5CF6'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200 mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-700" />
            <span>Administrator Control Console</span>
          </div>
          <h1 className="text-3xl font-serif font-black text-stone-900">
            BookBridge System Administration
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage public catalog records, circulation loans, return inspections, and donations.
          </p>
        </div>

        <button
          onClick={() => {
            fetchOverview();
            loadTabData(activeTab);
            addToast('Data refreshed', 'info');
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
          <span>Refresh Stacks</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Total Books</span>
          <p className="text-2xl font-serif font-black text-stone-900 mt-1">{stats.total_books || 0}</p>
          <span className="text-[10px] text-stone-500">{stats.total_copies || 0} copies in system</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Available Copies</span>
          <p className="text-2xl font-serif font-black text-emerald-700 mt-1">{stats.available_copies || 0}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Ready to loan</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Active Loans</span>
          <p className="text-2xl font-serif font-black text-blue-800 mt-1">{stats.active_borrowings || 0}</p>
          <span className="text-[10px] text-stone-500">Currently checked out</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Overdue Books</span>
          <p className="text-2xl font-serif font-black text-rose-600 mt-1">{stats.overdue_count || 0}</p>
          <span className="text-[10px] text-rose-500 font-medium">Past due date</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Pending Requests</span>
          <p className="text-2xl font-serif font-black text-amber-700 mt-1">
            {(stats.pending_borrow_requests || 0) + (stats.pending_donations || 0) + (stats.pending_returns || 0)}
          </p>
          <span className="text-[10px] text-stone-500">Require action</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Members</span>
          <p className="text-2xl font-serif font-black text-stone-900 mt-1">{stats.total_users || 0}</p>
          <span className="text-[10px] text-stone-500">Registered readers</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200">
        {[
          { id: 'overview', label: 'Analytics & Charts', icon: BarChart3 },
          { id: 'books', label: 'Catalog & Copies', icon: BookOpen },
          { id: 'borrows', label: `Borrow Requests (${stats.pending_borrow_requests || 0})`, icon: Clock },
          { id: 'returns', label: `Return Requests (${stats.pending_returns || 0})`, icon: BookCheck },
          { id: 'donations', label: `Donations (${stats.pending_donations || 0})`, icon: PlusCircle },
          { id: 'overdue', label: `Overdue Books (${stats.overdue_count || 0})`, icon: AlertTriangle },
          { id: 'users', label: 'User Directory', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* TAB 1: Analytics & Charts */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Monthly Trend Chart */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-stone-200 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    Monthly Circulation & Community Activity
                  </h3>
                  <p className="text-xs text-stone-500">
                    Tracking borrowings, donations, and completed exchanges
                  </p>
                </div>
              </div>

              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.trend_data || []}>
                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FAF6EE',
                        borderRadius: '12px',
                        border: '1px solid #EFE9DE',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="borrowings" fill="#1B4332" name="Borrowings" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="donations" fill="#52B788" name="Donations" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="exchanges" fill="#D97706" name="Exchanges" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown Pie Chart */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-200 shadow-card space-y-4">
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Catalog Distribution by Category
                </h3>
                <p className="text-xs text-stone-500">
                  Number of books per genre
                </p>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.category_data || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {(chartData.category_data || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FAF6EE',
                        borderRadius: '12px',
                        border: '1px solid #EFE9DE',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Book Catalog & Copies Management */}
      {activeTab === 'books' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-stone-900 text-lg">
              Public Catalog Records ({books.length})
            </h3>
            <button
              onClick={() => handleOpenBookModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-800 text-white text-xs font-semibold hover:bg-forest-700 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Catalog New Book</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-cream-100 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Title & Author</th>
                    <th className="py-3 px-4">Genre</th>
                    <th className="py-3 px-4">ISBN</th>
                    <th className="py-3 px-4">Copies (Avail / Total)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {books.map((b) => (
                    <tr key={b.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.cover_image}
                            alt={b.title}
                            className="w-10 h-14 object-cover rounded shadow-sm shrink-0"
                          />
                          <div>
                            <span className="font-serif font-bold text-stone-900 block text-xs">
                              {b.title}
                            </span>
                            <span className="text-[11px] text-stone-500">by {b.author}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-forest-50 text-forest-800">
                          {b.category_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600">{b.isbn || 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold">
                        <span className={b.available_copies_count > 0 ? 'text-emerald-700' : 'text-amber-700'}>
                          {b.available_copies_count}
                        </span>
                        {' / '}
                        <span>{b.total_copies_count}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedBookForCopy(b);
                              setAddCopyModalOpen(true);
                            }}
                            className="p-1.5 text-stone-600 hover:text-forest-800 hover:bg-stone-100 rounded-lg transition-colors"
                            title="Add Physical Copy"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenBookModal(b)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                            title="Edit Book"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(b.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Book"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Borrow Requests Management */}
      {activeTab === 'borrows' && (
        <div className="space-y-6">
          <h3 className="font-serif font-bold text-stone-900 text-lg">
            Circulation Borrow Requests ({borrowRequests.length})
          </h3>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-cream-100 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Reader / Member</th>
                    <th className="py-3 px-4">Requested Book & Copy</th>
                    <th className="py-3 px-4">Loan Duration</th>
                    <th className="py-3 px-4">Request Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {borrowRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-stone-900 block">{r.user_name}</span>
                        <span className="text-[11px] text-stone-400">{r.user_email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-serif font-bold text-stone-900 block">{r.book_title}</span>
                        <span className="font-mono text-[11px] text-stone-500">{r.copy_number}</span>
                      </td>
                      <td className="py-3 px-4">{r.requested_duration_days} Days</td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(r.request_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReviewBorrow(r.id, 'approved')}
                              className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewBorrow(r.id, 'rejected')}
                              className="px-3 py-1 rounded-lg bg-rose-100 text-rose-700 font-semibold hover:bg-rose-200"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Return Requests Verification */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          <h3 className="font-serif font-bold text-stone-900 text-lg">
            Book Return Requests ({returnRequests.length})
          </h3>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-cream-100 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Reader</th>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Copy Code</th>
                    <th className="py-3 px-4">Return Condition Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Confirm Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {returnRequests.map((ret) => (
                    <tr key={ret.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-stone-900">{ret.user_name}</td>
                      <td className="py-3 px-4 font-serif font-bold text-stone-800">{ret.book_title}</td>
                      <td className="py-3 px-4 font-mono text-stone-600">{ret.copy_number}</td>
                      <td className="py-3 px-4 text-stone-600 italic">
                        {ret.condition_notes || 'No damage reported.'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={ret.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {ret.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleConfirmReturn(ret.id, 'confirmed')}
                              className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
                            >
                              Confirm Return
                            </button>
                            <button
                              onClick={() => handleConfirmReturn(ret.id, 'rejected')}
                              className="px-3 py-1 rounded-lg bg-rose-100 text-rose-700 font-semibold hover:bg-rose-200"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Donations Approvals */}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          <h3 className="font-serif font-bold text-stone-900 text-lg">
            Community Book Donations ({donations.length})
          </h3>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-cream-100 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Donor</th>
                    <th className="py-3 px-4">Book Title & Author</th>
                    <th className="py-3 px-4">Genre</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {donations.map((d) => (
                    <tr key={d.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-stone-900 block">{d.donor_name}</span>
                        <span className="text-[11px] text-stone-400">{d.donor_email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-serif font-bold text-stone-900 block">{d.title}</span>
                        <span className="text-[11px] text-stone-500">by {d.author}</span>
                      </td>
                      <td className="py-3 px-4">{d.category_name}</td>
                      <td className="py-3 px-4 font-medium">{d.condition}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {d.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReviewDonation(d.id, 'approved', 'Approved and cataloged')}
                              className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
                            >
                              Approve & Catalog
                            </button>
                            <button
                              onClick={() => handleReviewDonation(d.id, 'rejected', 'Does not meet current catalog requirements')}
                              className="px-3 py-1 rounded-lg bg-rose-100 text-rose-700 font-semibold hover:bg-rose-200"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Overdue Books */}
      {activeTab === 'overdue' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-lg">
                Overdue Loans Alert ({overdueList.length})
              </h3>
              <p className="text-xs text-stone-500">
                Borrowings that have surpassed their agreed return dates.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-red-50 text-red-800 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Borrower</th>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Copy Code</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {overdueList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-stone-400">
                        No overdue books! All borrowings are on schedule.
                      </td>
                    </tr>
                  ) : (
                    overdueList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-red-50/20 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-stone-900 block">{tx.user_name}</span>
                          <span className="text-[11px] text-stone-400">{tx.user_email}</span>
                        </td>
                        <td className="py-3 px-4 font-serif font-bold text-stone-900">
                          {tx.book_title}
                        </td>
                        <td className="py-3 px-4 font-mono">{tx.copy_number}</td>
                        <td className="py-3 px-4 font-semibold text-red-600">
                          {new Date(tx.due_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status="overdue" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => addToast(`Overdue reminder notice queued for ${tx.user_name}`, 'info')}
                            className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-[11px]"
                          >
                            Send Reminder
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <h3 className="font-serif font-bold text-stone-900 text-lg">
            Registered Library Members ({usersList.length})
          </h3>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-cream-100 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Name & Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Role Permission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover border border-stone-200"
                          />
                          <div>
                            <span className="font-semibold text-stone-900 block">{u.name}</span>
                            <span className="text-[11px] text-stone-400">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-500">{u.phone || 'N/A'}</td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleUserRole(u)}
                          className="px-3 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 font-semibold text-[11px]"
                        >
                          Switch to {u.role === 'admin' ? 'Regular User' : 'Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Book */}
      <Modal
        isOpen={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        title={editingBook ? 'Edit Book Record' : 'Catalog New Book into Library'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveBook} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
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
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Category *
              </label>
              <select
                value={bookForm.category_id}
                onChange={(e) => setBookForm({ ...bookForm, category_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                ISBN
              </label>
              <input
                type="text"
                value={bookForm.isbn}
                onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Publisher
              </label>
              <input
                type="text"
                value={bookForm.publisher}
                onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Year
              </label>
              <input
                type="number"
                value={bookForm.publication_year}
                onChange={(e) => setBookForm({ ...bookForm, publication_year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Initial Copies
              </label>
              <input
                type="number"
                min="1"
                disabled={!!editingBook}
                value={bookForm.copies_count}
                onChange={(e) => setBookForm({ ...bookForm, copies_count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm disabled:bg-stone-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
              Cover Image URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={bookForm.cover_image}
              onChange={(e) => setBookForm({ ...bookForm, cover_image: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={bookForm.description}
              onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setBookModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 rounded-xl"
            >
              {editingBook ? 'Save Changes' : 'Catalog Book'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Copy to existing book */}
      <Modal
        isOpen={addCopyModalOpen}
        onClose={() => setAddCopyModalOpen(false)}
        title="Add Physical Copy to Book Inventory"
      >
        {selectedBookForCopy && (
          <form onSubmit={handleAddCopy} className="space-y-4">
            <div className="p-3 bg-cream-50 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold uppercase text-stone-400">Book Title</span>
              <p className="font-serif font-bold text-stone-900 text-sm">{selectedBookForCopy.title}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Copy Condition
              </label>
              <select
                value={copyCondition}
                onChange={(e) => setCopyCondition(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm bg-white"
              >
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setAddCopyModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 rounded-xl"
              >
                Add Copy
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
