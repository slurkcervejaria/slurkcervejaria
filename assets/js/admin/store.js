/**
 * Persistência do admin em localStorage, organizada em coleções.
 * O contrato (list/get/create/update/remove) espelha uma API REST:
 * para migrar a um backend, basta trocar as implementações por fetch.
 */

const PREFIX = 'slurk-admin-';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  document.dispatchEvent(new CustomEvent('admin:changed', { detail: { key } }));
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Cria uma coleção CRUD persistida. */
function collection(key) {
  return {
    list() { return read(key, []); },
    get(id) { return this.list().find((x) => x.id === id) ?? null; },
    create(data) {
      const item = { id: uid(), createdAt: new Date().toISOString(), ...data };
      write(key, [item, ...this.list()]);
      return item;
    },
    update(id, patch) {
      const items = this.list().map((x) => (x.id === id ? { ...x, ...patch } : x));
      write(key, items);
      return items.find((x) => x.id === id) ?? null;
    },
    remove(id) { write(key, this.list().filter((x) => x.id !== id)); },
    replaceAll(items) { write(key, items); },
  };
}

export const clients = collection('clients');
export const suppliers = collection('suppliers');
export const contracts = collection('contracts');
export const purchases = collection('purchases');
export const checklists = collection('checklists');

/* Pedidos: coleção compartilhada com o site (checkout grava aqui). */
const ORDERS_KEY = 'slurk-orders';
export const orders = {
  list() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY)) ?? [];
    } catch {
      return [];
    }
  },
  get(id) { return this.list().find((o) => o.id === id) ?? null; },
  update(id, patch) {
    const items = this.list().map((o) => (o.id === id ? { ...o, ...patch } : o));
    localStorage.setItem(ORDERS_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('admin:changed', { detail: { key: 'orders' } }));
    return items.find((o) => o.id === id) ?? null;
  },
  create(data) {
    const item = { id: uid(), createdAt: new Date().toISOString(), status: 'novo', ...data };
    localStorage.setItem(ORDERS_KEY, JSON.stringify([item, ...this.list()]));
    document.dispatchEvent(new CustomEvent('admin:changed', { detail: { key: 'orders' } }));
    return item;
  },
  remove(id) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(this.list().filter((o) => o.id !== id)));
    document.dispatchEvent(new CustomEvent('admin:changed', { detail: { key: 'orders' } }));
  },
};

/* Configurações e sequências numéricas (nota, contrato). */
export const settings = {
  get() { return read('settings', {}); },
  set(patch) { write('settings', { ...this.get(), ...patch }); },
  nextSeq(name) {
    const s = this.get();
    const next = (s[name] ?? 0) + 1;
    this.set({ [name]: next });
    return next;
  },
};
