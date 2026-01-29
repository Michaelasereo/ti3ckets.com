'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/ui/PageContainer';

/**
 * Legacy checkout page - redirects to new two-step checkout flow
 * This maintains backward compatibility for any direct links to /checkout
 */
export default function CheckoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if there's a cart in sessionStorage
    const cartData = sessionStorage.getItem('cart');
    
    if (cartData) {
      // Redirect to Step 1 of the new checkout flow
      router.replace('/checkout/step1');
    } else {
      // No cart, redirect to events page
      router.replace('/events');
    }
  }, [router]);

  return (
    <PageContainer maxWidth="4xl">
      <p className="text-gray-600">Redirecting to checkout...</p>
    </PageContainer>
  );
}
