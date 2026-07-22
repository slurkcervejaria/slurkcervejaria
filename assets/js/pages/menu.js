/** Cardápio: busca, filtro por categoria, ordenação e renderização da grade. */
import { PRODUCTS, CATEGORIES } from '../data/products.js';
import { productCardHtml, initReveal } from '../modules/ui.js';

const grid = document.getElementById('menu-grid');
const searchInput = document.getElementById('menu-search');
const chipGroup = document.getElementById('menu-categories');
const sortSelect = document.getElementById('menu-sort');
const emptyState = document.getElementById('menu-empty');
const resultsCount = document.getElementById('results-count');

const state = { query: '', category: 'all', sort: 'featured' };

const SORTERS = {
  featured: (a, b) => Number(b.featured) - Number(a.featured),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  abv: (a, b) => (b.abv ?? -1) - (a.abv ?? -1),
};

function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function apply() {
  const query = normalize(state.query.trim());
  const list = PRODUCTS.filter((p) => {
    const inCategory = state.category === 'all' || p.category === state.category;
    const inQuery =
      !query ||
      normalize(`${p.name} ${p.style} ${p.description}`).includes(query);
    return inCategory && inQuery;
  }).sort(SORTERS[state.sort] ?? SORTERS.featured);

  grid.innerHTML = list.map(productCardHtml).join('');
  emptyState.hidden = list.length > 0;
  resultsCount.textContent =
    list.length === 0
      ? 'Nenhum produto encontrado'
      : `${list.length} ${list.length === 1 ? 'produto' : 'produtos'}`;
  initReveal(grid);
}

/* Chips de categoria (gerados a partir dos dados) */
function renderChips() {
  const all = [{ id: 'all', label: 'Todos' }, ...CATEGORIES];
  chipGroup.innerHTML = all
    .map(
      (c) =>
        `<button type="button" class="chip" data-category="${c.id}" aria-pressed="${c.id === state.category}">${c.label}</button>`,
    )
    .join('');
}

chipGroup.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-category]');
  if (!chip) return;
  state.category = chip.dataset.category;
  chipGroup
    .querySelectorAll('.chip')
    .forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  apply();
});

let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.query = searchInput.value;
    apply();
  }, 180);
});

sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value;
  apply();
});

/* Deep-link: /cardapio.html?categoria=latas */
const params = new URLSearchParams(location.search);
const initialCategory = params.get('categoria');
if (initialCategory && CATEGORIES.some((c) => c.id === initialCategory)) {
  state.category = initialCategory;
}

renderChips();
apply();
