/** Página do carrinho: lista de itens, quantidades, observações e resumo. */
import { getDetailedItems, setQty, removeItem, getTotal } from '../modules/cart.js';
import { formatPrice, escapeHtml } from '../modules/format.js';

const itemsEl = document.getElementById('cart-items');
const layoutEl = document.getElementById('cart-layout');
const emptyEl = document.getElementById('cart-empty');
const subtotalEl = document.getElementById('cart-subtotal');
const totalEl = document.getElementById('cart-total');
const notesEl = document.getElementById('cart-notes');

const NOTES_KEY = 'slurk-cart-notes';

function itemHtml({ product, qty, subtotal }) {
  return `
    <article class="cart-item" data-id="${product.id}">
      <div class="cart-item__media">
        <img src="${product.image}" alt="" width="84" height="84" loading="lazy" decoding="async">
      </div>
      <div>
        <h2 class="cart-item__name">${escapeHtml(product.name)}</h2>
        <p class="cart-item__unit">${escapeHtml(product.volume)} · ${formatPrice(product.price)} cada</p>
        <div class="cart-item__row">
          <div class="qty-stepper">
            <button type="button" data-action="dec" aria-label="Diminuir quantidade de ${escapeHtml(product.name)}">−</button>
            <output aria-live="polite">${qty}</output>
            <button type="button" data-action="inc" aria-label="Aumentar quantidade de ${escapeHtml(product.name)}">+</button>
          </div>
          <span class="cart-item__subtotal">${formatPrice(subtotal)}</span>
          <button type="button" class="link-remove" data-action="remove">Remover</button>
        </div>
      </div>
    </article>`;
}

function render() {
  const items = getDetailedItems();
  const isEmpty = items.length === 0;
  layoutEl.hidden = isEmpty;
  emptyEl.hidden = !isEmpty;
  if (isEmpty) return;

  itemsEl.innerHTML = items.map(itemHtml).join('');
  const total = getTotal();
  subtotalEl.textContent = formatPrice(total);
  totalEl.textContent = formatPrice(total);
}

itemsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.closest('.cart-item').dataset.id;
  const current = getDetailedItems().find((i) => i.id === id)?.qty ?? 0;

  if (btn.dataset.action === 'inc') setQty(id, current + 1);
  else if (btn.dataset.action === 'dec') setQty(id, current - 1);
  else if (btn.dataset.action === 'remove') removeItem(id);
});

/* Observações persistem para o checkout */
notesEl.value = sessionStorage.getItem(NOTES_KEY) ?? '';
notesEl.addEventListener('input', () => {
  sessionStorage.setItem(NOTES_KEY, notesEl.value);
});

document.addEventListener('cart:changed', render);
render();
