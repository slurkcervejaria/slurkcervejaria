/** Home: renderiza as bebidas em destaque. */
import { DRINKS } from '../data/products.js';
import { productCardHtml, initReveal } from '../modules/ui.js';

const grid = document.getElementById('featured-grid');
if (grid) {
  const featured = DRINKS.filter((d) => d.featured).slice(0, 4);
  grid.innerHTML = featured.map(productCardHtml).join('');
  initReveal(grid);
}
