import React, { useState } from 'react';
import { X, CreditCard, DollarSign, User, Check, Printer } from 'lucide-react';
import { CartItem } from '../types';

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

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = total * 0.08; // 8% tax rate
  const finalTotal = total + tax;

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

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { color: #f97316; font-size: 24px; font-weight: bold; }
            .order-info { margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f97316; color: white; }
            .total-section { text-align: right; }
            .total-line { margin: 5px 0; }
            .final-total { font-weight: bold; font-size: 18px; border-top: 2px solid #f97316; padding-top: 10px; }
            .footer { text-align: center; margin-top: 30px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🥞 Crêpe Café</div>
            <p>Delicious Crepes & More</p>
            <p>123 Main Street, City, State 12345 | (555) 123-4567</p>
          </div>
          
          <div class="order-info">
            <h3>Order Invoice</h3>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${cartItems.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.product.price.toFixed(2)}</td>
                  <td>$${(item.product.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-line">Subtotal: $${total.toFixed(2)}</div>
            <div class="total-line">Tax (8%): $${tax.toFixed(2)}</div>
            <div class="final-total">Total: $${finalTotal.toFixed(2)}</div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Visit us again soon!</p>
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
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-800">{item.product.name}</span>
                    <span className="text-gray-600 ml-2">×{item.quantity}</span>
                  </div>
                  <div className="font-semibold text-gray-800">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
              
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (8%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-800 border-t border-gray-200 pt-2">
                  <span>Total:</span>
                  <span>${finalTotal.toFixed(2)}</span>
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
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
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
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl hover:from-orange-600 hover:to-yellow-600 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  `Complete Order - $${finalTotal.toFixed(2)}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}