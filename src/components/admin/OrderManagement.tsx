import React, { useState } from 'react';
import { Plus, Search, ShoppingCart, User, CreditCard, Clock, Check, X, Printer } from 'lucide-react';
import { useOrderHistory } from '../../hooks/useOrderHistory';
import { useProducts } from '../../hooks/useProducts';
import { useOrders } from '../../hooks/useOrders';
import { CartItem } from '../../types';

export function OrderManagement() {
  const { orders, loading, updateOrderStatus, refetch } = useOrderHistory();
  const { products } = useProducts();
  const { createOrder, loading: orderLoading } = useOrders();
  
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCartItems(prev => {
      const existingItem = prev.find(item => item.product.id === productId);
      if (existingItem) {
        return prev.map(item =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleCreateOrder = async () => {
    if (cartItems.length === 0 || !customerName.trim()) return;

    const orderId = await createOrder(cartItems, customerName.trim(), paymentMethod);
    
    if (orderId) {
      setCartItems([]);
      setCustomerName('');
      setPaymentMethod('cash');
      setShowCreateOrder(false);
      refetch();
      
      // Print invoice
      printInvoice(orderId, cartItems, customerName, paymentMethod);
    }
  };

  const printInvoice = (orderId: string, items: CartItem[], customer: string, payment: string) => {
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const tax = total * 0.11;
    const finalTotal = total + tax;
    const orderNumber = `ORD-${Date.now()}`;

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
            <p><strong>Customer:</strong> ${customer}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <p><strong>Payment Method:</strong> ${payment.charAt(0).toUpperCase() + payment.slice(1)}</p>
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
              ${items.map(item => `
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
            <div class="total-line">Tax (11%): $${tax.toFixed(2)}</div>
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

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">Create new orders and manage existing ones</p>
          {pendingOrders.length > 0 && (
            <div className="mt-2 flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium w-fit">
              <Clock size={16} />
              {pendingOrders.length} pending orders
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCreateOrder(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Create Order
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">#{order.order_number}</div>
                    <div className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{order.customer_name || 'Walk-in Customer'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">${order.total_amount.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Mark as Completed"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Cancel Order"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
                <button
                  onClick={() => setShowCreateOrder(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Products</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {products.filter(p => p.is_available).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600">${product.price.toFixed(2)}</div>
                        </div>
                        <button
                          onClick={() => addToCart(product.id)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                  
                  {/* Customer Info */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter customer name"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{item.product.name}</div>
                          <div className="text-xs text-gray-600">${item.product.price.toFixed(2)} each</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="bg-gray-200 hover:bg-gray-300 w-6 h-6 rounded flex items-center justify-center text-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="bg-gray-200 hover:bg-gray-300 w-6 h-6 rounded flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-orange-600">${total.toFixed(2)}</span>
                    </div>
                    
                    <button
                      onClick={handleCreateOrder}
                      disabled={cartItems.length === 0 || !customerName.trim() || orderLoading}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {orderLoading ? 'Creating Order...' : 'Create Order & Print Invoice'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}