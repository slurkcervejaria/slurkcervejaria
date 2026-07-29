/**
 * Checkout: resumo do pedido, validação do formulário e envio via WhatsApp.
 *
 * O site não exibe preços. O cliente monta o carrinho, informa os dados de
 * entrega e a finalização abre o WhatsApp da cervejaria com a mensagem do
 * pedido já pronta; o orçamento é respondido na conversa.
 */
import { getDetailedItems, getTotal, clearCart } from '../modules/cart.js';
import { escapeHtml, maskPhone } from '../modules/format.js';
import { orderWhatsappUrl } from '../modules/whatsapp.js';

const form = document.getElementById('checkout-form');
const summaryList = document.getElementById('checkout-items');
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
    .map((i) => `<li><span>${i.qty}× ${escapeHtml(i.product.name)}</span></li>`)
    .join('');
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

/**
 * Guarda o pedido para a página de confirmação e para a fila do painel admin
 * (mesmo navegador). Os valores vêm do catálogo e nunca são exibidos ao
 * cliente — servem só para o controle interno da cervejaria.
 */
function storeOrder(order) {
  try {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    /* sem storage: a confirmação mostra o estado vazio */
  }
  try {
    const all = JSON.parse(localStorage.getItem('slurk-orders')) || [];
    all.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      status: 'novo',
      ...order,
    });
    localStorage.setItem('slurk-orders', JSON.stringify(all));
  } catch {
    /* sem storage disponível */
  }
}

form.addEventListener('submit', (e) => {
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
      cep: form.elements['cep'].value.trim(),
      address: form.elements['address'].value.trim(),
    },
    payment: 'a combinar',
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

  /* Abre o WhatsApp ainda dentro do gesto do usuário — de forma assíncrona
     o navegador trataria como popup e bloquearia a janela. */
  window.open(orderWhatsappUrl(order), '_blank', 'noopener');

  storeOrder(order);
  clearCart();
  sessionStorage.removeItem(NOTES_KEY);
  location.href = 'obrigado.html';
});

/* Observações vindas do carrinho */
notesEl.value = sessionStorage.getItem(NOTES_KEY) || '';

renderSummary();
document.addEventListener('cart:changed', renderSummary);
