import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  const normalized = (status || '').toLowerCase();

  const configs = {
    available: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Available' },
    borrowed: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Borrowed' },
    reserved: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Reserved' },
    pending: { bg: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Pending Review' },
    approved: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Approved' },
    rejected: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rejected' },
    active: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Active Borrow' },
    return_pending: { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Return Pending' },
    returned: { bg: 'bg-stone-100 text-stone-700 border-stone-200', label: 'Returned' },
    overdue: { bg: 'bg-red-50 text-red-700 border-red-200 animate-pulse', label: 'Overdue' },
    exchanged: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Exchanged' },
    cancelled: { bg: 'bg-stone-100 text-stone-500 border-stone-200', label: 'Cancelled' },
  };

  const current = configs[normalized] || { bg: 'bg-stone-100 text-stone-700 border-stone-200', label: status };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {current.label}
    </span>
  );
}
