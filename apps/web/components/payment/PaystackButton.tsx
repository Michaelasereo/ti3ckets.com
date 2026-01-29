'use client';

import { useState, useEffect } from 'react';
import { paymentsApi } from '@/lib/api';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface PaystackButtonProps {
  email: string;
  amount: number; // in Naira
  metadata: {
    orderId: string;
    orderNumber: string;
  };
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

export default function PaystackButton({
  email,
  amount,
  metadata,
  onSuccess,
  onClose,
}: PaystackButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  useEffect(() => {
    // Check if Paystack is already loaded
    if (typeof window !== 'undefined' && window.PaystackPop) {
      setPaystackLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existingScript) {
      // Wait a bit for script to load
      const checkInterval = setInterval(() => {
        if (window.PaystackPop) {
          setPaystackLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (window.PaystackPop) {
          setPaystackLoaded(true);
        }
      }, 5000);
      
      return () => clearInterval(checkInterval);
    }

    // Load Paystack inline JS
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      // Wait a bit for PaystackPop to be available
      const checkInterval = setInterval(() => {
        if (window.PaystackPop) {
          setPaystackLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (window.PaystackPop) {
          setPaystackLoaded(true);
        } else {
          console.error('Paystack script loaded but PaystackPop not available');
        }
      }, 5000);
    };
    script.onerror = () => {
      console.error('Failed to load Paystack script');
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount - it might be needed by other components
    };
  }, []);

  const handlePayment = async () => {
    console.log('Payment button clicked', { amount, email, metadata, publicKey: publicKey ? 'Set' : 'Not set' });
    
    // Validate email
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Handle free tickets (amount is 0)
      if (amount === 0) {
        // Initialize payment with backend (will return mock reference for free tickets)
        const response = await paymentsApi.initialize({
          orderId: metadata.orderId,
          email,
          amount: 0,
          metadata,
        });

        if (response.data.success && response.data.data) {
          // For free tickets, immediately call onSuccess with the reference
          onSuccess(response.data.data.reference);
        } else {
          throw new Error('Failed to initialize free ticket order');
        }
        setIsLoading(false);
        return;
      }

      console.log('Initializing payment with backend...', { orderId: metadata.orderId, email, amount });
      
      // Initialize payment with backend first (with timeout)
      const initPromise = paymentsApi.initialize({
        orderId: metadata.orderId,
        email,
        amount,
        metadata,
      });

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Payment initialization timed out. Please try again.')), 35000);
      });

      const response = await Promise.race([initPromise, timeoutPromise]) as any;

      console.log('Payment initialization response:', response.data);

      if (!response.data.success || !response.data.data) {
        console.error('Payment initialization failed:', response.data);
        throw new Error(response.data.error || 'Failed to initialize payment');
      }

      // Check if Paystack is loaded
      if (!window.PaystackPop) {
        console.error('PaystackPop not available');
        throw new Error('Paystack script not loaded. Please refresh the page.');
      }

      console.log('Setting up Paystack popup...', {
        key: publicKey ? 'Set' : 'Not set',
        reference: response.data.data.reference,
        amount: amount * 100,
      });

      // Use Paystack inline popup
      // Note: callback must be a regular function, not async
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email,
        amount: amount * 100, // Convert to kobo
        ref: response.data.data.reference,
        metadata: {
          orderId: metadata.orderId,
          orderNumber: metadata.orderNumber,
        },
        currency: 'NGN',
        callback: function(paymentResponse: any) {
          // Verify payment with backend (handle async inside regular function)
          console.log('Payment callback triggered:', paymentResponse);
          paymentsApi.verify(paymentResponse.reference)
            .then((verified) => {
              if (verified.data.success) {
                onSuccess(paymentResponse.reference);
              } else {
                alert('Payment verification failed. Please contact support.');
                setIsLoading(false);
              }
            })
            .catch((error) => {
              console.error('Verification error:', error);
              alert('Payment verification failed. Please contact support.');
              setIsLoading(false);
            });
        },
        onClose: function() {
          setIsLoading(false);
          onClose();
        },
      });

      console.log('Opening Paystack iframe...');
      handler.openIframe();
      console.log('Paystack iframe opened');
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to initialize payment. Please try again.';
      alert(errorMessage);
      setIsLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p className="text-yellow-800">Paystack public key not configured</p>
      </div>
    );
  }

  if (!paystackLoaded) {
    return (
      <button
        disabled
        className="w-full bg-gray-400 text-white font-bold py-3 px-4 rounded-lg cursor-not-allowed"
      >
        Loading payment...
      </button>
    );
  }

  // Check if Paystack is actually available (double check)
  if (typeof window !== 'undefined' && !window.PaystackPop && paystackLoaded) {
    console.warn('Paystack script loaded but PaystackPop not available');
  }

  // For free tickets, show "Complete Order" button
  if (amount === 0) {
    return (
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Complete Order (Free)'}
      </button>
    );
  }

  return (
    <button
      onClick={handlePayment}
      disabled={isLoading}
      className="w-full px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Processing...' : `Pay ${amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}`}
    </button>
  );
}
