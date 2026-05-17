import { Order } from '../types';

const escapeHtml = (value: unknown) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const formatDateTime = (date: Date) =>
    new Date(date).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

export const buildReceiptHtml = (order: Order) => {
    const token = order.orderToken || order.id.slice(-6).toUpperCase();
    const rows = order.items.map((item) => {
        const description = item.type === 'print'
            ? [
                `${item.pageCount} pages`,
                `${item.options.copies} copies`,
                item.options.pageRangeText ? `Pages ${item.options.pageRangeText}` : '',
                item.options.colorMode,
                item.options.sides,
                item.options.binding !== 'none' ? `${item.options.binding} binding` : '',
            ].filter(Boolean).join(' | ')
            : `Qty ${item.quantity}`;

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${escapeHtml(description)}</span>
                </td>
                <td>${item.quantity}</td>
                <td>Rs ${Number(item.price).toFixed(2)}</td>
                <td>Rs ${(Number(item.price) * item.quantity).toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Printly receipt ${escapeHtml(token)}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #111; margin: 32px; }
        header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
        h1 { margin: 0 0 6px; font-size: 28px; }
        p { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th, td { text-align: left; padding: 12px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
        th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
        td span { display: block; color: #555; font-size: 12px; margin-top: 4px; }
        .total { margin-top: 24px; text-align: right; font-size: 22px; font-weight: 700; }
        .meta { color: #444; font-size: 13px; }
        @media print { body { margin: 16px; } }
    </style>
</head>
<body>
    <header>
        <div>
            <h1>Printly Receipt</h1>
            <p class="meta">Order ${escapeHtml(token)}</p>
            <p class="meta">Payment ${escapeHtml(order.paymentStatus)}</p>
        </div>
        <div>
            <p><strong>${escapeHtml(order.userName)}</strong></p>
            <p class="meta">${escapeHtml(order.userEmail)}</p>
            <p class="meta">${escapeHtml(formatDateTime(order.createdAt))}</p>
        </div>
    </header>
    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    <p class="total">Total paid: Rs ${order.totalAmount.toFixed(2)}</p>
</body>
</html>`;
};

export const downloadOrderReceipt = (order: Order) => {
    const token = order.orderToken || order.id.slice(-6).toUpperCase();
    const blob = new Blob([buildReceiptHtml(order)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `printly-receipt-${token}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
