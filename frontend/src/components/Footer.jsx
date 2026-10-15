import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, Shield, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-forest-900 text-stone-300 pt-16 pb-12 border-t border-forest-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-700 flex items-center justify-center text-white">
                <BookOpen className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-serif font-bold text-2xl text-cream-50">BookBridge</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Bridging communities, schools, and readers through free public digital curation, book donations, and peer-to-peer literary exchanges.
            </p>
            <div className="flex items-center gap-2 text-xs text-forest-500 font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Free Knowledge for Everyone</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="font-serif font-semibold text-white text-sm mb-4">Digital Catalog</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/library?category=fiction" className="hover:text-cream-100 transition-colors">
                  Fiction & Literature
                </Link>
              </li>
              <li>
                <Link to="/library?category=science-technology" className="hover:text-cream-100 transition-colors">
                  Science & Technology
                </Link>
              </li>
              <li>
                <Link to="/library?category=history-biography" className="hover:text-cream-100 transition-colors">
                  History & Biographies
                </Link>
              </li>
              <li>
                <Link to="/library?category=philosophy" className="hover:text-cream-100 transition-colors">
                  Philosophy & Ethics
                </Link>
              </li>
              <li>
                <Link to="/library?available=true" className="hover:text-cream-100 transition-colors">
                  Available Now to Borrow
                </Link>
              </li>
            </ul>
          </div>

          {/* Community & Exchange */}
          <div>
            <h5 className="font-serif font-semibold text-white text-sm mb-4">Community Actions</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/donate" className="hover:text-cream-100 transition-colors">
                  Donate Books to Library
                </Link>
              </li>
              <li>
                <Link to="/exchanges" className="hover:text-cream-100 transition-colors">
                  Peer Book Exchange Market
                </Link>
              </li>
              <li>
                <Link to="/profile?tab=borrowing" className="hover:text-cream-100 transition-colors">
                  Return Borrowed Books
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-cream-100 transition-colors">
                  Member Reading History
                </Link>
              </li>
            </ul>
          </div>

          {/* Library Trust & Access */}
          <div className="space-y-3">
            <h5 className="font-serif font-semibold text-white text-sm mb-4">Library Hours & Trust</h5>
            <div className="p-4 rounded-xl bg-forest-800/60 border border-forest-700/60 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Shield className="w-4 h-4" />
                <span>Verified Public Institution</span>
              </div>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                All community donations are reviewed by accredited librarians before catalog distribution.
              </p>
            </div>
            <p className="text-[11px] text-stone-500">
              Need assistance? Email: <span className="text-stone-300">support@bookbridge.org</span>
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-forest-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© 2026 BookBridge Digital Public Library. Built with care for community learning.</p>
          <div className="flex items-center gap-1 text-stone-400">
            <span>Designed with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
            <span>for public literacy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
