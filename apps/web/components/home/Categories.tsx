'use client';

import Link from 'next/link';

const categories = [
  { name: 'Concerts', icon: '🎵', slug: 'concert' },
  { name: 'Sports', icon: '⚽', slug: 'sports' },
  { name: 'Conferences', icon: '💼', slug: 'conference' },
  { name: 'Festivals', icon: '🎪', slug: 'festival' },
  { name: 'Theater', icon: '🎭', slug: 'theater' },
  { name: 'Workshops', icon: '🛠️', slug: 'workshop' },
];

export default function Categories() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-6">Browse by Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/events?category=${category.slug}`}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center hover:border-primary-600 hover:shadow-lg transition"
          >
            <div className="text-4xl mb-2">{category.icon}</div>
            <div className="font-semibold">{category.name}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
