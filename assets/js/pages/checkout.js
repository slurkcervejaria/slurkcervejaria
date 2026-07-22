/**
 * Checkout: resumo do pedido, validação do formulário e finalização.
 *
 * A finalização hoje monta o pedido, salva em sessionStorage e redireciona
 * para a confirmação (com envio opcional via WhatsApp). O objeto `order`
 * já tem o formato pronto para ser enviado a um backend/gateway de
 * pagamento no futuro — basta trocar a função `submitOrder`.
 */
import { getDetailedItems, getTotal, clearCart } from '../modules/cart.js';
import { formatPrice, escapeHtml, maskPhone } from '../modules/format.js';

const form = document.getElementById('checkout-form');
const summaryList = document.getElementById('checkout-items');
const totalEl = document.getElementById('checkout-total');
const emptyEl = document.getElementById('checkout-empty');
const layoutEl = document.getElementById('checkout-layout');
const notesEl = document.getElementById('field-notes');

const NOTES_KEY = 'slurk-cart-notes';
const ORDER_KEY = 'slurk-last-order';

function renderSummary() {
  const items = getDetailedItems();
  const isEmpty = items.length === 0;
  layoutEl.hidden = isEmpty;
  emptyEl.hidden = !isEmpty;
  if (isEmpty) return;

  summaryList.innerHTML = items
    .map(
      (i) =>
        `<li><span>${i.qty}× ${escapeHtml(i.product.name)}</span><strong>${formatPrice(i.subtotal)}</strong></li>`,
    )
    .join('');
  totalEl.textContent = formatPrice(getTotal());
}

/* Validação acessível: mensagens por campo + foco no primeiro erro */
const validators = {
  'field-name': (v) => (v.trim().length >= 3 ? '' : 'Informe seu nome completo.'),
  'field-phone': (v) =>
    v.replace(/\D/g, '').length >= 10 ? '' : 'Informe um telefone válido com DDD.',
  'field-address': (v) =>
    v.trim().length >= 8 ? '' : 'Informe o endereço completo para entrega.',
};

function validateField(input) {
  const check = validators[input.id];
  if (!check) return true;
  const message = check(input.value);
  const field = input.closest('.form-field');
  field.classList.toggle('has-error', Boolean(message));
  field.querySelector('.error-msg').textContent = message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  return !message;
}

form.addEventListener(
  'blur',
  (e) => {
    if (e.target.matches('input, textarea')) validateField(e.target);
  },
  true,
);

const phoneInput = document.getElementById('field-phone');
phoneInput.addEventListener('input', () => {
  phoneInput.value = maskPhone(phoneInput.value);
});

/** Ponto único de integração futura com backend/gateway de pagamento. */
async function submitOrder(order) {
  // await fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) })
  sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const inputs = [...form.querySelectorAll('input[id], textarea[id]')];
  const firstInvalid = inputs.filter((i) => !validateField(i))[0];
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const items = getDetailedItems();
  if (items.length === 0) return;

  const order = {
    createdAt: new Date().toISOString(),
    customer: {
      name: form.elements['name'].value.trim(),
      phone: form.elements['phone'].value.trim(),
      address: form.elements['address'].value.trim(),
    },
    payment: form.elements['payment'].value,
    notes: form.elements['notes'].value.trim(),
    items: items.map((i) => ({
      id: i.id,
      name: i.product.name,
      qty: i.qty,
      unitPrice: i.product.price,
      subtotal: i.subtotal,
    })),
    total: getTotal(),
  };

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando pedido…';

  await submitOrder(order);
  clearCart();
  sessionStorage.removeItem(NOTES_KEY);
  location.href = 'obrigado.html';
});

/* Observações vindas do carrinho */
notesEl.value = sessionStorage.getItem(NOTES_KEY) ?? '';

renderSummary();
document.addEventListener('cart:changed', renderSummary);
