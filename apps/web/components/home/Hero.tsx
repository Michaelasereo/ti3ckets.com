'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hero1Error, setHero1Error] = useState(false);
  const [hero2Error, setHero2Error] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push('/events');
    }
  };

  return (
    <section className="bg-white">
      {/* Split hero images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-w-6xl mx-auto">
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[280px] bg-gray-900 overflow-hidden">
          {!hero1Error ? (
            <Image
              src="/png%201.png"
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              unoptimized
              onError={() => setHero1Error(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900 to-primary-800 flex items-center justify-center">
              <span className="text-6xl font-mono font-bold text-white/20">#380</span>
            </div>
          )}
        </div>
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[280px] bg-primary-100 overflow-hidden">
          {!hero2Error ? (
            <Image
              src="/png%202.png"
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              unoptimized
              onError={() => setHero2Error(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-primary-100 flex items-center justify-center">
              <span className="text-4xl font-mono text-primary-500">Tix</span>
            </div>
          )}
        </div>
      </div>

      {/* Headline + search */}
      <div className="container mx-auto px-4 py-10 md:py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-primary-900 mb-3 text-center">
          Discover Amazing Events
        </h1>
        <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          Get your tickets for concerts, sports, conferences, festivals & more
        </p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Browse events by categories"
              className="flex-1 px-5 py-3.5 rounded-xl border border-gray-300 text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition shrink-0"
            >
              Search
            </button>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            <button
              type="button"
              onClick={() => router.push('/events')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              aria-label="Filters"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm">Filters</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm">Nigeria</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
