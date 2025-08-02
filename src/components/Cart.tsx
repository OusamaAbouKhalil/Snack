import React from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { CartItem } from '../types';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export function Cart({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) {
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-full">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingCart className="text-primary-500" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Order Cart</h2>
          <span className="bg-primary-100 text-primary-600 px-2 py-1 rounded-full text-sm font-medium">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <ShoppingCart size={64} className="mb-4 opacity-30" />
          <p>Your cart is empty</p>
          <p className="text-sm">Add items to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="text-orange-500" size={24} />
        <h2 className="text-xl font-bold text-gray-800">Order Cart</h2>
        <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-sm font-medium">
          {items.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-6">
        {items.map((item) => (
          <div key={item.product.id} className="border-b border-gray-100 pb-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">{item.product.name}</h3>
                <p className="text-sm text-gray-600">${item.product.price.toFixed(2)} each</p>
              </div>
              <button
                onClick={() => onRemoveItem(item.product.id)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUpdateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                  className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="font-medium w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <span className="font-semibold text-lg">
                ${(item.product.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-bold text-gray-800">Total:</span>
          <span className="text-2xl font-bold text-orange-600">
          <span className="text-2xl font-bold text-primary-600">
            ${total.toFixed(2)}
          </span>
        </div>
        
        <button
          onClick={onCheckout}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-xl font-semibold text-lg transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}