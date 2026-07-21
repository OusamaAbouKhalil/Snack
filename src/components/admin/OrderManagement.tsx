import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Clock,
  Check,
  X,
  Printer,
  Pencil,
  Eye,
  Bike,
  Store,
  Phone,
  MapPin,
  Crosshair,
  UserX,
  UserPlus,
  Tag,
  IceCream2,
  UtensilsCrossed,
  CupSoda,
  Coffee,
  Cookie,
  Sandwich,
  Soup,
  Salad,
  Cake,
  Milk,
  Pizza,
  Croissant,
  Layers,
  Wind,
  Grid3x3,
  Banknote,
  CreditCard,
  Package,
  MessageCircle,
} from "lucide-react";
import { useOrderHistory } from "../../hooks/useOrderHistory";
import { useProducts } from "../../hooks/useProducts";
import { useOrders } from "../../hooks/useOrders";
import { useSettings } from "../../hooks/useSettings";
import { useCustomers } from "../../hooks/useCustomers";
import { useAdminOrderFeed } from "../../hooks/useAdminOrderFeed";
import { useToast } from "../ui/Toast";
import { printReceipt } from "../../lib/receipt";
import { roundLbpCash } from "../../lib/currency";
import { whatsappLink, buildOrderWhatsAppMessage } from "../../lib/whatsapp";
import { supabase } from "../../lib/supabase";
import { EditOrderModal } from "./EditOrderModal";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { CartItem, Customer, Order } from "../../types";
import {
  Card, PageHeader, Button, IconButton, Badge, Input, Select, Modal,
  Spinner, TableShell, Thead, Th, Td, EmptyState,
} from "./ui/Kit";

// Keyword match against the category name (English + Arabic) — no schema
// change needed for an icon column. Falls back to a generic tag for
// anything unmatched. Order matters: more specific rules come first.
const CATEGORY_ICON_RULES: Array<[RegExp, typeof Tag]> = [
  [/burger/i, Croissant],
  [/fries|chips|potato/i, Grid3x3],
  [/chicken|wings/i, Layers],
  [/shake/i, Milk],
  [/hookah|shisha/i, Wind],
  [/add[\s-]?on/i, Plus],
  [/خبز|كعك|bread|bun|kaak/i, Croissant],
  [/قشطة|cream|ashta/i, IceCream2],
  [/sweet|dessert/i, IceCream2],
  [/savory|savoury/i, UtensilsCrossed],
  [/cake/i, Cake],
  [/pizza/i, Pizza],
  [/sandwich|panini|wrap/i, Sandwich],
  [/soup/i, Soup],
  [/salad/i, Salad],
  [/milk|dairy/i, Milk],
  [/coffee|espresso|latte|قهوة/i, Coffee],
  [/beverage|drink|juice|soda|شراب|عصير/i, CupSoda],
  [/snack|cookie/i, Cookie],
];

function categoryIcon(name: string) {
  for (const [re, Icon] of CATEGORY_ICON_RULES) if (re.test(name)) return Icon;
  return Tag;
}

const emptyDelivery = { address: "", lat: null as number | null, lng: null as number | null, fee: "0" };
const emptyNewCustomer = { name: "", phone: "", address: "" };

interface OrderManagementProps {
  /** Order id to jump straight to (e.g. from the shell's new-order popup). */
  focusOrderId?: string | null;
  onFocusHandled?: () => void;
}

