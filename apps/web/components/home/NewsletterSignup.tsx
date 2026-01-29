'use client';

import { useState } from 'react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter signup
    setSubmitted(true);
    setEmail('');
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <section className="mb-16 bg-primary-800 text-white rounded-lg p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Get Notified About Events</h2>
        <p className="mb-6 text-primary-200">
          Subscribe to our newsletter and never miss an event in your city
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-primary-800 rounded-lg font-semibold hover:bg-primary-100 transition"
            >
              Subscribe
            </button>
        </form>
        {submitted && (
          <p className="mt-4 text-primary-200">Thanks for subscribing!</p>
        )}
      </div>
    </section>
  );
}
