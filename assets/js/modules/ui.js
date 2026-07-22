/** Componentes de interface compartilhados: toast, reveal on scroll, card de produto. */
import { formatPrice, escapeHtml } from './format.js';
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

/** Gera o markup de um card de produto. */
export function productCardHtml(product) {
  const meta = [
    product.volume,
    product.abv != null ? `${String(product.abv).replace('.', ',')}% ABV` : null,
    product.ibu != null ? `${product.ibu} IBU` : null,
  ].filter(Boolean);

  return `
    <article class="product-card reveal">
      <div class="product-card__media">
        <img src="${product.image}" alt="Ilustração de ${escapeHtml(product.name)}" width="600" height="600" loading="lazy" decoding="async">
      </div>
      <div class="product-card__body">
        <div class="product-card__tags">
          <span class="tag">${escapeHtml(product.style)}</span>
        </div>
        <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
        <p class="product-card__desc">${escapeHtml(product.description)}</p>
        <p class="product-card__meta">${meta.map((m) => `<span>${escapeHtml(m)}</span>`).join('')}</p>
        <div class="product-card__footer">
          <span class="product-card__price">${formatPrice(product.price)}</span>
          <button type="button" class="btn btn--yellow" data-add-to-cart="${product.id}">
            Adicionar
            <span class="visually-hidden">${escapeHtml(product.name)} ao carrinho</span>
          </button>
        </div>
      </div>
    </article>`;
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
