'use client';

import Link from 'next/link';
import { useState } from 'react';

const LAUNCH_MODE = process.env.NEXT_PUBLIC_LAUNCH_MODE !== 'false';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setEmail('');
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (LAUNCH_MODE) {
    return (
      <footer className="bg-primary-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="border-t border-white/10 pt-6">
            <p className="text-sm text-white/60 text-center">
              Copyright © {new Date().getFullYear()}. ti3cket.com. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-primary-900 text-white">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Social Media */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-4">
              Social Media
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white/90 transition"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white/90 transition"
                >
                  TikTok
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white/90 transition"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white/90 transition"
                >
                  X
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/events" className="hover:text-white/90 transition">
                  Browse Events
                </Link>
              </li>
              <li>
                <Link href="/organizer/signup" className="hover:text-white/90 transition">
                  Sell Tickets
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="hover:text-white/90 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white/90 transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white/90 transition">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* getiickets newsletter */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-4">
              getiickets newsletter
            </h3>
            <p className="text-white/80 text-sm mb-4">
              Tix is an event ticketing platform for memorable experiences in Africa. Sign up to our
              newsletter to receive information about upcoming events.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-primary-800 hover:bg-primary-700 text-white font-medium rounded-lg transition"
              >
                Subscribe
              </button>
            </form>
            {submitted && (
              <p className="mt-2 text-sm text-white/70">Thanks for subscribing!</p>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8">
          <p className="text-sm text-white/60">
            Copyright © {new Date().getFullYear()}. ti3cket.com. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
