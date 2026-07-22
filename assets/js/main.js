/**
 * Script global: navegação mobile, contador do carrinho e animações de entrada.
 * Carregado em todas as páginas com type="module" (deferido por padrão).
 */
import { getCount } from './modules/cart.js';
import { initReveal, initAddToCartButtons, initSizeToggles } from './modules/ui.js';

/* Navegação mobile */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Fecha ao navegar ou apertar Esc
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
}

/* Badge com a quantidade de itens no carrinho */
function renderCartCount() {
  const badge = document.querySelector('.cart-count');
  if (!badge) return;
  const count = getCount();
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.hidden = count === 0;
  const label = document.querySelector('.cart-link');
  if (label) {
    label.setAttribute(
      'aria-label',
      count === 0 ? 'Carrinho vazio' : `Carrinho com ${count} ${count === 1 ? 'item' : 'itens'}`,
    );
  }
}

initNav();
renderCartCount();
initReveal();
initAddToCartButtons();
initSizeToggles();
document.addEventListener('cart:changed', renderCartCount);
