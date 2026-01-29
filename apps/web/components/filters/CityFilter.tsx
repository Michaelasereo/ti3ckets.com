'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const cities = [
  'Lagos',
  'Abuja',
  'Port Harcourt',
  'Ibadan',
  'Kano',
  'Accra',
  'Nairobi',
];

export default function CityFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCity = searchParams.get('city');

  const handleCityChange = (city: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (city === 'all') {
      params.delete('city');
    } else {
      params.set('city', city);
    }
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="font-semibold">City:</label>
      <select
        value={selectedCity || 'all'}
        onChange={(e) => handleCityChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
      >
        <option value="all">All Cities</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </div>
  );
}
