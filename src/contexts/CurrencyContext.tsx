import React, { createContext, useContext, useState, useEffect } from 'react';

interface CurrencyContextType {
  exchangeRate: number;
  currency: 'USD' | 'LBP';
  setCurrency: (currency: 'USD' | 'LBP') => void;
  convertPrice: (price: number, fromCurrency?: 'USD' | 'LBP') => number;
  formatPrice: (price: number, fromCurrency?: 'USD' | 'LBP') => string;
  formatDualPrice: (price: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [exchangeRate, setExchangeRate] = useState(89500); // 1 USD = 89,500 LBP (approximate)
  const [currency, setCurrency] = useState<'USD' | 'LBP'>('USD');

  useEffect(() => {
    // In a real app, you'd fetch this from an API
    // For now, we'll use a fixed rate
    const fetchExchangeRate = async () => {
      try {
        // Mock API call - replace with real exchange rate API
        setExchangeRate(89500);
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      }
    };

    fetchExchangeRate();
    // Update every hour
    const interval = setInterval(fetchExchangeRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  const convertPrice = (price: number, fromCurrency: 'USD' | 'LBP' = 'USD'): number => {
    if (currency === fromCurrency) return price;
    
    if (fromCurrency === 'USD' && currency === 'LBP') {
      return price * exchangeRate;
    } else if (fromCurrency === 'LBP' && currency === 'USD') {
      return price / exchangeRate;
    }
    
    return price;
  };

  const formatPrice = (price: number, fromCurrency: 'USD' | 'LBP' = 'USD'): string => {
    const convertedPrice = convertPrice(price, fromCurrency);
    
    if (currency === 'USD') {
      return `$${convertedPrice.toFixed(2)}`;
    } else {
      return `${convertedPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })} ل.ل`;
    }
  };

  const formatDualPrice = (price: number): string => {
    const usdPrice = price;
    const lbpPrice = price * exchangeRate;
    
    return `$${usdPrice.toFixed(2)} / ${lbpPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })} ل.ل`;
  };

  const value = {
    exchangeRate,
    currency,
    setCurrency,
    convertPrice,
    formatPrice,
    formatDualPrice,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}