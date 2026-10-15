import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Clock } from 'lucide-react';

export default function BookCard({ book, onQuickBorrow }) {
  const isAvailable = book.is_available && book.available_copies_count > 0;

  return (
    <div className="group bg-white rounded-2xl border border-stone-200/80 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
      {/* Cover image container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-cream-100 flex items-center justify-center">
        <img
          src={book.cover_image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600'}
          alt={book.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600';
          }}
        />

        {/* Gradient shadow for book spine feeling */}
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-900/80 text-white backdrop-blur-md shadow-sm">
            {book.category_name || 'Literature'}
          </span>
        </div>

        {/* Availability Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm ${
              isAvailable
                ? 'bg-emerald-900/85 text-emerald-100'
                : 'bg-amber-900/85 text-amber-100'
            }`}
          >
            {isAvailable ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isAvailable ? `${book.available_copies_count} Available` : 'All Borrowed'}
          </span>
        </div>
      </div>

      {/* Book details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-serif font-bold text-lg text-stone-900 line-clamp-1 group-hover:text-forest-700 transition-colors">
            {book.title}
          </h4>
          <p className="text-sm font-medium text-stone-500 mt-1 line-clamp-1">
            by {book.author}
          </p>

          <p className="text-xs text-stone-600 mt-3 line-clamp-2 leading-relaxed">
            {book.description || 'A valuable addition to the public library catalog.'}
          </p>
        </div>

        <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between gap-2">
          <Link
            to={`/library/${book.id}`}
            className="text-xs font-semibold text-stone-600 hover:text-forest-800 transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Details</span>
          </Link>

          {isAvailable ? (
            <button
              onClick={() => onQuickBorrow ? onQuickBorrow(book) : null}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-forest-800 text-white hover:bg-forest-700 active:scale-95 transition-all shadow-sm"
            >
              Borrow Copy
            </button>
          ) : (
            <span className="text-xs text-stone-400 font-medium italic">
              Waitlist available
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
