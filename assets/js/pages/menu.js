/** Cardápio: busca, filtro por categoria, ordenação e renderização da grade. */
import { DRINKS, CATEGORIES } from '../data/products.js';
import { productCardHtml, initReveal } from '../modules/ui.js';

const grid = document.getElementById('menu-grid');
const searchInput = document.getElementById('menu-search');
const chipGroup = document.getElementById('menu-categories');
const sortSelect = document.getElementById('menu-sort');
const emptyState = document.getElementById('menu-empty');
const resultsCount = document.getElementById('results-count');

const state = { query: '', category: 'all', sort: 'featured' };

/* Sem ordenação por preço: o site não exibe valores, eles saem no orçamento. */
const SORTERS = {
  featured: (a, b) => Number(b.featured) - Number(a.featured),
  name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
};

function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function apply() {
  const query = normalize(state.query.trim());
  const list = DRINKS.filter((d) => {
    const inCategory = state.category === 'all' || d.category === state.category;
    const inQuery =
      !query ||
      normalize(`${d.name} ${d.tagline} ${d.description}`).includes(query);
    return inCategory && inQuery;
  }).sort(SORTERS[state.sort] || SORTERS.featured);

  grid.innerHTML = list.map(productCardHtml).join('');
  emptyState.hidden = list.length > 0;
  resultsCount.textContent =
    list.length === 0
      ? 'Nenhuma bebida encontrada'
      : `${list.length} ${list.length === 1 ? 'bebida' : 'bebidas'}`;
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