export function OrderManagement({ focusOrderId, onFocusHandled }: OrderManagementProps = {}) {
  const { orders, loading, updateOrderStatus, refetch } = useOrderHistory();
  const { products, categories, loading: productsLoading, refetch: refetchProducts } = useProducts();
  const { createOrder, loading: orderLoading } = useOrders();
  const { getOrderWithItems } = useOrders();
  const { settings } = useSettings();
  const { customers, createCustomer } = useCustomers();
  const { success: toastSuccess, error: toastError } = useToast();

  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState(emptyNewCustomer);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [delivery, setDelivery] = useState(emptyDelivery);
  const [quotingFee, setQuotingFee] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);

  const EXCHANGE_RATE = Number(settings?.usd_to_lbp_rate) || 90000;

  // Live feed keeps the list fresh; the admin shell owns the chime + toast.
  useAdminOrderFeed(() => {
    refetch();
  }, { sound: false });

  // Jump straight to an order (e.g. from the shell's new-order popup).
  useEffect(() => {
    if (!focusOrderId) return;
    setViewingOrderId(focusOrderId);
    onFocusHandled?.();
  }, [focusOrderId, onFocusHandled]);

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

  const matchingCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q))
      .slice(0, 6);
  }, [customers, customerQuery]);

  const handleOpenCreateOrder = () => {
    if (products.length === 0 && !productsLoading) refetchProducts();
    setShowCreateOrder(true);
  };

  const handleCloseCreateOrder = () => {
    setShowCreateOrder(false);
    setCartItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedCustomer(null);
    setCustomerQuery("");
    setShowNewCustomer(false);
    setNewCustomer(emptyNewCustomer);
    setOrderType("pickup");
    setDelivery(emptyDelivery);
    setPaymentMethod("cash");
    setProductSearch("");
    setSelectedCategory("all");
  };

  const formatCurrency = (amount: number, cash = false) => {
    const usd = amount.toFixed(2);
    const rawLbp = amount * EXCHANGE_RATE;
    const lbp = (cash ? roundLbpCash(rawLbp) : Math.round(rawLbp)).toLocaleString();
    return `${usd}$ / ${lbp} LBP`;
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || "");
    setCustomerQuery(customer.name);
    setDelivery({
      address: customer.address || "",
      lat: customer.location_lat ?? null,
      lng: customer.location_lng ?? null,
      fee: delivery.fee,
    });
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerName("");
    setCustomerPhone("");
    setDelivery(emptyDelivery);
  };

  const openNewCustomer = () => {
    setNewCustomer({ name: customerQuery.trim(), phone: "", address: "" });
    setShowNewCustomer(true);
  };

  const saveNewCustomer = async () => {
    if (!newCustomer.name.trim()) return toastError("Customer name is required");
    setSavingCustomer(true);
    const created = await createCustomer({
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim(),
      address: newCustomer.address.trim() || null,
    } as any);
    setSavingCustomer(false);
    if (created) {
      selectCustomer(created);
      setShowNewCustomer(false);
      toastSuccess(`Added ${created.name} as a new customer`);
    } else {
      toastError("Could not create customer");
    }
  };

  const autoQuoteFee = async () => {
    if (delivery.lat == null || delivery.lng == null) return;
    setQuotingFee(true);
    const { data, error } = await supabase.rpc("quote_delivery_fee", {
      p_lat: delivery.lat,
      p_lng: delivery.lng,
    });
    setQuotingFee(false);
    if (!error && data) {
      setDelivery((d) => ({ ...d, fee: String(Number(data.fee) || 0) }));
    } else {
      toastError("Could not quote a delivery fee for this location");
    }
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
      setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const handleCreateOrder = async () => {
    if (cartItems.length === 0 || !customerName.trim()) return;
    if (orderType === "delivery" && !delivery.address.trim()) {
      toastError("Enter a delivery address");
      return;
    }

    const deliveryFeeValue = orderType === "delivery" ? parseFloat(delivery.fee) || 0 : null;

    const created = await createOrder({
      items: cartItems,
      customerName: customerName.trim(),
      paymentMethod,
      customerId: selectedCustomer?.id ?? null,
      orderType,
      deliveryFee: deliveryFeeValue,
      deliveryAddress: orderType === "delivery" ? delivery.address.trim() : null,
      deliveryLat: orderType === "delivery" ? delivery.lat : null,
      deliveryLng: orderType === "delivery" ? delivery.lng : null,
      customerPhone: customerPhone.trim() || null,
      source: "pos",
    });

    if (created) {
      // Print with the REAL saved order number.
      printReceipt(
        {
          orderNumber: created.order_number,
          customerName: customerName.trim(),
          paymentMethod,
          items: cartItems.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            unit_price: i.product.price,
          })),
          total: Number(created.total_amount),
          deliveryFee: Number(created.delivery_fee) || 0,
          orderType: created.order_type,
          deliveryAddress: orderType === "delivery" ? delivery.address.trim() : null,
        },
        settings || {}
      );

      handleCloseCreateOrder();
      refetch();
    } else {
      toastError("Could not create the order");
    }
  };

  // Reprint any order from the list.
  const reprintOrder = async (order: Order) => {
    const result = await getOrderWithItems(order.id);
    if (!result) {
      toastError("Could not load order for printing");
      return;
    }
    printReceipt(
      {
        orderNumber: result.order.order_number,
        customerName: result.order.customer_name,
        paymentMethod: result.order.payment_method,
        items: result.items.map((i: any) => ({
          name: i.products?.name || "Item",
          quantity: i.quantity,
          unit_price: Number(i.unit_price),
        })),
        total: Number(result.order.total_amount),
        deliveryFee: Number(result.order.delivery_fee) || 0,
        orderType: result.order.order_type,
        deliveryAddress: result.order.delivery_address,
        notes: result.order.notes,
        createdAt: result.order.created_at,
      },
      settings || {}
    );
  };

  // Share the order summary on WhatsApp — opens a prefilled chat, no API needed.
  const sendWhatsAppOrder = async (order: Order) => {
    if (!order.customer_phone) {
      toastError("This order has no phone number on file");
      return;
    }
    const result = await getOrderWithItems(order.id);
    if (!result) {
      toastError("Could not load order details");
      return;
    }
    const message = buildOrderWhatsAppMessage({
      orderNumber: result.order.order_number,
      customerName: result.order.customer_name,
      items: result.items.map((i: any) => ({ name: i.products?.name || "Item", quantity: i.quantity })),
      total: Number(result.order.total_amount),
      orderType: result.order.order_type,
      deliveryAddress: result.order.delivery_address,
    });
    const link = whatsappLink(order.customer_phone, message);
    if (!link) return toastError("Invalid phone number");
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order Management"
        subtitle="Create new orders and manage existing ones"
        actions={<Button icon={Plus} onClick={handleOpenCreateOrder}>Create Order</Button>}
      />

      {pendingOrders.length > 0 && (
        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-full text-sm font-semibold w-fit">
          <Clock size={16} />
          {pendingOrders.length} pending orders
        </div>
      )}

      {/* Search */}
      <Card>
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
      </Card>

      {/* Recent Orders */}
      <Card padded={false}>
        <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Recent Orders</h2>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState title="No orders found" message="Try a different search term." />
        ) : (
          <TableShell>
            <Thead>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Type</Th>
              <Th>Payment</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredOrders.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td>
                    <div className="font-medium text-gray-900 dark:text-gray-100">#{order.order_number}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}{' '}
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-gray-900 dark:text-gray-100">
                      {order.customer_name || "Walk-in Customer"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {order.source === "online" && <Badge tone="info">Online</Badge>}
                      {order.customer_phone && <span>{order.customer_phone}</span>}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300"
                      title={order.order_type === "delivery" ? order.delivery_address || undefined : undefined}
                    >
                      {order.order_type === "delivery" ? <Bike size={13} /> : <Package size={13} />}
                      {order.order_type === "delivery" ? "Delivery" : "Pickup"}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {order.payment_method === "card" ? <CreditCard size={13} /> : <Banknote size={13} />}
                      {order.payment_method}
                    </span>
                  </Td>
                  <Td className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(order.total_amount, true)}
                  </Td>
                  <Td>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-bold border-0 cursor-pointer ${
                        order.status === "completed"
                          ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
                          : order.status === "pending"
                          ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
                          : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300"
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <IconButton icon={Eye} label="View Order" onClick={() => setViewingOrderId(order.id)} />
                      {order.status === "pending" && (
                        <>
                          <IconButton icon={Check} label="Mark as Completed" tone="primary" onClick={() => updateOrderStatus(order.id, "completed")} />
                          <IconButton icon={X} label="Cancel Order" tone="danger" onClick={() => updateOrderStatus(order.id, "cancelled")} />
                          <IconButton icon={Pencil} label="Edit Order" tone="primary" onClick={() => setEditingOrder(order)} />
                        </>
                      )}
                      <IconButton icon={Printer} label="Print Receipt" onClick={() => reprintOrder(order)} />
                      {order.customer_phone && (
                        <IconButton
                          icon={MessageCircle}
                          label="Send order via WhatsApp"
                          onClick={() => sendWhatsAppOrder(order)}
                          className="!text-green-600 dark:!text-green-400 hover:!bg-green-50 dark:hover:!bg-green-900/20"
                        />
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {/* Create Order Modal */}
      <Modal
        open={showCreateOrder}
        onClose={handleCloseCreateOrder}
        title="Create New Order"
        maxWidth="max-w-5xl"
        footer={
          <div className="w-full space-y-3">
            {cartItems.length > 0 && (
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pe-1">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg ps-3 pe-1.5 py-1"
                  >
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate max-w-[110px]">
                      {item.product.name}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 w-5 h-5 rounded flex items-center justify-center text-xs text-gray-900 dark:text-gray-100 transition-colors"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 w-5 h-5 rounded flex items-center justify-center text-xs text-gray-900 dark:text-gray-100 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {cartItems.length === 0 ? "No items yet" : `${cartItems.reduce((s, i) => s + i.quantity, 0)} item(s)`}
                </p>
                <p className="text-xl font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">{formatCurrency(total, true)}</p>
              </div>
              <Button
                onClick={handleCreateOrder}
                disabled={cartItems.length === 0 || !customerName.trim() || orderLoading}
                loading={orderLoading}
                className="flex-shrink-0"
              >
                {orderLoading ? "Creating…" : "Create Order & Print"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Products</h3>

            <div className="mb-3 relative">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <Input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="ps-10"
              />
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                  selectedCategory === "all"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Tag size={14} />
                All
              </button>
              {categories.map((category) => {
                const Icon = categoryIcon(category.name);
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                      selectedCategory === category.id
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <Icon size={14} />
                    {category.name}
                  </button>
                );
              })}
            </div>

            {productsLoading && products.length === 0 ? (
              <Spinner size={24} />
            ) : filteredProducts.length === 0 ? (
              <EmptyState title="No products found" message="Try adjusting your search or category filter" />
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pe-2">
                {filteredProducts.map((product) => {
                  const category = categories.find((c) => c.id === product.category_id);
                  const Icon = categoryIcon(category?.name || "");
                  return (
                    <div
                      key={product.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 hover:shadow-card transition-all cursor-pointer hover:bg-primary-50 dark:hover:bg-gray-600 hover:border-primary-300 dark:hover:border-primary-600 flex items-center gap-3"
                      onClick={() => addToCart(product.id)}
                    >
                      <span className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-primary-600 dark:text-primary-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 mb-0.5 truncate">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{product.description}</div>
                        )}
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="font-semibold text-primary-600 dark:text-primary-400 text-sm whitespace-nowrap">
                          {formatCurrency(product.price)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-5">
            <Card padded={false} className="p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Customer</h3>

              {selectedCustomer ? (
                <div className="flex items-center justify-between gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{selectedCustomer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Phone size={11} /> {selectedCustomer.phone || "no phone on file"}
                    </p>
                  </div>
                  <IconButton icon={UserX} label="Clear customer" onClick={clearCustomer} />
                </div>
              ) : showNewCustomer ? (
                <div className="space-y-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <Input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Customer name"
                  />
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="Phone"
                  />
                  <Input
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer((c) => ({ ...c, address: e.target.value }))}
                    placeholder="Address (optional)"
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowNewCustomer(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="button" size="sm" icon={UserPlus} loading={savingCustomer} onClick={saveNewCustomer} className="flex-1">
                      Save Customer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                  <Input
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setCustomerName(e.target.value);
                    }}
                    className="ps-10"
                    placeholder="Search by name or phone, or type a new walk-in name…"
                  />
                  {matchingCustomers.length > 0 && (
                    <div className="mt-1.5 border border-gray-200 dark:border-gray-600 rounded-xl divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
                      {matchingCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors text-start"
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={openNewCustomer}
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    <UserPlus size={13} /> Add new customer
                  </button>
                </div>
              )}

              {!showNewCustomer && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    disabled={!!selectedCustomer}
                  />
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    disabled={!!selectedCustomer}
                  />
                </div>
              )}
            </Card>

            <Card padded={false} className="p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Fulfillment</h3>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setOrderType("pickup")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    orderType === "pickup"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  <Store size={16} /> Pickup
                </button>
                <button
                  onClick={() => setOrderType("delivery")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    orderType === "delivery"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  <Bike size={16} /> Delivery
                </button>
              </div>

              {orderType === "delivery" && (
                <div className="space-y-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4">
                  <div className="relative">
                    <MapPin className="absolute start-3 top-3 text-gray-400 dark:text-gray-500" size={15} />
                    <textarea
                      value={delivery.address}
                      onChange={(e) => setDelivery((d) => ({ ...d, address: e.target.value }))}
                      className="w-full ps-9 pe-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
                      rows={2}
                      placeholder="Delivery address"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={delivery.fee}
                      onChange={(e) => setDelivery((d) => ({ ...d, fee: e.target.value }))}
                      placeholder="Delivery fee (USD)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={Crosshair}
                      loading={quotingFee}
                      disabled={delivery.lat == null || delivery.lng == null}
                      onClick={autoQuoteFee}
                    >
                      Auto-quote
                    </Button>
                  </div>
                  {delivery.lat == null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No saved location for this customer — enter the fee manually.
                    </p>
                  )}
                </div>
              )}

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </Select>
            </Card>
          </div>
        </div>
      </Modal>

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          products={products}
          onClose={() => setEditingOrder(null)}
          onSaved={refetch}
        />
      )}

      {viewingOrderId && (
        <OrderDetailsModal orderId={viewingOrderId} onClose={() => setViewingOrderId(null)} />
      )}
    </div>
  );
}
