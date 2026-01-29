'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventsApi, ticketsApi, promoCodeApi } from '@/lib/api';
import { formatCurrency } from '@getiickets/shared';
import PageContainer from '@/components/ui/PageContainer';
import OrderSummary from '@/components/checkout/OrderSummary';
import StepIndicator from '@/components/checkout/StepIndicator';

export default function CheckoutStep1Page() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reserving, setReserving] = useState(false);

  // Ticket selection state
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeError, setPromoCodeError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Pricing
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Initialize selected tickets from cart on initial load only (use a ref to track initialization)
  const initializedRef = useRef(false);

  // Calculate totalQuantity using useMemo (must be before any early returns per Rules of Hooks)
  const totalQuantity = useMemo(() => {
    const total = Object.values(selectedTickets)
      .filter((qty) => qty !== undefined && qty !== null && qty > 0)
      .reduce((sum, qty) => sum + Number(qty), 0);
    console.log('totalQuantity calculated:', total, 'from selectedTickets:', selectedTickets);
    return total;
  }, [selectedTickets]);

  // Calculate disabled state and reason using useMemo for clarity and performance
  const { isDisabled, disabledReason } = useMemo(() => {
    // If no tickets selected, disable
    if (totalQuantity === 0) {
      return { isDisabled: true, disabledReason: 'Select tickets to continue' };
    }
    
    // Button should be enabled
    return { isDisabled: false, disabledReason: '' };
  }, [totalQuantity]);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    if (cart && event && !initializedRef.current) {
      if (cart.tickets && cart.tickets.length > 0) {
        const initialTickets: Record<string, number> = {};
        cart.tickets.forEach((t: any) => {
          initialTickets[t.ticketTypeId] = t.quantity;
        });
        setSelectedTickets(initialTickets);
      }
      initializedRef.current = true;
    }
  }, [cart, event]);

  useEffect(() => {
    if (cart && event) {
      calculatePricing();
    }
  }, [selectedTickets]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('State update:', {
      selectedTickets,
      totalQuantity,
      isDisabled,
    });
  }, [selectedTickets, totalQuantity, isDisabled]);


  const loadCart = async () => {
    try {
      const cartData = sessionStorage.getItem('cart');
      if (!cartData) {
        router.push('/events');
        return;
      }

      const cartObj = JSON.parse(cartData);
      setCart(cartObj);

      // Load event details
      // Try by slug first (if eventSlug is in cart), otherwise by ID
      let eventResponse;
      try {
        if (cartObj.eventSlug) {
          eventResponse = await eventsApi.getBySlug(cartObj.eventSlug);
        } else {
          // If we only have eventId, we need to get the event by ID
          // Note: get() expects an ID, getBySlug() expects a slug
          eventResponse = await eventsApi.get(cartObj.eventId);
        }
      } catch (err) {
        // If get() fails, try getBySlug with eventId (in case eventId is actually a slug)
        eventResponse = await eventsApi.getBySlug(cartObj.eventId);
      }
      
      if (eventResponse.data.success) {
        const eventData = eventResponse.data.data;
        setEvent(eventData);

        // Get ticket type details - load all ticket types from event
        if (eventData.ticketTypes) {
          setTicketTypes(eventData.ticketTypes);
        }
      } else {
        setError('Failed to load event details');
      }
    } catch (err: any) {
      console.error('Error loading cart:', err);
      setError(err.response?.data?.error || 'Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = () => {
    if (!cart || !event) return;

    let calculatedSubtotal = 0;

    Object.entries(selectedTickets).forEach(([ticketTypeId, quantity]) => {
      if (quantity && quantity > 0) {
        const ticketType = ticketTypes.find((tt: any) => tt.id === ticketTypeId);
        if (ticketType) {
          calculatedSubtotal += Number(ticketType.price) * quantity;
        }
      }
    });

    setSubtotal(calculatedSubtotal);

    // Apply promo code discount if available
    let calculatedDiscount = 0;
    if (appliedPromo) {
      if (appliedPromo.discountType === 'PERCENTAGE') {
        calculatedDiscount = (calculatedSubtotal * appliedPromo.discountValue) / 100;
      } else {
        calculatedDiscount = appliedPromo.discountValue;
      }
      calculatedDiscount = Math.min(calculatedDiscount, calculatedSubtotal);
    }

    setDiscountAmount(calculatedDiscount);

    // Calculate total (subtotal - discount + fees)
    const afterDiscount = calculatedSubtotal - calculatedDiscount;
    const estimatedFee = afterDiscount * 0.025; // 2.5% estimate
    setTotalAmount(afterDiscount + estimatedFee);
  };

  const handleQuantityChange = (ticketTypeId: string, quantity: number) => {
    if (quantity < 0) return;
    
    // Update state using functional update to ensure we get latest state
    setSelectedTickets((prev) => {
      const updated = { ...prev };
      
      if (quantity === 0) {
        delete updated[ticketTypeId];
      } else {
        updated[ticketTypeId] = quantity;
      }
      
      return updated;
    });

  };

  // Sync cart when selectedTickets changes
  useEffect(() => {
    if (!cart || !event) return;
    
    const updatedTickets = Object.entries(selectedTickets)
      .filter(([_, qty]) => qty !== undefined && qty !== null && qty > 0)
      .map(([id, qty]) => ({
        ticketTypeId: id,
        quantity: Number(qty),
      }));

    // Only update if tickets actually changed
    const currentTicketsStr = JSON.stringify(cart.tickets || []);
    const newTicketsStr = JSON.stringify(updatedTickets);
    
    if (currentTicketsStr !== newTicketsStr) {
      const updatedCart = {
        ...cart,
        tickets: updatedTickets,
      };
      setCart(updatedCart);
      sessionStorage.setItem('cart', JSON.stringify(updatedCart));
    }
  }, [selectedTickets]);


  const handleValidatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeError('');
      setAppliedPromo(null);
      return;
    }

    setValidatingPromo(true);
    setPromoCodeError('');

    try {
      const response = await promoCodeApi.validate(promoCode, cart.eventId, subtotal);
      if (response.data.success) {
        setAppliedPromo({
          code: promoCode,
          discountType: response.data.data.discountType,
          discountValue: response.data.data.discountValue,
          discountAmount: response.data.data.discountAmount,
        });
      } else {
        setPromoCodeError(response.data.error || 'Invalid promo code');
        setAppliedPromo(null);
      }
    } catch (err: any) {
      setPromoCodeError(err.response?.data?.error || 'Failed to validate promo code');
      setAppliedPromo(null);
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleContinue = async () => {
    const totalQuantity = Object.values(selectedTickets).reduce((sum, qty) => sum + (qty || 0), 0);
    
    if (totalQuantity === 0) {
      setError('Please select at least one ticket');
      return;
    }

    setError('');
    setReserving(true);

    try {
      // Reserve tickets if not already reserved
      let reservationData = cart.reservations || [];

      if (reservationData.length === 0) {
        const reservations: any[] = [];
        const ticketEntries = Object.entries(selectedTickets).filter(([_, qty]) => qty && qty > 0);

        // First, check availability for all ticket types in parallel
        const availabilityChecks = await Promise.all(
          ticketEntries.map(([ticketTypeId, quantity]) =>
            ticketsApi.checkAvailability(event.id, ticketTypeId, quantity as number)
          )
        );

        // Verify all availability checks passed
        for (let i = 0; i < availabilityChecks.length; i++) {
          const check = availabilityChecks[i];
          if (!check.data.success || !check.data.data.canReserve) {
            throw new Error('Tickets are no longer available. Please refresh and try again.');
          }
        }

        // Then reserve tickets sequentially (to allow rollback on failure)
        for (let i = 0; i < ticketEntries.length; i++) {
          const [ticketTypeId, quantity] = ticketEntries[i];
          try {
            const reserveResponse = await ticketsApi.reserve({
              eventId: event.id,
              ticketTypeId,
              quantity: quantity as number,
              seatIds: undefined,
            });

            if (reserveResponse.data.success) {
              reservations.push({
                ticketTypeId,
                quantity,
                reservationId: reserveResponse.data.data.reservationId,
                expiresAt: reserveResponse.data.data.expiresAt,
              });
            } else {
              throw new Error(reserveResponse.data.error || 'Failed to reserve tickets');
            }
          } catch (error: any) {
            // Release all previously reserved tickets
            for (const res of reservations) {
              ticketsApi.release(res.reservationId).catch(console.error);
            }
            throw error;
          }
        }

        reservationData = reservations.map((res) => ({
          ticketTypeId: res.ticketTypeId,
          reservationId: res.reservationId,
          expiresAt: res.expiresAt,
        }));
      }

      // Update cart with current selections and reservations
      const updatedTickets = Object.entries(selectedTickets)
        .filter(([_, qty]) => qty && qty > 0)
        .map(([ticketTypeId, quantity]) => ({
          ticketTypeId,
          quantity,
        }));

      const updatedCart = {
        ...cart,
        tickets: updatedTickets,
        reservations: reservationData,
        appliedPromo: appliedPromo,
      };

      sessionStorage.setItem('cart', JSON.stringify(updatedCart));
      router.push('/checkout/step2');
    } catch (err: any) {
      console.error('Error reserving tickets:', err);
      
      // Handle timeout errors specifically
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.response?.status === 500) {
        // Server error - likely Redis/database issue
        setError('Reservation service temporarily unavailable. Please try again in a moment.');
      } else if (err.response?.data?.error) {
        // Use the specific error message from the API
        const apiError = err.response.data.error;
        if (apiError.includes('temporarily unavailable') || apiError.includes('service')) {
          setError('Reservation service temporarily unavailable. Please try again in a moment.');
        } else {
          setError(apiError);
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to reserve tickets. Please try again.');
      }
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer maxWidth="6xl">
        <p className="text-gray-600">Loading checkout...</p>
      </PageContainer>
    );
  }

  if (error && !cart) {
    return (
      <PageContainer maxWidth="6xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <Link href="/events" className="text-primary-800 hover:text-primary-600 mt-2 inline-block">
            Back to Events
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (!cart || !event) {
    return (
      <PageContainer maxWidth="6xl">
        <p className="text-gray-600">No items in cart. <Link href="/events" className="text-primary-800 hover:text-primary-600">Browse Events</Link></p>
      </PageContainer>
    );
  }

  return (
    <>
    <PageContainer maxWidth="6xl" className="pb-28 lg:pb-8">
      <div className="mb-6">
        <Link href={`/events/${event.slug}`} className="text-primary-800 hover:text-primary-600 text-[15px]">
          ← Back to Event
        </Link>
      </div>

      <StepIndicator currentStep={1} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">{event.title}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Ticket Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Selection */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Select Tickets</h2>
            <div className="space-y-4">
              {event.ticketTypes?.map((ticketType: any) => {
                const available = ticketType.totalQuantity - ticketType.soldQuantity - ticketType.reservedQuantity;
                const selectedQty = selectedTickets[ticketType.id] || 0;

                return (
                  <div key={ticketType.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{ticketType.name}</h3>
                        {ticketType.description && (
                          <p className="text-sm text-gray-600">{ticketType.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {formatCurrency(Number(ticketType.price), ticketType.currency || 'NGN')}
                        </p>
                        <p className="text-xs text-gray-500">{available} available</p>
                      </div>
                    </div>

                    {available > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(ticketType.id, selectedQty - 1)}
                          disabled={selectedQty === 0}
                          className="w-8 h-8 border border-gray-300 rounded disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-12 text-center">{selectedQty}</span>
                        <button
                          onClick={() => handleQuantityChange(ticketType.id, selectedQty + 1)}
                          disabled={selectedQty >= available || selectedQty >= ticketType.maxPerOrder}
                          className="w-8 h-8 border border-gray-300 rounded disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">Sold Out</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummary
            cart={cart}
            event={event}
            ticketTypes={ticketTypes}
            appliedPromo={appliedPromo}
            promoCode={promoCode}
            promoCodeError={promoCodeError}
            validatingPromo={validatingPromo}
            subtotal={subtotal}
            discountAmount={discountAmount}
            totalAmount={totalAmount}
            onPromoCodeChange={setPromoCode}
            onValidatePromoCode={handleValidatePromoCode}
            onContinue={handleContinue}
            isLoading={reserving}
            disabled={isDisabled}
            buttonText="Continue to final step"
            disabledReason={disabledReason}
            showFooter
            hideFooterOnMobile
          />
        </div>
      </div>
    </PageContainer>

    {/* Sticky Bottom Bar - Mobile Only */}
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 px-4 py-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {cart?.reservations?.[0]?.expiresAt && (
              <div className="text-[11px] text-yellow-700 mb-1">
                Reserved until {new Date(cart.reservations[0].expiresAt).toLocaleTimeString()}
              </div>
            )}
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-lg font-bold text-primary-900">
              {totalAmount === 0 ? 'Free' : formatCurrency(totalAmount, 'NGN')}
            </div>
          </div>
          <button
            type="button"
            onClick={handleContinue}
            disabled={isDisabled || reserving}
            className="px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
            style={{ background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)' }}
          >
            {reserving
              ? 'Reserving...'
              : isDisabled && disabledReason
              ? disabledReason
              : 'Continue to final step'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
