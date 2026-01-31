'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function LandingMidSection() {
  const [logoError, setLogoError] = useState(false);

  return (
    <section className="container mx-auto px-4 py-16 md:py-20">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-6">
          Tix is an event ticketing platform for memorable experiences in Africa. Sign up to our
          newsletter to receive information about upcoming events.
        </p>
        <p className="text-primary-900 font-semibold mb-2">Join the waitlist</p>
        <p className="text-gray-600 text-sm mb-6">
          Be the first to know when we launch. Get early access and updates.
        </p>
        <Link
          href="/waitlist"
          className="inline-block px-6 py-3 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition mb-8"
        >
          Join waitlist
        </Link>
        {!logoError ? (
          <Image
            src="/Logo-beta.png"
            alt="getiickets"
            width={140}
            height={36}
            className="h-9 w-auto object-contain mx-auto"
            unoptimized
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="text-xl font-bold text-primary-900">getiickets</span>
        )}
      </div>
    </section>
  );
}
