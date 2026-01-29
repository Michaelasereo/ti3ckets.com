'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function LandingMidSection() {
  const [logoError, setLogoError] = useState(false);

  return (
    <section className="container mx-auto px-4 py-16 md:py-20">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-8">
          Tix is an event ticketing platform for memorable experiences in Africa. Sign up to our
          newsletter to receive information about upcoming events.
        </p>
        {!logoError ? (
          <Image
            src="/Logo.png"
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
