import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  ShoppingCart,
  User,
  CreditCard,
  Clock,
  Check,
  X,
  Printer,
} from "lucide-react";
import { useOrderHistory } from "../../hooks/useOrderHistory";
import { useProducts } from "../../hooks/useProducts";
import { useOrders } from "../../hooks/useOrders";
import { useSettings } from "../../hooks/useSettings";
import { CartItem } from "../../types";

export function OrderManagement() {
  const { orders, loading, updateOrderStatus, refetch } = useOrderHistory();
  const { products, categories, loading: productsLoading, refetch: refetchProducts } = useProducts();
  const { createOrder, loading: orderLoading } = useOrders();
  const { settings } = useSettings();

  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const EXCHANGE_RATE = 90000;

  // Memoize filtered data to avoid recalculation on every render
  const pendingOrders = useMemo(() => 
    orders.filter((order) => order.status === "pending"),
    [orders]
  );
  
  const filteredOrders = useMemo(() =>
    orders.filter(
      (order) =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [orders, searchTerm]
  );

  const filteredProducts = useMemo(() =>
    products
      .filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                             p.description?.toLowerCase().includes(productSearch.toLowerCase());
        const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
        return p.is_available && matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    [products, productSearch, selectedCategory]
  );

  // Refetch products when modal opens to ensure latest products are shown
  const handleOpenCreateOrder = () => {
    refetchProducts();
    setShowCreateOrder(true);
  };

  // Handle closing the modal and resetting filters
  const handleCloseCreateOrder = () => {
    setShowCreateOrder(false);
    setCartItems([]);
    setCustomerName("");
    setPaymentMethod("cash");
    setProductSearch("");
    setSelectedCategory("all");
  };

  const formatCurrency = (amount: number) => {
    const usd = amount.toFixed(2);
    const lbp = Math.round(amount * EXCHANGE_RATE).toLocaleString();
    return `${usd}$ / ${lbp} LBP`;
  };

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.product.id === productId);
      if (existingItem) {
        return prev.map((item) =>
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
      setCartItems((prev) =>
        prev.filter((item) => item.product.id !== productId)
      );
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleCreateOrder = async () => {
    if (cartItems.length === 0 || !customerName.trim()) return;

    const orderId = await createOrder(
      cartItems,
      customerName.trim(),
      paymentMethod
    );

    if (orderId) {
      setCartItems([]);
      setCustomerName("");
      setPaymentMethod("cash");
      setProductSearch("");
      setSelectedCategory("all");
      setShowCreateOrder(false);
      refetch();

      // Print invoice
      printInvoice(orderId, cartItems, customerName, paymentMethod);
    }
  };

  const printInvoice = (
    orderId: string,
    items: CartItem[],
    customer: string,
    payment: string
  ) => {
    const total = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const orderNumber = `ORD-${Date.now()}`;
    const storeName = settings?.store_name || "BeSweet";
    const storeAddress = settings?.store_address || "";
    const storePhone = settings?.store_phone || "";

    const formatPrintCurrency = (amount: number) => {
      const usd = amount.toFixed(2);
      const lbp = Math.round(amount * EXCHANGE_RATE).toLocaleString();
      return `${usd}$ / ${lbp} LBP`;
    };

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

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
          .items-table { 
            width: 100%; 
            margin-bottom: 8px; 
            font-size: 11px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .item-name {
            flex: 1;
            padding-right: 4px;
            font-weight: bold;

          }
          .item-qty {
            width: 20px;
            text-align: center;
            font-weight: bold;
          }
          .item-price {
            width: 80px;
            text-align: right;
            white-space: nowrap;
            font-weight: bold;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .total-section { 
            font-size: 11px;
          }
          .final-total { 
            font-weight: bold; 
            font-size: 13px; 
            border-top: 1px dashed #000; 
            padding-top: 4px;
            margin-top: 4px;
            display: flex;
            justify-content: space-between;
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
                 <img
                  src="/logo.png"
                  alt="BeSweet Logo"
                style="max-width:60px; margin:0 auto 4px; display:block;"
                />
                ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ""}
                ${storePhone ? `<div class="store-info">${storePhone}</div>` : ""}
              </div>

        
        <div class="order-info">
          <div><strong>Order:</strong> ${orderNumber}</div>
        <div>  <strong><strong>Customer:</strong> ${customer}</strong></div>
          <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
          <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
          <div><strong>Payment:</strong> ${
            payment.charAt(0).toUpperCase() + payment.slice(1)
          }</div>
        </div>

        <div class="separator"></div>

      <div class="items-table">
  ${items
    .map(
      (item) => `
        <div class="item-row">
          <div class="item-name" style="font-weight:bold;">${
            item.product.name
          }</div>
        </div>
        <div style="font-size:10px; color:#000000ff; margin-bottom:4px; font-weight:bold;">
          ${formatPrintCurrency(item.product.price)} x ${item.quantity}
        </div>
      `
    )
    .join("")}
</div>


        <div class="total-section">
          <div class="final-total">
            <span>TOTAL:</span>
            <span>${formatPrintCurrency(total)}</span>
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

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Order Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Create new orders and manage existing ones
          </p>
          {pendingOrders.length > 0 && (
            <div className="mt-2 flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-3 py-1 rounded-full text-sm font-medium w-fit">
              <Clock size={16} />
              {pendingOrders.length} pending orders
            </div>
          )}
        </div>
        <button
          onClick={handleOpenCreateOrder}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Create Order
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
            size={20}
          />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
          />
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Orders</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      #{order.order_number}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-gray-100">
                      {order.customer_name || "Walk-in Customer"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(order.total_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(order.id, e.target.value)
                      }
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${
                        order.status === "completed"
                          ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
                          : order.status === "pending"
                          ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300"
                          : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300"
                      } transition-colors duration-300`}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      {order.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              updateOrderStatus(order.id, "completed")
                            }
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 transition-colors duration-200"
                            title="Mark as Completed"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() =>
                              updateOrderStatus(order.id, "cancelled")
                            }
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 transition-colors duration-200"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transition-colors duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Create New Order
                </h2>
                <button
                  onClick={handleCloseCreateOrder}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Select Products
                  </h3>
                  
                  {/* Search Bar */}
                  <div className="mb-3 relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                      size={20}
                    />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedCategory === "all"
                            ? "bg-orange-500 dark:bg-orange-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        All
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedCategory === category.id
                              ? "bg-orange-500 dark:bg-orange-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Products List */}
                  {productsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <p>No products found</p>
                      <p className="text-sm mt-1">Try adjusting your search or category filter</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 hover:shadow-md transition-all cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-600 hover:border-orange-300 dark:hover:border-orange-600 flex items-center justify-between"
                          onClick={() => addToCart(product.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                {product.description}
                              </div>
                            )}
                          </div>
                          <div className="ml-3 text-right">
                            <div className="font-semibold text-orange-600 dark:text-orange-400 text-sm whitespace-nowrap">
                              {formatCurrency(product.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Order Summary
                  </h3>

                  {/* Customer Info */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
                      placeholder="Enter customer name"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                      >
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {item.product.name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {formatCurrency(item.product.price)} each
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 w-6 h-6 rounded flex items-center justify-center text-sm text-gray-900 dark:text-gray-100 transition-colors duration-200"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm text-gray-900 dark:text-gray-100">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                            className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 w-6 h-6 rounded flex items-center justify-center text-sm text-gray-900 dark:text-gray-100 transition-colors duration-200"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Total:
                      </span>
                      <span className="text-xl font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                        {formatCurrency(total)}
                      </span>
                    </div>

                    <button
                      onClick={handleCreateOrder}
                      disabled={
                        cartItems.length === 0 ||
                        !customerName.trim() ||
                        orderLoading
                      }
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {orderLoading
                        ? "Creating Order..."
                        : "Create Order & Print Invoice"}
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
