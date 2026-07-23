/** Confirmação: recapitula o último pedido e monta o link de envio via WhatsApp. */
import { formatPrice, escapeHtml } from '../modules/format.js';

/* Número oficial de pedidos da cervejaria (formato internacional, sem símbolos) */
const WHATSAPP_NUMBER = '5531973265982';

const ORDER_KEY = 'slurk-last-order';
const recapEl = document.getElementById('order-recap');
const whatsBtn = document.getElementById('whatsapp-order');

const PAYMENT_LABELS = {
  pix: 'Pix',
  cartao: 'Cartão na entrega',
  dinheiro: 'Dinheiro',
};

let order = null;
try {
  order = JSON.parse(sessionStorage.getItem(ORDER_KEY));
} catch {
  order = null;
}

if (order && order.items && order.items.length) {
  recapEl.innerHTML = `
    <h2>Resumo do pedido</h2>
    <ul>
      ${order.items
        .map(
          (i) =>
            `<li><span>${i.qty}× ${escapeHtml(i.name)}</span><strong>${formatPrice(i.subtotal)}</strong></li>`,
        )
        .join('')}
      <li><span><strong>Total</strong></span><strong>${formatPrice(order.total)}</strong></li>
    </ul>
    <p><strong>Entrega:</strong> ${escapeHtml(order.customer.address)}<br>
    <strong>Pagamento:</strong> ${escapeHtml(PAYMENT_LABELS[order.payment] || order.payment)}
    ${order.notes ? `<br><strong>Observações:</strong> ${escapeHtml(order.notes)}` : ''}</p>`;

  const lines = [
    '🍺 *Novo pedido — slürk BEER*',
    '',
    ...order.items.map((i) => `• ${i.qty}× ${i.name} — ${formatPrice(i.subtotal)}`),
    '',
    `*Total: ${formatPrice(order.total)}*`,
    '',
    `Nome: ${order.customer.name}`,
    `Telefone: ${order.customer.phone}`,
    `Endereço: ${order.customer.address}`,
    `Pagamento: ${PAYMENT_LABELS[order.payment] || order.payment}`,
  ];
  if (order.notes) lines.push(`Observações: ${order.notes}`);

  whatsBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
} else {
  recapEl.innerHTML = '<p>Não encontramos um pedido recente. Que tal montar um agora?</p>';
  whatsBtn.hidden = true;
}
