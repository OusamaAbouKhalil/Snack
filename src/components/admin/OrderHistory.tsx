import { useState, useMemo } from 'react';
import { Search, Calendar, Eye, Download, Check, X, Clock, Printer, Truck } from 'lucide-react';
import { useOrderHistory } from '../../hooks/useOrderHistory';
import { useSettings } from '../../hooks/useSettings';
import { OrderDetailsModal } from './OrderDetailsModal';
import { supabase } from '../../lib/supabase';
import { printReceipt } from '../../lib/receipt';
import { Order } from '../../types';
import * as XLSX from 'xlsx';
import { Card, PageHeader, Button, IconButton, Badge, Input, Spinner, TableShell, Thead, Th, Td, EmptyState } from './ui/Kit';

// Local calendar date (YYYY-MM-DD) of a timestamp, matching <input type="date"> values.
const toDateInputValue = (timestamp: string) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function OrderHistory() {
  const { orders, loading, updateOrderStatus, refetch } = useOrderHistory();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  // Memoize filtered orders to avoid recalculation on every render
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      const matchesDate = !dateFilter || toDateInputValue(order.created_at) === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, dateFilter]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const success = await updateOrderStatus(orderId, newStatus);
    if (success) {
      refetch();
    }
  };

  // Reprint a receipt for any order in the list.
  const handlePrintReceipt = async (order: Order) => {
    if (printingOrderId) return;
    setPrintingOrderId(order.id);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('quantity, unit_price, products (name)')
        .eq('order_id', order.id);

      if (error) throw error;

      printReceipt(
        {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          paymentMethod: order.payment_method,
          items: (data || []).map((item: any) => ({
            name: item.products?.name || 'Item',
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
          })),
          total: Number(order.total_amount),
          deliveryFee: Number(order.delivery_fee) || 0,
          orderType: order.order_type,
          deliveryAddress: order.delivery_address,
          notes: order.notes,
          createdAt: order.created_at,
        },
        settings || {}
      );
    } catch (error) {
      console.error('Error printing receipt:', error);
    } finally {
      setPrintingOrderId(null);
    }
  };

  // Excel export function
  const exportToExcel = () => {
    // Prepare order data for Excel
    const orderData = orders.map(order => ({
      'Order Number': order.order_number,
      'Customer Name': order.customer_name || 'Walk-in Customer',
      'Total Amount': `$${order.total_amount}`,
      'Payment Method': order.payment_method,
      Status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
      'Date': new Date(order.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(orderData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // Download Excel file
    XLSX.writeFile(workbook, `Order_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const pendingCount = orders.filter(order => order.status === 'pending').length;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order History"
        subtitle="Track and manage all customer orders"
        actions={<Button icon={Download} onClick={exportToExcel}>Export Orders</Button>}
      />

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-full text-sm font-semibold w-fit">
          <Clock size={16} />
          {pendingCount} pending orders
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="relative">
            <Calendar className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={18} />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="ps-10 pe-9"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                title="Clear date filter"
                className="absolute end-9 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card padded={false}>
        {filteredOrders.length === 0 ? (
          <EmptyState title="No orders found" message="Try adjusting your filters." />
        ) : (
          <TableShell>
            <Thead>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Total</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </Thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td className="font-medium text-gray-900 dark:text-gray-100">#{order.order_number}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-gray-100">{order.customer_name || 'Walk-in Customer'}</span>
                      {order.source === 'online' && <Badge tone="info">Online</Badge>}
                      {order.order_type === 'delivery' && (
                        <Badge tone="primary"><Truck size={11} className="inline -mt-0.5 me-1" />Delivery</Badge>
                      )}
                    </div>
                  </Td>
                  <Td className="font-semibold text-gray-900 dark:text-gray-100">${order.total_amount}</Td>
                  <Td className="text-gray-900 dark:text-gray-100 capitalize">{order.payment_method}</Td>
                  <Td>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-bold border-0 cursor-pointer ${
                        order.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                          : order.status === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </Td>
                  <Td className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(order.created_at).toLocaleDateString()}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <IconButton icon={Eye} label="View details" tone="primary" onClick={() => setSelectedOrder(order.id)} />
                      <IconButton
                        icon={Printer}
                        label="Print receipt"
                        onClick={() => handlePrintReceipt(order)}
                        disabled={printingOrderId === order.id}
                      />
                      {order.status === 'pending' && (
                        <>
                          <IconButton icon={Check} label="Mark completed" onClick={() => handleStatusChange(order.id, 'completed')} />
                          <IconButton icon={X} label="Cancel order" tone="danger" onClick={() => handleStatusChange(order.id, 'cancelled')} />
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          orderId={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
