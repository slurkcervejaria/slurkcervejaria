/** Componentes de interface compartilhados: toast, reveal on scroll, card de produto. */
import { escapeHtml } from './format.js';
import { addItem } from './cart.js';

let toastTimer;

/** Exibe uma notificação breve e acessível (aria-live no elemento #toast). */
export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.querySelector('.toast__msg').textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

/** Anima a entrada de elementos .reveal conforme entram no viewport. */
export function initReveal(root = document) {
  const els = root.querySelectorAll('.reveal:not(.is-visible)');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  els.forEach((el) => observer.observe(el));
}

/** Gera o markup de um card de bebida com seletor de volume (barril 30L/50L). */
export function productCardHtml(drink) {
  const first = drink.variants[0];
  return `
    <article class="product-card reveal">
      <div class="product-card__media">
        <img src="${drink.image}" alt="Ilustração de ${escapeHtml(drink.name)}" width="600" height="600" loading="lazy" decoding="async">
      </div>
      <div class="product-card__body">
        <div class="product-card__tags">
          <span class="tag">${escapeHtml(drink.tagline)}</span>
        </div>
        <h3 class="product-card__name">${escapeHtml(drink.name)}</h3>
        <p class="product-card__desc">${escapeHtml(drink.description)}</p>
        <div class="size-toggle" role="group" aria-label="Volume do barril de ${escapeHtml(drink.name)}">
          ${drink.variants
            .map(
              (v, i) =>
                `<button type="button" class="size-btn" aria-pressed="${i === 0}" data-variant="${v.id}">Barril ${escapeHtml(v.volume)}</button>`,
            )
            .join('')}
        </div>
        <div class="product-card__footer">
          <p class="product-card__quote">Valor sob consulta no WhatsApp</p>
          <button type="button" class="btn btn--yellow" data-add-to-cart="${first.id}">
            Adicionar
            <span class="visually-hidden">${escapeHtml(drink.name)} ao carrinho</span>
          </button>
        </div>
      </div>
    </article>`;
}

/** Delegação: troca de volume (30L/50L) dentro dos cards. */
export function initSizeToggles() {
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.size-btn');
    if (!btn) return;
    const card = btn.closest('.product-card');
    card.querySelectorAll('.size-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    card.querySelector('[data-add-to-cart]').dataset.addToCart = btn.dataset.variant;
  });
}

/** Delegação de clique para todos os botões "adicionar ao carrinho" da página. */
export function initAddToCartButtons() {
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-add-to-cart]');
    if (!btn) return;
    addItem(btn.dataset.addToCart);
    showToast('Adicionado ao carrinho!');
  });
}
