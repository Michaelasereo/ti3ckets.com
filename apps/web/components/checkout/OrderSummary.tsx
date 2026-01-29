'use client';

import { formatCurrency } from '@getiickets/shared';

interface OrderSummaryProps {
  cart: any;
  event: any;
  ticketTypes: any[];
  appliedPromo: any | null;
  promoCode: string;
  promoCodeError: string;
  validatingPromo: boolean;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  onPromoCodeChange: (code: string) => void;
  onValidatePromoCode: () => void;
  onContinue: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  buttonText?: string;
  disabledReason?: string;
  showFooter?: boolean;
  hideFooterOnMobile?: boolean;
}

export default function OrderSummary({
  cart,
  event,
  ticketTypes,
  appliedPromo,
  promoCode,
  promoCodeError,
  validatingPromo,
  subtotal,
  discountAmount,
  totalAmount,
  onPromoCodeChange,
  onValidatePromoCode,
  onContinue,
  isLoading = false,
  disabled = false,
  buttonText = 'Continue',
  disabledReason = '',
  showFooter = true,
  hideFooterOnMobile = false,
}: OrderSummaryProps) {
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-6 lg:sticky lg:top-24">
        <h2 className="text-xl font-semibold text-primary-900 text-center mb-4">Order Summary</h2>

      {/* Selected Tickets */}
      <div className="mb-4 space-y-2">
        {cart.tickets.map((ticket: any, index: number) => {
          const ticketType = ticketTypes.find((tt: any) => tt.id === ticket.ticketTypeId);
          if (!ticketType) return null;

          return (
            <div key={index} className="flex justify-between text-sm border-b pb-2">
              <div>
                <p className="font-medium">{ticketType.name}</p>
                <p className="text-gray-600">Qty: {ticket.quantity}</p>
              </div>
              <p className="font-semibold">
                {Number(ticketType.price) * ticket.quantity === 0 ? 'Free' : formatCurrency(Number(ticketType.price) * ticket.quantity, ticketType.currency || 'NGN')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Promo Code */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-primary-900">Promo Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
            onBlur={onValidatePromoCode}
            placeholder="Enter code"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={onValidatePromoCode}
            disabled={validatingPromo || !promoCode.trim()}
            className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition disabled:opacity-50"
          >
            {validatingPromo ? '...' : 'Apply'}
          </button>
        </div>
        {promoCodeError && (
          <p className="text-xs text-red-600 mt-1">{promoCodeError}</p>
        )}
        {appliedPromo && (
          <p className="text-xs text-green-600 mt-1">
            Promo code applied! Save {formatCurrency(appliedPromo.discountAmount, 'NGN')}
          </p>
        )}
      </div>

      {/* Price Breakdown */}
      <div className="space-y-2 mb-4 border-t pt-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{subtotal === 0 ? 'Free' : formatCurrency(subtotal, 'NGN')}</span>
        </div>
        {appliedPromo && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount:</span>
            <span>-{formatCurrency(discountAmount, 'NGN')}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-600">
          <span>Fees:</span>
          <span>{totalAmount - (subtotal - discountAmount) === 0 ? 'Free' : `~${formatCurrency(totalAmount - (subtotal - discountAmount), 'NGN')}`}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
          <span>Total:</span>
          <span className="text-primary-800">
            {totalAmount === 0 ? 'Free' : formatCurrency(totalAmount, 'NGN')}
          </span>
        </div>
      </div>

      {showFooter && (
        <div className={hideFooterOnMobile ? 'hidden lg:block' : ''}>
          {/* Continue Button */}
          <button
            onClick={onContinue}
            disabled={disabled || isLoading}
            className="w-full px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            style={{ background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)' }}
          >
            {isLoading ? 'Processing...' : disabled && disabledReason ? disabledReason : buttonText}
          </button>

          {cart.reservations && cart.reservations.length > 0 && (
            <p className="text-xs text-yellow-600 mt-4 text-center">
              Reservations expire at {new Date(cart.reservations[0].expiresAt).toLocaleTimeString()}
            </p>
          )}

        </div>
      )}
      </div>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Your tickets will be reserved for 10 minutes
      </p>
    </>
  );
}
