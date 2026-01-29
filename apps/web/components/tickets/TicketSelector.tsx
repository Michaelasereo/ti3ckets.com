'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@getiickets/shared';
import { useRouter } from 'next/navigation';
import { ticketsApi } from '@/lib/api';
import SeatMap from './SeatMap';

interface TicketSelectorProps {
  event: any;
}

export default function TicketSelector({ event }: TicketSelectorProps) {
  const router = useRouter();
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSeatMap, setShowSeatMap] = useState(false);
  const [error, setError] = useState('');
  const [availabilityWarnings, setAvailabilityWarnings] = useState<Record<string, string>>({});

  // Check availability periodically for selected tickets
  useEffect(() => {
    if (Object.keys(selectedTickets).length === 0) {
      setAvailabilityWarnings({});
      return;
    }

    const checkAvailability = async () => {
      const warnings: Record<string, string> = {};
      
      for (const [ticketTypeId, quantity] of Object.entries(selectedTickets)) {
        if (quantity && quantity > 0) {
          try {
            const response = await ticketsApi.checkAvailability(
              event.id,
              ticketTypeId,
              quantity
            );
            
            if (response.data.success) {
              const { available, canReserve } = response.data.data;
              
              if (!canReserve) {
                warnings[ticketTypeId] = 'Not enough tickets available';
              } else if (available <= 5) {
                warnings[ticketTypeId] = `Only ${available} tickets left!`;
              }
            }
          } catch (err) {
            // Silently fail availability checks
            console.error('Error checking availability:', err);
          }
        }
      }
      
      setAvailabilityWarnings(warnings);
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [selectedTickets, event.id]);

  // For seated events, show seat map when tickets are selected
  useEffect(() => {
    if (event.isSeated && totalQuantity > 0 && event.seats) {
      setShowSeatMap(true);
    } else {
      setShowSeatMap(false);
    }
  }, [selectedTickets, event.isSeated, event.seats]);

  const handleQuantityChange = (ticketTypeId: string, quantity: number) => {
    if (quantity < 0) return;
    setSelectedTickets((prev) => ({
      ...prev,
      [ticketTypeId]: quantity === 0 ? undefined : quantity,
    }));
    
    // Clear seat selection if quantity is reduced
    if (quantity === 0) {
      setSelectedSeats([]);
    }
  };

  const handleSeatSelect = (seatId: string) => {
    // Ensure seatId is a string for comparison
    const seatIdStr = String(seatId);
    
    setSelectedSeats((prevSeats) => {
      const prevSeatsStr = prevSeats.map(String);
      
      if (prevSeatsStr.includes(seatIdStr)) {
        // Deselect seat
        return prevSeats.filter((id) => String(id) !== seatIdStr);
      } else {
        // Check if we've selected too many seats
        if (prevSeats.length >= totalQuantity) {
          alert(`You can only select ${totalQuantity} seat(s)`);
          return prevSeats;
        }
        // Select seat
        return [...prevSeats, seatIdStr];
      }
    });
  };

  const totalQuantity = Object.values(selectedTickets).reduce((sum, qty) => sum + (qty || 0), 0);
  const totalAmount = event.ticketTypes?.reduce((sum: number, tt: any) => {
    const qty = selectedTickets[tt.id] || 0;
    return sum + Number(tt.price) * qty;
  }, 0) || 0;

  const handleContinue = async () => {
    if (totalQuantity === 0) return;
    
    // For seated events, validate seat selection
    if (event.isSeated) {
      // Convert both to strings for comparison
      const selectedSeatsCount = selectedSeats.length;
      if (selectedSeatsCount !== totalQuantity) {
        setError(`Please select ${totalQuantity} seat(s) to continue. You have selected ${selectedSeatsCount}.`);
        console.log('Seat selection validation:', {
          selectedSeats,
          selectedSeatsCount,
          totalQuantity,
          eventIsSeated: event.isSeated
        });
        return;
      }
    }
    
    setError('');
    setLoading(true);
    
    try {
      // Store selection in sessionStorage (reservations will happen in Step 1)
      const selection = {
        eventId: event.id,
        eventSlug: event.slug,
        tickets: Object.entries(selectedTickets)
          .filter(([_, qty]) => qty && qty > 0)
          .map(([ticketTypeId, quantity]) => ({
            ticketTypeId,
            quantity,
          })),
        selectedSeats: event.isSeated ? selectedSeats : undefined,
        reservations: [], // Will be populated in Step 1
      };
      
      sessionStorage.setItem('cart', JSON.stringify(selection));
      router.push('/checkout/step1');
    } catch (error: any) {
      console.error('Error storing cart:', error);
      setError('Failed to proceed to checkout. Please try again.');
      setLoading(false);
    }
  };

  if (!event.ticketTypes || event.ticketTypes.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-gray-500">No tickets available</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-4">
      <h2 className="text-xl font-semibold mb-4 text-primary-900">Select Tickets</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {event.ticketTypes.map((ticketType: any) => {
          const available = ticketType.totalQuantity - ticketType.soldQuantity;
          const selectedQty = selectedTickets[ticketType.id] || 0;
          const warning = availabilityWarnings[ticketType.id];

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
                    {formatCurrency(Number(ticketType.price), ticketType.currency)}
                  </p>
                  <p className="text-xs text-gray-500">{available} available</p>
                </div>
              </div>

              {warning && (
                <div className={`mb-2 p-2 rounded text-xs ${
                  warning.includes('Not enough') 
                    ? 'bg-red-50 text-red-600' 
                    : 'bg-yellow-50 text-yellow-600'
                }`}>
                  {warning}
                </div>
              )}

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

      {/* Seat Selection for Seated Events */}
      {showSeatMap && event.seats && event.seats.length > 0 && (
        <div className="mb-6 border-t pt-4">
          <SeatMap
            seats={event.seats}
            selectedSeats={selectedSeats}
            onSeatSelect={handleSeatSelect}
          />
          <p className={`text-sm mt-2 ${
            selectedSeats.length === totalQuantity 
              ? 'text-green-600 font-medium' 
              : 'text-gray-600'
          }`}>
            Selected {selectedSeats.length} of {totalQuantity} seat(s)
            {selectedSeats.length < totalQuantity && (
              <span className="text-yellow-600"> - Please select {totalQuantity - selectedSeats.length} more</span>
            )}
          </p>
        </div>
      )}

      {totalQuantity > 0 && (
        <div className="border-t pt-4 mb-4">
          <div className="flex justify-between mb-2">
            <span>Total:</span>
            <span className="font-bold text-xl">
              {formatCurrency(totalAmount, 'NGN')}
            </span>
          </div>
          {event.isSeated && selectedSeats.length !== totalQuantity && (
            <p className="text-sm text-yellow-600 mt-2">
              Please select {totalQuantity} seat(s) to continue
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={
          totalQuantity === 0 ||
          loading ||
          (event.isSeated && selectedSeats.length !== totalQuantity)
        }
        className="w-full px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? 'Processing...' : 'Reserve Tickets'}
      </button>
    </div>
  );
}
