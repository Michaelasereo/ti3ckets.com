'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PaystackButton from '@/components/payment/PaystackButton';
import { ordersApi, paymentsApi, eventsApi, ticketsApi } from '@/lib/api';
import { formatCurrency } from '@getiickets/shared';
import PageContainer from '@/components/ui/PageContainer';
import OrderSummary from '@/components/checkout/OrderSummary';
import StepIndicator from '@/components/checkout/StepIndicator';

export default function CheckoutStep2Page() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [error, setError] = useState('');

  // Customer info
  const [customerEmail, setCustomerEmail] = useState('');
  const [confirmCustomerEmail, setConfirmCustomerEmail] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [transferToOthers, setTransferToOthers] = useState(false);
  
  // Attendee info per ticket (when transferToOthers is true)
  const [attendeeInfo, setAttendeeInfo] = useState<Record<string, {
    firstName: string;
    lastName: string;
    email: string;
    confirmEmail: string;
  }>>({});

  // Promo code (from step 1)
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  // Pricing
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    if (cart && event) {
      calculatePricing();
    }
  }, [cart, event, appliedPromo]);

  // Release reservations on component unmount (user navigates away)
  useEffect(() => {
    return () => {
      // Only release if orders haven't been created yet
      if (orders.length === 0 && cart?.reservations) {
        // Fire off release requests (don't await - we're unmounting)
        for (const reservation of cart.reservations) {
          if (reservation.reservationId) {
            ticketsApi.release(reservation.reservationId).catch(console.error);
          }
        }
      }
    };
  }, [orders, cart]);

  // Release reservations on page close/navigation (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only release if orders haven't been created yet
      if (orders.length === 0 && cart?.reservations) {
        // Use fetch with keepalive for reliable cleanup on page close
        for (const reservation of cart.reservations) {
          if (reservation.reservationId) {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const url = `${API_URL}/api/v1/tickets/release`;
            const data = JSON.stringify({ reservationId: reservation.reservationId });
            
            // Use fetch with keepalive for reliable cleanup
            // Include credentials for authenticated requests
            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: data,
              keepalive: true,
              credentials: 'include', // Include cookies for authentication
            }).catch(console.error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [orders, cart]);

  const loadCart = async () => {
    try {
      const cartData = sessionStorage.getItem('cart');
      if (!cartData) {
        router.push('/checkout/step1');
        return;
      }

      const cartObj = JSON.parse(cartData);
      setCart(cartObj);

      // Load applied promo from cart
      if (cartObj.appliedPromo) {
        setAppliedPromo(cartObj.appliedPromo);
      }

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

        // Get ticket type details
        const selectedTicketTypes = cartObj.tickets.map((t: any) => {
          const tt = eventData.ticketTypes?.find((type: any) => type.id === t.ticketTypeId);
          return { ...tt, selectedQuantity: t.quantity };
        });
        setTicketTypes(selectedTicketTypes);
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

    cart.tickets.forEach((ticket: any) => {
      const ticketType = ticketTypes.find((tt: any) => tt.id === ticket.ticketTypeId);
      if (ticketType) {
        calculatedSubtotal += Number(ticketType.price) * ticket.quantity;
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

  const handleReserveTickets = async () => {
    if (!cart) return;

    setCreatingOrder(true);
    setError('');

    try {
      // Validate reservations haven't expired
      if (cart.reservations && cart.reservations.length > 0) {
        const now = new Date();
        const expiredReservations = cart.reservations.filter((res: any) => {
          if (!res.expiresAt) return false;
          return new Date(res.expiresAt) < now;
        });

        if (expiredReservations.length > 0) {
          setError('Your ticket reservations have expired. Please go back and select tickets again.');
          setCreatingOrder(false);
          return;
        }
      }

      // Use existing reservations from cart
      let reservationData = cart.reservations || [];

      if (reservationData.length === 0) {
        // Reserve all tickets if not already reserved
        const reservationPromises = cart.tickets.map((ticket: any) => {
          return ticketsApi.reserve({
            eventId: cart.eventId,
            ticketTypeId: ticket.ticketTypeId,
            quantity: ticket.quantity,
            seatIds: undefined,
          });
        });

        const reservationResults = await Promise.all(reservationPromises);
        reservationData = reservationResults.map((r: any, index: number) => ({
          ...r.data.data,
          ticketTypeId: cart.tickets[index].ticketTypeId,
        }));
      }

      // Now create orders (one per ticket type for now)
      const orderPromises = cart.tickets.map((ticket: any, index: number) => {
        let reservation = reservationData.find((r: any) => r.ticketTypeId === ticket.ticketTypeId);

        if (!reservation && reservationData[index]) {
          reservation = reservationData[index];
        }

        if (!reservation || !reservation.reservationId) {
          throw new Error(`No valid reservation found for ticket type ${ticket.ticketTypeId}`);
        }

        // Prepare attendee info for this ticket type if transfer is enabled
        const ticketKey = `${ticket.ticketTypeId}-${index}`;
        let attendeeInfoData = undefined;
        
        if (transferToOthers && attendeeInfo[ticketKey]) {
          const attendeeData = {
            firstName: attendeeInfo[ticketKey].firstName,
            lastName: attendeeInfo[ticketKey].lastName,
            email: attendeeInfo[ticketKey].email,
          };
          
          // Create one attendee per ticket quantity
          const attendees = Array(ticket.quantity).fill(attendeeData);
          
          attendeeInfoData = [{
            ticketTypeId: ticket.ticketTypeId,
            quantity: ticket.quantity,
            attendees: attendees,
          }];
        }

        return ordersApi.create({
          eventId: cart.eventId,
          ticketTypeId: ticket.ticketTypeId,
          quantity: ticket.quantity,
          customerEmail,
          customerName: `${customerFirstName} ${customerLastName}`.trim() || undefined,
          customerPhone: customerPhone || undefined,
          promoCode: appliedPromo?.code || undefined,
          reservationId: reservation.reservationId,
          attendeeInfo: attendeeInfoData,
        });
      });

      const orderResults = await Promise.all(orderPromises);
      const createdOrders = orderResults.map((r: any) => r.data.data);
      setOrders(createdOrders);
      
      // Ensure customerEmail is set from the first order if not already set
      if (!customerEmail && createdOrders.length > 0 && createdOrders[0].customerEmail) {
        setCustomerEmail(createdOrders[0].customerEmail);
      }
      
      setCreatingOrder(false);
    } catch (err: any) {
      console.error('Error reserving tickets/creating orders:', err);
      const errorMessage = err.response?.data?.error || 'Failed to reserve tickets. Please try again.';

      if (errorMessage.includes('Insufficient') || errorMessage.includes('available')) {
        setError('Tickets are no longer available. Please go back and select different tickets.');
      } else if (errorMessage.includes('expired') || errorMessage.includes('Expired')) {
        setError('Your ticket reservations have expired. Please go back and select tickets again.');
      } else {
        setError(errorMessage);
      }

      setCreatingOrder(false);
    }
  };

  const handleProceedToPayment = async () => {
    setError('');
    
    // Validate customer info
    if (!customerFirstName || !customerFirstName.trim()) {
      setError('Please enter your first name');
      return;
    }
    
    if (!customerLastName || !customerLastName.trim()) {
      setError('Please enter your last name');
      return;
    }
    
    if (!customerEmail || !customerEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (customerEmail !== confirmCustomerEmail) {
      setError('Email addresses do not match');
      return;
    }

    // If transfer to others is enabled, validate attendee info
    if (transferToOthers) {
      for (let i = 0; i < cart.tickets.length; i++) {
        const ticket = cart.tickets[i];
        const ticketKey = `${ticket.ticketTypeId}-${i}`;
        const attendee = attendeeInfo[ticketKey];
        
        if (!attendee) {
          setError(`Please fill in attendee information for ticket ${i + 1}`);
          return;
        }
        
        if (!attendee.firstName || !attendee.firstName.trim()) {
          setError(`Please enter attendee first name for ticket ${i + 1}`);
          return;
        }
        
        if (!attendee.lastName || !attendee.lastName.trim()) {
          setError(`Please enter attendee last name for ticket ${i + 1}`);
          return;
        }
        
        if (!attendee.email || !attendee.email.includes('@')) {
          setError(`Please enter a valid attendee email address for ticket ${i + 1}`);
          return;
        }
        
        if (attendee.email !== attendee.confirmEmail) {
          setError(`Attendee email addresses do not match for ticket ${i + 1}`);
          return;
        }
      }
    }

    // Reserve tickets and create orders
    await handleReserveTickets();
  };

  const handleCancel = async () => {
    // Release all reservations
    if (cart?.reservations) {
      for (const reservation of cart.reservations) {
        if (reservation.reservationId) {
          try {
            await ticketsApi.release(reservation.reservationId);
          } catch (error) {
            console.error('Error releasing reservation:', error);
          }
        }
      }
    }

    // Clear cart and redirect
    sessionStorage.removeItem('cart');
    router.push('/events');
  };

  const handleBackToStep1 = async () => {
    // Release all reservations before navigating back
    if (cart?.reservations && orders.length === 0) {
      for (const reservation of cart.reservations) {
        if (reservation.reservationId) {
          try {
            await ticketsApi.release(reservation.reservationId);
          } catch (error) {
            console.error('Error releasing reservation:', error);
          }
        }
      }
      // Clear reservations from cart
      const updatedCart = {
        ...cart,
        reservations: [],
      };
      sessionStorage.setItem('cart', JSON.stringify(updatedCart));
    }
    router.push('/checkout/step1');
  };

  const handlePaymentSuccess = async (reference: string) => {
    try {
      // Verify payment
      const verifyResponse = await paymentsApi.verify(reference);

      if (verifyResponse.data.success) {
        // Clear cart
        sessionStorage.removeItem('cart');

        // Redirect to success page with first order ID
        if (orders.length > 0) {
          router.push(`/checkout/success?reference=${reference}&orderId=${orders[0].orderId}`);
        } else {
          router.push(`/checkout/success?reference=${reference}`);
        }
      } else {
        setError('Payment verification failed. Please contact support if payment was deducted.');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError('Payment verification failed. Please contact support if payment was deducted.');
    }
  };

  // If orders are created, show payment section
  useEffect(() => {
    if (orders.length > 0) {
      const totalForPayment = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

      // Handle free tickets - skip payment and redirect to success
      if (totalForPayment === 0) {
        const reference = orders[0].paystackRef || `FREE-${Date.now()}`;
        sessionStorage.removeItem('cart');
        router.push(`/checkout/success?reference=${reference}&orderId=${orders[0].orderId}`);
      }
    }
  }, [orders, router]);

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
          <Link href="/checkout/step1" className="text-primary-800 hover:text-primary-600 mt-2 inline-block">
            Back to Step 1
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (!cart || !event) {
    return (
      <PageContainer maxWidth="6xl">
        <p className="text-gray-600">No items in cart. <Link href="/checkout/step1" className="text-primary-800 hover:text-primary-600">Go to Step 1</Link></p>
      </PageContainer>
    );
  }

  // If orders are created, show payment section
  if (orders.length > 0) {
    const primaryOrder = orders[0];
    const totalForPayment = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // If total is 0, show message while redirecting
    if (totalForPayment === 0) {
      return (
        <PageContainer maxWidth="6xl">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-700 mb-4">Free tickets - no payment required</p>
            <p className="text-sm text-gray-600">Redirecting to confirmation...</p>
          </div>
        </PageContainer>
      );
    }

    return (
      <PageContainer maxWidth="6xl">
        <div className="mb-6">
          <Link href="/checkout/step1" className="text-primary-800 hover:text-primary-600 text-[15px]">
            ← Back to Step 1
          </Link>
        </div>

        <StepIndicator currentStep={2} />

        <h1 className="text-3xl font-bold text-primary-900 mb-8">Complete Payment</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2">
                {orders.map((order, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>Order {order.orderNumber}</span>
                    <span>{Number(order.totalAmount) === 0 ? 'Free' : formatCurrency(Number(order.totalAmount), order.currency)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary-800">
                    {totalForPayment === 0 ? 'Free' : formatCurrency(totalForPayment, primaryOrder.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <PaystackButton
                email={customerEmail || primaryOrder.customerEmail || ''}
                amount={totalForPayment}
                metadata={{
                  orderId: primaryOrder.orderId,
                  orderNumber: primaryOrder.orderNumber,
                }}
                onSuccess={handlePaymentSuccess}
                onClose={() => {
                  alert('Payment cancelled');
                }}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <OrderSummary
              cart={cart}
              event={event}
              ticketTypes={ticketTypes}
              appliedPromo={appliedPromo}
              promoCode=""
              promoCodeError=""
              validatingPromo={false}
              subtotal={subtotal}
              discountAmount={discountAmount}
              totalAmount={totalAmount}
              onPromoCodeChange={() => {}}
              onValidatePromoCode={() => {}}
              onContinue={() => {}}
              isLoading={false}
              disabled={true}
              buttonText="Payment Required"
            />
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="6xl">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={handleBackToStep1}
          className="text-primary-800 hover:text-primary-600 text-[15px]"
        >
          ← Back to Step 1
        </button>
        <button
          onClick={handleCancel}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Cancel
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Customer Details</h1>
        <p className="text-gray-600">Step 2 of 2</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Customer Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Event Details</h2>
            <h3 className="text-2xl font-bold">{event.title}</h3>
          </div>

          {/* Customer Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Customer Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-primary-900">First Name *</label>
                  <input
                    type="text"
                    value={customerFirstName}
                    onChange={(e) => setCustomerFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-primary-900">Last Name *</label>
                  <input
                    type="text"
                    value={customerLastName}
                    onChange={(e) => setCustomerLastName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-primary-900">Email Address *</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-primary-900">Confirm Email Address *</label>
                <input
                  type="email"
                  value={confirmCustomerEmail}
                  onChange={(e) => setConfirmCustomerEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
                {confirmCustomerEmail && customerEmail !== confirmCustomerEmail && (
                  <p className="text-xs text-red-600 mt-1">Email addresses do not match</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-primary-900">Phone Number</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+234 800 000 0000"
                />
              </div>
              
              {/* Transfer to Others Option */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="transferToOthers"
                    checked={transferToOthers}
                    onChange={(e) => setTransferToOthers(e.target.checked)}
                    className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="transferToOthers" className="text-sm text-primary-900 cursor-pointer">
                    <span className="font-medium">Do you want to transfer the ticket to someone else?</span>
                    <br />
                    <span className="text-gray-600">Select Send ticket to different email addresses? Tickets will only be sent to the email address you provide here.</span>
                  </label>
                </div>
              </div>

              {/* Per-Ticket Attendee Information */}
              {transferToOthers && (
                <div className="pt-4 border-t border-gray-200 space-y-6">
                  {cart.tickets.map((ticket: any, ticketIndex: number) => {
                    const ticketType = ticketTypes.find((tt: any) => tt.id === ticket.ticketTypeId);
                    if (!ticketType) return null;

                    // Generate unique key for this ticket type
                    const ticketKey = `${ticket.ticketTypeId}-${ticketIndex}`;
                    const currentAttendeeInfo = attendeeInfo[ticketKey] || {
                      firstName: '',
                      lastName: '',
                      email: '',
                      confirmEmail: '',
                    };

                    return (
                      <div key={ticketKey} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <h3 className="font-semibold text-primary-900 mb-4">
                          Ticket {ticketIndex + 1} - {ticketType.name}
                        </h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1 text-primary-900">
                                Attendee First name *
                              </label>
                              <input
                                type="text"
                                value={currentAttendeeInfo.firstName}
                                onChange={(e) => {
                                  setAttendeeInfo({
                                    ...attendeeInfo,
                                    [ticketKey]: {
                                      ...currentAttendeeInfo,
                                      firstName: e.target.value,
                                    },
                                  });
                                }}
                                required
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="First name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1 text-primary-900">
                                Attendee Last name *
                              </label>
                              <input
                                type="text"
                                value={currentAttendeeInfo.lastName}
                                onChange={(e) => {
                                  setAttendeeInfo({
                                    ...attendeeInfo,
                                    [ticketKey]: {
                                      ...currentAttendeeInfo,
                                      lastName: e.target.value,
                                    },
                                  });
                                }}
                                required
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="Last name"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-primary-900">
                              Attendee Email address *
                            </label>
                            <input
                              type="email"
                              value={currentAttendeeInfo.email}
                              onChange={(e) => {
                                setAttendeeInfo({
                                  ...attendeeInfo,
                                  [ticketKey]: {
                                    ...currentAttendeeInfo,
                                    email: e.target.value,
                                  },
                                });
                              }}
                              required
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="attendee@email.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-primary-900">
                              Confirm attendee email address *
                            </label>
                            <input
                              type="email"
                              value={currentAttendeeInfo.confirmEmail}
                              onChange={(e) => {
                                setAttendeeInfo({
                                  ...attendeeInfo,
                                  [ticketKey]: {
                                    ...currentAttendeeInfo,
                                    confirmEmail: e.target.value,
                                  },
                                });
                              }}
                              required
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="attendee@email.com"
                            />
                            {currentAttendeeInfo.confirmEmail && currentAttendeeInfo.email !== currentAttendeeInfo.confirmEmail && (
                              <p className="text-xs text-red-600 mt-1">Email addresses do not match</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
            promoCode=""
            promoCodeError=""
            validatingPromo={false}
            subtotal={subtotal}
            discountAmount={discountAmount}
            totalAmount={totalAmount}
            onPromoCodeChange={() => {}}
            onValidatePromoCode={() => {}}
            onContinue={handleProceedToPayment}
            isLoading={creatingOrder}
            disabled={
              !customerFirstName || 
              !customerLastName || 
              !customerEmail || 
              !customerEmail.includes('@') || 
              customerEmail !== confirmCustomerEmail || 
              (transferToOthers && cart.tickets.some((ticket: any, index: number) => {
                const ticketKey = `${ticket.ticketTypeId}-${index}`;
                const attendee = attendeeInfo[ticketKey];
                return !attendee || !attendee.firstName || !attendee.lastName || !attendee.email || !attendee.email.includes('@') || attendee.email !== attendee.confirmEmail;
              }))
            }
            buttonText="Proceed to Payment"
          />
        </div>
      </div>
    </PageContainer>
  );
}
