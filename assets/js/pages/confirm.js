/**
 * Confirmação: recapitula o pedido enviado e mantém o link do WhatsApp à mão.
 *
 * O checkout já abre o WhatsApp na hora do envio; aqui o botão é a rede de
 * segurança para quem teve a aba bloqueada pelo navegador ou fechou sem enviar.
 */
import { escapeHtml } from '../modules/format.js';
import { orderWhatsappUrl } from '../modules/whatsapp.js';

const ORDER_KEY = 'slurk-last-order';
const recapEl = document.getElementById('order-recap');
const whatsBtn = document.getElementById('whatsapp-order');

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
      ${order.items.map((i) => `<li><span>${i.qty}× ${escapeHtml(i.name)}</span></li>`).join('')}
    </ul>
    <p><strong>Entrega:</strong> ${escapeHtml(order.customer.address)}
    ${order.customer.cep ? `<br><strong>CEP:</strong> ${escapeHtml(order.customer.cep)}` : ''}
    ${order.notes ? `<br><strong>Observações:</strong> ${escapeHtml(order.notes)}` : ''}</p>`;

  whatsBtn.href = orderWhatsappUrl(order);
} else {
  recapEl.innerHTML = '<p>Não encontramos um pedido recente. Que tal montar um agora?</p>';
  whatsBtn.hidden = true;
}
