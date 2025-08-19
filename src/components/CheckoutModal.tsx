import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, User, Check, Printer } from 'lucide-react';
import { CartItem } from '../types';
import { useSettings } from '../hooks/useSettings';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderComplete: (customerName: string, paymentMethod: string) => void;
  loading: boolean;
}

export function CheckoutModal({ 
  isOpen, 
  onClose, 
  cartItems, 
  onOrderComplete, 
  loading 
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const { settings } = useSettings();

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const taxRate = (settings?.tax_rate || 8) / 100;
  const tax = total * taxRate;
  const finalTotal = total + tax;

  const formatCurrency = (amount: number) => {
    const currency = settings?.currency || 'USD';
    if (currency === 'LBP') {
      const exchangeRate = settings?.usd_to_lbp_rate || 89500;
      const lbpAmount = amount * exchangeRate;
      return `${Math.round(lbpAmount).toLocaleString()}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const formatDualCurrency = (amountUSD: number) => {
    const exchangeRate = settings?.usd_to_lbp_rate || 89500;
    const amountLBP = amountUSD * exchangeRate;
    return {
      usd: `$${amountUSD.toFixed(2)}`,
      lbp: `${Math.round(amountLBP).toLocaleString()}`
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    try {
      const generatedOrderNumber = `ORD-${Date.now()}`;
      setOrderNumber(generatedOrderNumber);
      await onOrderComplete(customerName.trim(), paymentMethod);
      setShowSuccess(true);
    } catch (error) {
      console.error('Order failed:', error);
      alert('Failed to process order. Please try again.');
    }
  };

  const printInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const storeName = settings?.store_name || 'BeSweet';
    const storeAddress = settings?.store_address || '';
    const storePhone = settings?.store_phone || '';
    const exchangeRate = settings?.usd_to_lbp_rate || 89500;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${orderNumber}</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px;
              line-height: 1.3;
              margin: 0;
              padding: 8px;
              width: 72mm;
              background: white;
            }
            .header { 
              text-align: center; 
              border-bottom: 1px dashed #000; 
              padding-bottom: 8px; 
              margin-bottom: 8px; 
            }
            .logo { 
              font-weight: bold; 
              font-size: 16px; 
              margin-bottom: 2px;
            }
            .store-info {
              font-size: 10px;
              margin-bottom: 2px;
            }
            .order-info { 
              margin-bottom: 8px; 
              font-size: 11px;
            }
            .exchange-rate {
              font-size: 10px;
              text-align: center;
              margin-bottom: 8px;
              color: #666;
            }
            .items-table { 
              width: 100%; 
              margin-bottom: 8px; 
              font-size: 11px;
            }
            .item-row {
              margin-bottom: 4px;
              border-bottom: 1px dotted #ccc;
              padding-bottom: 2px;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }
            .item-details {
              font-size: 10px;
              color: #666;
              margin-top: 1px;
            }
            .separator {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .total-section { 
              font-size: 11px;
            }
            .total-line { 
              display: flex;
              justify-content: space-between;
              margin: 2px 0; 
            }
            .dual-currency {
              font-size: 10px;
              color: #666;
              text-align: right;
            }
            .final-total { 
              font-weight: bold; 
              font-size: 13px; 
              border-top: 1px dashed #000; 
              padding-top: 4px;
              margin-top: 4px;
            }
            .footer { 
              text-align: center; 
              margin-top: 12px; 
              font-size: 10px;
              border-top: 1px dashed #000;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">${storeName}</div>
            ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ''}
            ${storePhone ? `<div class="store-info">${storePhone}</div>` : ''}
          </div>
          
          <div class="order-info">
            <div><strong>Order:</strong> ${orderNumber}</div>
            <div><strong>Customer:</strong> ${customerName}</div>
            <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
            <div><strong>Payment:</strong> ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</div>
          </div>

          <div class="exchange-rate">
            Exchange Rate: $1 = ${exchangeRate.toLocaleString()}
          </div>

          <div class="separator"></div>

          <div class="items-table">
            ${cartItems.map(item => {
              const itemTotalUSD = item.product.price * item.quantity;
              const itemTotalLBP = itemTotalUSD * exchangeRate;
              const unitPriceLBP = item.product.price * exchangeRate;
              
              return `
                <div class="item-row">
                  <div class="item-header">
                    <span>${item.product.name} x${item.quantity}</span>
                    <span>$${itemTotalUSD.toFixed(2)}</span>
                  </div>
                  <div class="item-details">
                    $${item.product.price.toFixed(2)} (${Math.round(unitPriceLBP).toLocaleString()}) each
                  </div>
                  <div class="dual-currency">
                    ${Math.round(itemTotalLBP).toLocaleString()}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="total-section">
            <div class="total-line">
              <span>Subtotal:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
            <div class="dual-currency">${Math.round(total * exchangeRate).toLocaleString()}</div>
            
            <div class="total-line">
              <span>Tax (${(taxRate * 100).toFixed(1)}%):</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="dual-currency">${Math.round(tax * exchangeRate).toLocaleString()}</div>
            
            <div class="total-line final-total">
              <span>TOTAL:</span>
              <span>$${finalTotal.toFixed(2)}</span>
            </div>
            <div class="dual-currency" style="font-weight: bold; font-size: 12px;">
              ${Math.round(finalTotal * exchangeRate).toLocaleString()}
            </div>
          </div>

          <div class="footer">
            <div>Thank you for your business!</div>
            <div>Visit us again soon!</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const handleClose = () => {
    setShowSuccess(false);
    onClose();
    setCustomerName('');
    setPaymentMethod('cash');
    setOrderNumber('');
  };

  if (!isOpen) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Successful!</h2>
          <p className="text-gray-600 mb-4">Order #{orderNumber} has been processed successfully.</p>
          
          <div className="flex gap-3">
            <button
              onClick={printInvoice}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Printer size={20} />
              Print Invoice
            </button>
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Checkout</h2>
            <button
              onClick={onClose}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Order Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {cartItems.map((item) => {
                const itemTotal = item.product.price * item.quantity;
                const dualPrice = formatDualCurrency(itemTotal);
                return (
                  <div key={item.product.id} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-800">{item.product.name}</span>
                      <span className="text-gray-600 ml-2">×{item.quantity}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">{dualPrice.usd}</div>
                      <div className="text-sm text-gray-600">{dualPrice.lbp}</div>
                    </div>
                  </div>
                );
              })}
              
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <div className="text-right">
                    <div>{formatDualCurrency(total).usd}</div>
                    <div className="text-sm">{formatDualCurrency(total).lbp}</div>
                  </div>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
                  <div className="text-right">
                    <div>{formatDualCurrency(tax).usd}</div>
                    <div className="text-sm">{formatDualCurrency(tax).lbp}</div>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-800 border-t border-gray-200 pt-2">
                  <span>Total:</span>
                  <div className="text-right">
                    <div className="text-primary-600">{formatDualCurrency(finalTotal).usd}</div>
                    <div className="text-sm text-gray-600">{formatDualCurrency(finalTotal).lbp}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User size={16} className="inline mr-2" />
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                placeholder="Enter customer name"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="mx-auto mb-2" size={24} />
                  <span className="font-medium">Cash</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    paymentMethod === 'card'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="mx-auto mb-2" size={24} />
                  <span className="font-medium">Card</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-400 text-white rounded-xl hover:from-primary-600 hover:to-primary-500 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="text-center">
                    <div>Complete Order</div>
                    <div className="text-sm opacity-90">{formatDualCurrency(finalTotal).lbp}</div>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}