/**
 * Estado do carrinho, persistido em localStorage.
 * Emite o evento 'cart:changed' no document a cada mutação,
 * para que header e páginas reajam sem acoplamento direto.
 */
import { getProduct } from '../data/products.js';

const STORAGE_KEY = 'slurk-cart-v1';

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    // Descarta itens cujo produto saiu do catálogo
    return Array.isArray(data) ? data.filter((i) => getProduct(i.id) && i.qty > 0) : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* modo privado/sem storage: o carrinho vive só na sessão */
  }
  document.dispatchEvent(new CustomEvent('cart:changed', { detail: { items } }));
}

/** Itens do carrinho: [{ id, qty }]. */
export function getItems() {
  return read();
}

/** Itens enriquecidos com os dados do produto e subtotal. */
export function getDetailedItems() {
  return read().map((item) => {
    const product = getProduct(item.id);
    return { ...item, product, subtotal: product.price * item.qty };
  });
}

export function getCount() {
  return read().reduce((sum, i) => sum + i.qty, 0);
}

export function getTotal() {
  return getDetailedItems().reduce((sum, i) => sum + i.subtotal, 0);
}

export function addItem(id, qty = 1) {
  if (!getProduct(id)) return;
  const items = read();
  const existing = items.find((i) => i.id === id);
  if (existing) existing.qty = Math.min(existing.qty + qty, 99);
  else items.push({ id, qty: Math.min(qty, 99) });
  write(items);
}

export function setQty(id, qty) {
  let items = read();
  if (qty <= 0) items = items.filter((i) => i.id !== id);
  else items = items.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, 99) } : i));
  write(items);
}

export function removeItem(id) {
  write(read().filter((i) => i.id !== id));
}

export function clearCart() {
  write([]);
}
