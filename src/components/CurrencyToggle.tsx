import React from 'react';
import { DollarSign } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

export function CurrencyToggle() {
  const { currency, setCurrency, exchangeRate } = useCurrency();

  return (
    <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
      <DollarSign className="text-gray-600" size={16} />
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrency('USD')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            currency === 'USD'
              ? 'bg-orange-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          USD
        </button>
        <button
          onClick={() => setCurrency('LBP')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            currency === 'LBP'
              ? 'bg-orange-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          LBP
        </button>
      </div>
      <div className="text-xs text-gray-500 ml-2">
        1 USD = {exchangeRate.toLocaleString()} ل.ل
      </div>
    </div>
  );
}