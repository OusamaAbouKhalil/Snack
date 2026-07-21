// wa.me deep link — no WhatsApp Business API needed, just opens a chat
// with the message pre-filled. Lebanese numbers are 8 digits locally
// (sometimes with a leading 0); this normalizes to the 961 country code.
export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const local = digits.startsWith('961') ? digits : `961${digits.replace(/^0+/, '')}`;
  return `https://wa.me/${local}?text=${encodeURIComponent(message)}`;
}

export function buildOrderWhatsAppMessage(opts: {
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; quantity: number }>;
  total: number;
  orderType?: string;
  deliveryAddress?: string | null;
}): string {
  const lines = [
    `Hi ${opts.customerName || 'there'}, thanks for your order #${opts.orderNumber} from Mat3amji!`,
    '',
    ...opts.items.map((i) => `• ${i.quantity}x ${i.name}`),
    '',
    `Total: $${opts.total.toFixed(2)}`,
  ];
  if (opts.orderType === 'delivery') {
    lines.push(opts.deliveryAddress ? `Delivery to: ${opts.deliveryAddress}` : 'Delivery order');
  } else {
    lines.push('Pickup order — see you soon!');
  }
  return lines.join('\n');
}
