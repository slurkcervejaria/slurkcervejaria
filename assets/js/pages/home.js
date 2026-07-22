/** Home: renderiza os produtos em destaque. */
import { PRODUCTS } from '../data/products.js';
import { productCardHtml, initReveal } from '../modules/ui.js';

const grid = document.getElementById('featured-grid');
if (grid) {
  const featured = PRODUCTS.filter((p) => p.featured).slice(0, 4);
  grid.innerHTML = featured.map(productCardHtml).join('');
  initReveal(grid);
}
