'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@getiickets/shared';

interface CartItem {
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  currency: string;
  quantity: number;
}

export default function Cart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCart(parsed.items || []);
      } catch (error) {
        console.error('Error parsing cart:', error);
      }
    }
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Shopping Cart</h2>
      
      <div className="space-y-4 mb-4">
        {cart.map((item, index) => (
          <div key={index} className="flex justify-between items-center border-b pb-2">
            <div>
              <p className="font-semibold">{item.ticketTypeName}</p>
              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
            </div>
            <p className="font-semibold">
              {formatCurrency(item.price * item.quantity, item.currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-2xl font-bold text-primary-800">
            {formatCurrency(total, 'NGN')}
          </span>
        </div>
      </div>
    </div>
  );
}
