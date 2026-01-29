'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'concert', label: 'Concerts' },
  { value: 'sports', label: 'Sports' },
  { value: 'conference', label: 'Conferences' },
  { value: 'festival', label: 'Festivals' },
  { value: 'theater', label: 'Theater' },
  { value: 'workshop', label: 'Workshops' },
];

export default function CategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get('category');

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === 'all') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="font-semibold">Category:</label>
      <select
        value={selectedCategory || 'all'}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
      >
        {categories.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>
    </div>
  );
}
