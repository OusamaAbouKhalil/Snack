/**
 * Shared thermal receipt (80mm) builder + printer.
 *
 * - Prints via a hidden iframe: immune to popup blockers.
 * - Prints TWO copies per job (customer + store) separated by a cut line;
 *   thermal rolls print both in one pass.
 * - Always uses the REAL saved order number and settings-driven exchange rate.
 */

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface ReceiptData {
  orderNumber: string;
  customerName: string;
  paymentMethod: string;
  items: ReceiptItem[];
  total: number;
  deliveryFee?: number;
  orderType?: string;
  deliveryAddress?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface ReceiptSettings {
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  usd_to_lbp_rate?: string | number;
}

import { roundLbpCash } from './currency';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function formatCurrency(amount: number, rate: number, cash = false): string {
  const usd = amount.toFixed(2);
  const rawLbp = amount * rate;
  const lbp = (cash ? roundLbpCash(rawLbp) : Math.round(rawLbp)).toLocaleString();
  return `${usd}$ / ${lbp} LBP`;
}

function receiptBody(data: ReceiptData, settings: ReceiptSettings, copyLabel: string): string {
  const rate = Number(settings.usd_to_lbp_rate) || 90000;
  const when = data.createdAt ? new Date(data.createdAt) : new Date();
  const subtotal = data.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const deliveryFee = data.deliveryFee || 0;
  const isDelivery = data.orderType === 'delivery';

  return `
    <div class="receipt">
      <div class="header">
        <img src="/logo.png" alt="${esc(settings.store_name || 'Hadi Snack')}" class="logo-img" />
        <div class="store-name">${esc(settings.store_name || 'Hadi Snack')}</div>
        ${settings.store_address ? `<div class="store-info">${esc(settings.store_address)}</div>` : ''}
        ${settings.store_phone ? `<div class="store-info">${esc(settings.store_phone)}</div>` : ''}
        ${copyLabel ? `<div class="copy-label">${esc(copyLabel)}</div>` : ''}
      </div>

      <div class="order-meta">
        <div class="order-number">#${esc(data.orderNumber)}</div>
        <div class="meta-grid">
          <div><span class="meta-label">Date</span>${when.toLocaleDateString()}</div>
          <div><span class="meta-label">Time</span>${when.toLocaleTimeString()}</div>
          <div><span class="meta-label">Customer</span>${esc(data.customerName || 'Walk-in')}</div>
          <div><span class="meta-label">Payment</span>${esc(data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1))}</div>
        </div>
        <div class="tag-row">
          <span class="tag">${isDelivery ? 'DELIVERY' : 'PICKUP'}</span>
        </div>
        ${data.deliveryAddress ? `
        <div class="address-block">
          <span class="meta-label">Delivery address</span>
          <div>${esc(data.deliveryAddress)}</div>
        </div>` : ''}
        ${data.notes ? `<div class="notes-block"><span class="meta-label">Notes</span>${esc(data.notes)}</div>` : ''}
      </div>

      <div class="separator"></div>

      <div class="items-table">
        <div class="items-head">
          <span>Item</span><span>Qty</span><span>Total</span>
        </div>
        ${data.items
          .map((item) => {
            const lineTotal = item.unit_price * item.quantity;
            return `
          <div class="item-row">
            <span class="item-name">${esc(item.name)}</span>
            <span class="item-qty">x${item.quantity}</span>
            <span class="item-total">${lineTotal.toFixed(2)}$</span>
          </div>
          <div class="item-sub">${formatCurrency(lineTotal, rate)}${item.quantity > 1 ? ` <span class="item-each">(${item.unit_price.toFixed(2)}$ each)</span>` : ''}</div>`;
          })
          .join('')}
      </div>

      <div class="separator"></div>

      <div class="total-section">
        <div class="sub-line"><span>Subtotal</span><span>${formatCurrency(subtotal, rate)}</span></div>
        ${deliveryFee > 0 ? `<div class="sub-line"><span>Delivery fee</span><span>${formatCurrency(deliveryFee, rate)}</span></div>` : ''}
      </div>

      <div class="total-box">
        <span class="total-label">TOTAL DUE</span>
        <span class="total-usd">$${data.total.toFixed(2)}</span>
        <span class="total-lbp">≈ ${roundLbpCash(data.total * rate).toLocaleString()} LBP</span>
      </div>

      <div class="footer">
        <div class="thanks">Thank you for your order!</div>
        <div>Come back soon</div>
      </div>
    </div>`;
}

export function buildReceiptHTML(data: ReceiptData, settings: ReceiptSettings, copies = 2): string {
  const labels = ['CUSTOMER COPY', 'STORE COPY', 'COPY 3', 'COPY 4'];
  const bodies = Array.from({ length: Math.max(1, copies) }, (_, i) =>
    receiptBody(data, settings, copies > 1 ? labels[i] || `COPY ${i + 1}` : '')
  ).join('<div class="cut-line">✂ ------------------------------------------- ✂</div>');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt - ${esc(data.orderNumber)}</title>
<style>
  @media print {
    @page { margin: 0; size: 80mm auto; }
    body { margin: 0; }
  }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.35;
    margin: 0;
    padding: 10px;
    width: 72mm;
    background: white;
    color: #000;
  }

  /* Header */
  .header { text-align: center; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 2px solid #000; }
  .logo-img { max-width: 56px; margin: 0 auto 6px; display: block; }
  .store-name { font-size: 15px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 2px; }
  .store-info { font-size: 10px; color: #333; margin-bottom: 1px; }
  .copy-label {
    display: inline-block; font-size: 9px; font-weight: bold; letter-spacing: 1.5px;
    margin-top: 6px; padding: 2px 10px; border: 1px solid #000; border-radius: 10px;
  }

  /* Order meta */
  .order-meta { margin-bottom: 8px; }
  .order-number { font-size: 15px; font-weight: bold; text-align: center; margin-bottom: 6px; letter-spacing: 0.5px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 8px; font-size: 11px; }
  .meta-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; }
  .tag-row { text-align: center; margin: 8px 0 2px; }
  .tag {
    display: inline-block; font-size: 10px; font-weight: bold; letter-spacing: 1px;
    padding: 3px 12px; border: 1.5px solid #000; border-radius: 3px;
  }
  .address-block, .notes-block { font-size: 11px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #999; }

  .separator { border-top: 1px dashed #000; margin: 8px 0; }

  /* Items */
  .items-table { width: 100%; margin-bottom: 4px; font-size: 11px; }
  .items-head {
    display: grid; grid-template-columns: 1fr 32px 56px; font-size: 9px; font-weight: bold;
    text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 4px;
  }
  .items-head span:last-child, .items-head span:nth-child(2) { text-align: right; }
  .item-row { display: grid; grid-template-columns: 1fr 32px 56px; font-weight: bold; }
  .item-qty { text-align: right; }
  .item-total { text-align: right; }
  .item-sub { font-size: 9px; color: #444; margin-bottom: 5px; }
  .item-each { color: #777; }

  /* Totals */
  .total-section { font-size: 11px; margin-bottom: 8px; }
  .sub-line { display: flex; justify-content: space-between; padding: 1px 0; }
  .total-box {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    border: 2px solid #000; border-radius: 6px; padding: 8px 4px; margin-bottom: 4px;
  }
  .total-label { font-size: 10px; font-weight: bold; letter-spacing: 1.5px; margin-bottom: 2px; }
  .total-usd { font-size: 20px; font-weight: bold; line-height: 1.1; }
  .total-lbp { font-size: 11px; color: #333; margin-top: 1px; }

  .footer { text-align: center; margin-top: 12px; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px; }
  .thanks { font-weight: bold; font-size: 11px; margin-bottom: 2px; }
  .cut-line { text-align: center; font-size: 10px; margin: 14px 0; page-break-after: always; }
</style>
</head>
<body>${bodies}</body>
</html>`;
}

/** Print via hidden iframe — no popups, no blockers. */
export function printReceipt(data: ReceiptData, settings: ReceiptSettings, copies = 2): void {
  const html = buildReceiptHTML(data, settings, copies);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // Give the print dialog time to grab the document before cleanup.
      setTimeout(() => iframe.remove(), 60_000);
    }
  };

  // Wait for the logo image so it appears on the receipt.
  const img = doc.querySelector('img');
  if (img && !(img as HTMLImageElement).complete) {
    img.addEventListener('load', doPrint);
    img.addEventListener('error', doPrint);
    setTimeout(doPrint, 1500); // fallback if events never fire
  } else {
    doPrint();
  }
}
