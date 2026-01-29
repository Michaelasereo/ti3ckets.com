'use client';

export default function FeaturedEvents() {
  // This will be implemented to fetch real events
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-6">Featured Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder - will be replaced with real event data */}
        <div className="bg-gray-100 rounded-lg p-6 h-64 flex items-center justify-center">
          <p className="text-gray-500">Featured events will appear here</p>
        </div>
        <div className="bg-gray-100 rounded-lg p-6 h-64 flex items-center justify-center">
          <p className="text-gray-500">Featured events will appear here</p>
        </div>
        <div className="bg-gray-100 rounded-lg p-6 h-64 flex items-center justify-center">
          <p className="text-gray-500">Featured events will appear here</p>
        </div>
      </div>
    </section>
  );
}
