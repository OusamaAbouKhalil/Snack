import { Calendar, CreditCard, User, Phone, MapPin, Truck, FileText, Printer } from 'lucide-react';
import { useOrderDetails } from '../../hooks/useOrderDetails';
import { useSettings } from '../../hooks/useSettings';
import { printReceipt } from '../../lib/receipt';
import { Modal, Button, Badge, Spinner } from './ui/Kit';

interface OrderDetailsModalProps {
  orderId: string;
  onClose: () => void;
}

export function OrderDetailsModal({ orderId, onClose }: OrderDetailsModalProps) {
  const { order, items, loading } = useOrderDetails(orderId);
  const { settings } = useSettings();

  if (!loading && !order) {
    return null;
  }

  const deliveryFee = order ? Number(order.delivery_fee) || 0 : 0;
  const hasMapLink = order && order.delivery_lat != null && order.delivery_lng != null;

  // Print the receipt (2 copies) from the already-loaded order details.
  const handlePrintReceipt = () => {
    if (!order) return;
    printReceipt(
      {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        paymentMethod: order.payment_method,
        items: items.map((item) => ({
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        total: Number(order.total_amount),
        deliveryFee,
        orderType: order.order_type,
        deliveryAddress: order.delivery_address,
        notes: order.notes,
        createdAt: order.created_at,
      },
      settings || {},
      2
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Order Details"
      maxWidth="max-w-2xl"
      footer={
        order ? (
          <Button icon={Printer} onClick={handlePrintReceipt} className="ms-auto">
            Print receipt
          </Button>
        ) : undefined
      }
    >
      {loading || !order ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {order.source === 'online' && (
            <Badge tone="info">Online</Badge>
          )}

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-gray-500 dark:text-gray-400" size={16} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Number</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">#{order.order_number}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <User className="text-gray-500 dark:text-gray-400" size={16} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{order.customer_name || 'Walk-in Customer'}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-gray-500 dark:text-gray-400" size={16} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{order.payment_method}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-gray-500 dark:text-gray-400" size={16} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>

            {order.order_type && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="text-gray-500 dark:text-gray-400" size={16} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Type</span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{order.order_type}</p>
              </div>
            )}

            {order.customer_phone && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="text-gray-500 dark:text-gray-400" size={16} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{order.customer_phone}</p>
              </div>
            )}

            {(order.delivery_address || hasMapLink) && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-gray-500 dark:text-gray-400" size={16} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery Address</span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {order.delivery_address || 'No address provided'}
                </p>
                {hasMapLink && (
                  <a
                    href={`https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    <MapPin size={14} />
                    Open in Google Maps
                  </a>
                )}
              </div>
            )}

            {order.notes && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-gray-500 dark:text-gray-400" size={16} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Items</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.product_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ${item.unit_price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    ${item.total_price.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Total */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            {deliveryFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery Fee:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">${deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Amount:</span>
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                ${order.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
