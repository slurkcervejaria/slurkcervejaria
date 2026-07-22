/**
 * Painel administrativo slürk — SPA com roteamento por hash.
 * Seções: Pedidos (com nota e checklists), Contratos (assinatura
 * eletrônica), Clientes, Fornecedores, Financeiro e Configurações.
 */
import { DRINKS, PRODUCTS, getProduct } from '../data/products.js';
import { formatPrice, escapeHtml as esc, maskPhone } from '../modules/format.js';
import { showToast } from '../modules/ui.js';
import * as db from './store.js';
import * as auth from './auth.js';
import { groupedBarChart, hBarChart } from './charts.js';

/* Dados da empresa usados em notas e contratos (ajuste em um só lugar). */
const COMPANY = {
  name: 'slürk BEER Ltda.',
  cnpj: '00.000.000/0001-00',
  address: 'Rua das Cervejas, 123 — Vila Madalena, São Paulo/SP',
  phone: '(11) 99999-0000',
  logo: '../assets/img/logo-full.png',
};

const ORDER_STATUSES = ['novo', 'confirmado', 'entregue', 'recolhido', 'cancelado'];

const CHECKLIST_TEMPLATES = {
  entrega: {
    title: 'Checklist de entrega da chopeira',
    items: [
      'Chopeira higienizada e testada',
      'Cilindro de CO₂ cheio e com registro funcionando',
      'Barril(is) lacrado(s) e gelado(s)',
      'Extratora e serpentina conferidas',
      'Regulagem de pressão feita no local',
      'Cliente orientado sobre uso e cuidados',
    ],
  },
  recolha: {
    title: 'Checklist de busca da chopeira',
    items: [
      'Chopeira íntegra, sem avarias',
      'Cilindro de CO₂ devolvido',
      'Barril(is) devolvido(s)',
      'Sobra de bebida registrada',
      'Acessórios completos (extratora, mangueiras)',
      'Local liberado sem pendências',
    ],
  },
};

/* ---------- Utilitários ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const money = (v) => formatPrice(v ?? 0);
const dateBR = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const dateTimeBR = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const todayISO = () => new Date().toISOString().slice(0, 10);

function statusBadge(status) {
  return `<span class="status-badge status-${status}">${esc(status)}</span>`;
}

/* ---------- Modal ---------- */
const modal = $('#admin-modal');
function openModal(title, bodyHtml) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  modal.classList.add('is-open');
}
function closeModal() {
  modal.classList.remove('is-open');
  $('#modal-body').innerHTML = '';
}
modal.addEventListener('click', (e) => {
  if (e.target === modal || e.target.closest('.admin-modal__close')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
});

/* ---------- Impressão ---------- */
function printDoc(html) {
  $('#print-root').innerHTML = html;
  window.print();
}

function docHead(title, number) {
  return `
    <div class="doc-head">
      <img src="${COMPANY.logo}" alt="slürk BEER">
      <div style="text-align:right;">
        <h1>${esc(title)}${number ? ` Nº ${String(number).padStart(4, '0')}` : ''}</h1>
        <p>${esc(COMPANY.name)} · CNPJ ${esc(COMPANY.cnpj)}<br>${esc(COMPANY.address)} · ${esc(COMPANY.phone)}</p>
      </div>
    </div>`;
}

/* ---------- Assinatura eletrônica (canvas) ---------- */
function initSignaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  const scale = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;
  ctx.scale(scale, scale);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2B1A0E';
  let drawing = false;
  let dirty = false;

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    dirty = true;
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  ['pointerup', 'pointercancel'].forEach((ev) => canvas.addEventListener(ev, () => { drawing = false; }));

  return {
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dirty = false;
    },
    isEmpty: () => !dirty,
    toDataURL: () => canvas.toDataURL('image/png'),
  };
}

/* ============================================================
   PEDIDOS
   ============================================================ */
function orderItemsSummary(order) {
  return order.items.map((i) => `${i.qty}× ${i.name}`).join(', ');
}

function renderOrders(view) {
  const list = db.orders.list();
  view.innerHTML = `
    <div class="view-head">
      <div>
        <h1>Pedidos</h1>
        <p>Pedidos feitos no site aparecem aqui automaticamente. Emita a nota, gere o contrato e registre os checklists.</p>
      </div>
      <button class="btn btn--yellow" data-action="new-order">+ Novo pedido</button>
    </div>
    <div class="admin-card">
      ${list.length === 0 ? '<p class="admin-empty">Nenhum pedido ainda. Os pedidos do site aparecem aqui, ou crie um manualmente.</p>' : `
      <div class="table-wrap"><table class="admin-table">
        <thead><tr><th>Data</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          ${list.map((o) => `
            <tr data-id="${o.id}">
              <td>${dateTimeBR(o.createdAt)}</td>
              <td>${esc(o.customer?.name ?? '—')}</td>
              <td class="wrap">${esc(orderItemsSummary(o))}</td>
              <td><strong>${money(o.total)}</strong></td>
              <td>
                <select data-action="status" aria-label="Status do pedido">
                  ${ORDER_STATUSES.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </td>
              <td><div class="row-actions">
                <button class="btn btn--outline" data-action="detail">Detalhes</button>
                <button class="btn btn--outline" data-action="invoice">${o.invoiceNumber ? 'Nota Nº ' + String(o.invoiceNumber).padStart(4, '0') : 'Emitir nota'}</button>
              </div></td>
            </tr>`).join('')}
        </tbody>
      </table></div>`}
    </div>`;

  view.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.tagName === 'SELECT') return;
    const id = btn.closest('tr')?.dataset.id;
    if (btn.dataset.action === 'new-order') openNewOrder();
    if (btn.dataset.action === 'detail') openOrderDetail(id);
    if (btn.dataset.action === 'invoice') emitInvoice(id);
  });
  view.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-action="status"]');
    if (!sel) return;
    db.orders.update(sel.closest('tr').dataset.id, { status: sel.value });
    showToast('Status atualizado');
    route();
  });
}

function openNewOrder() {
  const clients = db.clients.list();
  const variants = PRODUCTS;
  openModal('Novo pedido', `
    <form id="new-order-form" class="admin-form form-grid">
      <div class="form-field">
        <label for="no-client">Cliente</label>
        <select id="no-client">
          <option value="">— digitar manualmente —</option>
          ${clients.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-field"><label for="no-name">Nome *</label><input id="no-name" required></div>
      <div class="form-field"><label for="no-phone">Telefone</label><input id="no-phone"></div>
      <div class="form-field"><label for="no-address">Endereço</label><input id="no-address"></div>
      <div class="form-field">
        <label>Itens *</label>
        <div class="item-builder" id="no-items">
          ${variants.map((p) => `
            <div class="item-builder__row">
              <span>${esc(p.name)} — ${money(p.price)}</span>
              <input type="number" min="0" max="20" value="0" data-variant="${p.id}" aria-label="Quantidade de ${esc(p.name)}">
              <span></span>
            </div>`).join('')}
        </div>
      </div>
      <div class="form-field"><label for="no-notes">Observações</label><textarea id="no-notes" rows="2"></textarea></div>
      <button class="btn btn--yellow btn--block" type="submit">Criar pedido</button>
    </form>`);

  $('#no-client').addEventListener('change', (e) => {
    const c = db.clients.get(e.target.value);
    if (c) {
      $('#no-name').value = c.name;
      $('#no-phone').value = c.phone ?? '';
      $('#no-address').value = c.address ?? '';
    }
  });

  $('#new-order-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const items = [...$('#no-items').querySelectorAll('input[data-variant]')]
      .filter((i) => Number(i.value) > 0)
      .map((i) => {
        const p = getProduct(i.dataset.variant);
        return { id: p.id, name: p.name, qty: Number(i.value), unitPrice: p.price, subtotal: p.price * Number(i.value) };
      });
    if (!items.length || !$('#no-name').value.trim()) {
      showToast('Informe o cliente e ao menos um item');
      return;
    }
    db.orders.create({
      customer: { name: $('#no-name').value.trim(), phone: $('#no-phone').value.trim(), address: $('#no-address').value.trim() },
      clientId: $('#no-client').value || null,
      payment: 'a combinar',
      notes: $('#no-notes').value.trim(),
      items,
      total: items.reduce((s, i) => s + i.subtotal, 0),
    });
    closeModal();
    showToast('Pedido criado');
    route();
  });
}

function openOrderDetail(id) {
  const o = db.orders.get(id);
  if (!o) return;
  const contract = db.contracts.list().find((c) => c.orderId === id);
  const checks = db.checklists.list().filter((c) => c.orderId === id);
  const chk = (type) => checks.find((c) => c.type === type);

  openModal(`Pedido de ${o.customer?.name ?? '—'}`, `
    <p><strong>Data:</strong> ${dateTimeBR(o.createdAt)} · <strong>Status:</strong> ${statusBadge(o.status)}<br>
    <strong>Telefone:</strong> ${esc(o.customer?.phone || '—')} · <strong>Pagamento:</strong> ${esc(o.payment || '—')}<br>
    <strong>Endereço:</strong> ${esc(o.customer?.address || '—')}
    ${o.notes ? `<br><strong>Observações:</strong> ${esc(o.notes)}` : ''}</p>
    <div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Item</th><th>Qtd</th><th>Unit.</th><th>Subtotal</th></tr></thead>
      <tbody>${o.items.map((i) => `<tr><td class="wrap">${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.unitPrice)}</td><td>${money(i.subtotal)}</td></tr>`).join('')}
      <tr><td colspan="3"><strong>Total</strong></td><td><strong>${money(o.total)}</strong></td></tr></tbody>
    </table></div>
    <div class="row-actions" style="margin-top: var(--space-4);">
      <button class="btn btn--outline" data-md="invoice">${o.invoiceNumber ? 'Reimprimir nota' : 'Emitir nota'}</button>
      <button class="btn btn--outline" data-md="contract">${contract ? 'Ver contrato' : 'Gerar contrato'}</button>
      <button class="btn btn--outline" data-md="chk-entrega">${chk('entrega') ? '✓ Checklist entrega' : 'Checklist entrega'}</button>
      <button class="btn btn--outline" data-md="chk-recolha">${chk('recolha') ? '✓ Checklist busca' : 'Checklist busca'}</button>
      <button class="btn btn--outline" data-md="delete" style="color: var(--danger); border-color: var(--danger);">Excluir</button>
    </div>`);

  $('#modal-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-md]');
    if (!b) return;
    const act = b.dataset.md;
    if (act === 'invoice') emitInvoice(id);
    if (act === 'contract') contract ? openContractDetail(contract.id) : openContractForm(o);
    if (act === 'chk-entrega') openChecklistForm(o, 'entrega', chk('entrega'));
    if (act === 'chk-recolha') openChecklistForm(o, 'recolha', chk('recolha'));
    if (act === 'delete' && confirm('Excluir este pedido? Essa ação não pode ser desfeita.')) {
      db.orders.remove(id);
      closeModal();
      showToast('Pedido excluído');
      route();
    }
  });
}

/* Nota do pedido (recibo interno numerado; NF-e oficial requer integração SEFAZ). */
function emitInvoice(id) {
  const o = db.orders.get(id);
  if (!o) return;
  let number = o.invoiceNumber;
  if (!number) {
    number = db.settings.nextSeq('invoiceSeq');
    db.orders.update(id, { invoiceNumber: number });
  }
  printDoc(`
    ${docHead('NOTA DE PEDIDO', number)}
    <p><strong>Cliente:</strong> ${esc(o.customer?.name ?? '—')} · <strong>Telefone:</strong> ${esc(o.customer?.phone || '—')}<br>
    <strong>Endereço:</strong> ${esc(o.customer?.address || '—')}<br>
    <strong>Data do pedido:</strong> ${dateTimeBR(o.createdAt)} · <strong>Pagamento:</strong> ${esc(o.payment || '—')}</p>
    <table>
      <thead><tr><th>Item</th><th>Qtd</th><th>Valor unit.</th><th>Subtotal</th></tr></thead>
      <tbody>
        ${o.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.unitPrice)}</td><td>${money(i.subtotal)}</td></tr>`).join('')}
        <tr><td colspan="3"><strong>TOTAL</strong></td><td><strong>${money(o.total)}</strong></td></tr>
      </tbody>
    </table>
    ${o.notes ? `<p><strong>Observações:</strong> ${esc(o.notes)}</p>` : ''}
    <p style="margin-top:24px; font-size:10pt;">Documento interno de controle de pedido — não substitui documento fiscal.</p>
    <div class="sig-line">
      <div><div class="line">${esc(COMPANY.name)}</div></div>
      <div><div class="line">${esc(o.customer?.name ?? 'Cliente')}</div></div>
    </div>`);
  route();
}

/* ============================================================
   CHECKLISTS (entrega e busca da chopeira)
   ============================================================ */
function openChecklistForm(order, type, existing) {
  const tpl = CHECKLIST_TEMPLATES[type];
  const values = existing?.items ?? {};
  openModal(tpl.title, `
    <p><strong>Pedido:</strong> ${esc(order.customer?.name ?? '—')} — ${esc(orderItemsSummary(order))}</p>
    <form id="chk-form" class="admin-form">
      <ul class="check-list">
        ${tpl.items.map((label, i) => `
          <li><label><input type="checkbox" data-item="${i}" ${values[i] ? 'checked' : ''}> ${esc(label)}</label></li>`).join('')}
      </ul>
      <div class="form-grid form-grid--2col">
        <div class="form-field"><label for="chk-resp">Responsável slürk *</label><input id="chk-resp" value="${esc(existing?.responsavel ?? '')}" required></div>
        <div class="form-field"><label for="chk-cliente">Recebido/entregue por (cliente)</label><input id="chk-cliente" value="${esc(existing?.clienteNome ?? '')}"></div>
        <div class="form-field"><label for="chk-date">Data *</label><input type="date" id="chk-date" value="${existing?.date ?? todayISO()}" required></div>
        <div class="form-field"><label for="chk-obs">Observações / avarias</label><input id="chk-obs" value="${esc(existing?.obs ?? '')}"></div>
      </div>
      <div class="row-actions" style="margin-top: var(--space-4);">
        <button class="btn btn--yellow" type="submit">Salvar checklist</button>
        ${existing ? '<button class="btn btn--outline" type="button" id="chk-print">Imprimir</button>' : ''}
      </div>
    </form>`);

  $('#chk-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const items = {};
    $('#modal-body').querySelectorAll('input[data-item]').forEach((c) => { items[c.dataset.item] = c.checked; });
    const data = {
      orderId: order.id,
      type,
      items,
      responsavel: $('#chk-resp').value.trim(),
      clienteNome: $('#chk-cliente').value.trim(),
      date: $('#chk-date').value,
      obs: $('#chk-obs').value.trim(),
    };
    if (existing) db.checklists.update(existing.id, data);
    else db.checklists.create(data);
    closeModal();
    showToast('Checklist salvo');
  });

  $('#chk-print')?.addEventListener('click', () => printChecklist(order, type, existing));
}

function printChecklist(order, type, chk) {
  const tpl = CHECKLIST_TEMPLATES[type];
  printDoc(`
    ${docHead(tpl.title.toUpperCase())}
    <p><strong>Cliente:</strong> ${esc(order.customer?.name ?? '—')} · <strong>Data:</strong> ${dateBR(chk.date)}<br>
    <strong>Itens do pedido:</strong> ${esc(orderItemsSummary(order))}</p>
    <table>
      <thead><tr><th>Item verificado</th><th style="width:80px;">OK</th></tr></thead>
      <tbody>${tpl.items.map((label, i) => `<tr><td>${esc(label)}</td><td style="text-align:center;">${chk.items[i] ? '✔' : '—'}</td></tr>`).join('')}</tbody>
    </table>
    ${chk.obs ? `<p><strong>Observações:</strong> ${esc(chk.obs)}</p>` : ''}
    <div class="sig-line">
      <div><div class="line">${esc(chk.responsavel || COMPANY.name)}<br><small>slürk BEER</small></div></div>
      <div><div class="line">${esc(chk.clienteNome || order.customer?.name || 'Cliente')}<br><small>Cliente</small></div></div>
    </div>`);
}

/* ============================================================
   CONTRATOS DE ALUGUEL COM ASSINATURA ELETRÔNICA
   ============================================================ */
function contractText(c) {
  return [
    `LOCADORA: ${COMPANY.name}, CNPJ ${COMPANY.cnpj}, com sede em ${COMPANY.address}.`,
    `LOCATÁRIO(A): ${c.clientName}, ${c.clientDoc ? 'CPF/CNPJ ' + c.clientDoc + ', ' : ''}telefone ${c.clientPhone || '—'}, endereço ${c.clientAddress || '—'}.`,
    `OBJETO: locação de chopeira e fornecimento de ${c.itemsSummary}, para o evento em ${dateBR(c.eventDate)}, com retirada prevista em ${dateBR(c.pickupDate)}.`,
    `VALOR: ${money(c.value)}, pagos conforme combinado entre as partes.${c.deposit ? ` Caução de ${money(c.deposit)}, devolvida na retirada sem avarias.` : ''}`,
    'RESPONSABILIDADE: o locatário responde pela guarda e integridade da chopeira, cilindro e barris durante o período, comprometendo-se a ressarcir danos, extravios ou avarias constatados no checklist de busca.',
    'DEVOLUÇÃO: os equipamentos serão recolhidos pela locadora na data prevista; barris não abertos não geram reembolso, salvo acordo prévio.',
    'CONSUMO RESPONSÁVEL: é vedado o fornecimento de bebidas alcoólicas a menores de 18 anos.',
    'FORO: fica eleito o foro da comarca de São Paulo/SP para dirimir questões deste contrato.',
  ];
}

function renderContracts(view) {
  const list = db.contracts.list();
  view.innerHTML = `
    <div class="view-head">
      <div>
        <h1>Contratos de aluguel</h1>
        <p>Contratos de locação de chopeira com assinatura eletrônica na tela.</p>
      </div>
      <button class="btn btn--yellow" data-action="new">+ Novo contrato</button>
    </div>
    <div class="admin-card">
      ${list.length === 0 ? '<p class="admin-empty">Nenhum contrato ainda. Gere a partir de um pedido ou crie um novo.</p>' : `
      <div class="table-wrap"><table class="admin-table">
        <thead><tr><th>Nº</th><th>Cliente</th><th>Evento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${list.map((c) => `
          <tr data-id="${c.id}">
            <td>${String(c.number).padStart(4, '0')}</td>
            <td>${esc(c.clientName)}</td>
            <td>${dateBR(c.eventDate)}</td>
            <td><strong>${money(c.value)}</strong></td>
            <td>${statusBadge(c.signatures?.client ? 'assinado' : 'rascunho')}</td>
            <td><div class="row-actions"><button class="btn btn--outline" data-action="open">Abrir</button></div></td>
          </tr>`).join('')}</tbody>
      </table></div>`}
    </div>`;

  view.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'new') openContractForm(null);
    if (btn.dataset.action === 'open') openContractDetail(btn.closest('tr').dataset.id);
  });
}

function openContractForm(order) {
  openModal('Novo contrato de aluguel', `
    <form id="contract-form" class="admin-form form-grid form-grid--2col">
      <div class="form-field form-field--full"><label for="ct-name">Nome do cliente *</label><input id="ct-name" value="${esc(order?.customer?.name ?? '')}" required></div>
      <div class="form-field"><label for="ct-doc">CPF/CNPJ</label><input id="ct-doc"></div>
      <div class="form-field"><label for="ct-phone">Telefone</label><input id="ct-phone" value="${esc(order?.customer?.phone ?? '')}"></div>
      <div class="form-field form-field--full"><label for="ct-address">Endereço</label><input id="ct-address" value="${esc(order?.customer?.address ?? '')}"></div>
      <div class="form-field form-field--full"><label for="ct-items">Itens locados *</label><input id="ct-items" value="${esc(order ? orderItemsSummary(order) + ' + chopeira em comodato' : '')}" placeholder="Ex.: 1× Barril 30L Chopp Pilsen + chopeira" required></div>
      <div class="form-field"><label for="ct-event">Data do evento *</label><input type="date" id="ct-event" required></div>
      <div class="form-field"><label for="ct-pickup">Data da retirada *</label><input type="date" id="ct-pickup" required></div>
      <div class="form-field"><label for="ct-value">Valor total (R$) *</label><input type="number" step="0.01" min="0" id="ct-value" value="${order?.total ?? ''}" required></div>
      <div class="form-field"><label for="ct-deposit">Caução (R$)</label><input type="number" step="0.01" min="0" id="ct-deposit"></div>
      <button class="btn btn--yellow btn--block form-field--full" type="submit">Criar contrato</button>
    </form>`);

  $('#contract-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const c = db.contracts.create({
      number: db.settings.nextSeq('contractSeq'),
      orderId: order?.id ?? null,
      clientName: $('#ct-name').value.trim(),
      clientDoc: $('#ct-doc').value.trim(),
      clientPhone: $('#ct-phone').value.trim(),
      clientAddress: $('#ct-address').value.trim(),
      itemsSummary: $('#ct-items').value.trim(),
      eventDate: $('#ct-event').value,
      pickupDate: $('#ct-pickup').value,
      value: Number($('#ct-value').value || 0),
      deposit: Number($('#ct-deposit').value || 0),
      signatures: {},
    });
    closeModal();
    showToast('Contrato criado');
    location.hash = '#contratos';
    openContractDetail(c.id);
  });
}

function openContractDetail(id) {
  const c = db.contracts.get(id);
  if (!c) return;
  const signed = Boolean(c.signatures?.client);
  openModal(`Contrato Nº ${String(c.number).padStart(4, '0')}`, `
    <p>${statusBadge(signed ? 'assinado' : 'rascunho')} ${signed ? `· assinado em ${dateTimeBR(c.signedAt)}` : ''}</p>
    <ol style="padding-left: 1.2rem; font-size: var(--text-sm); display: grid; gap: var(--space-2);">
      ${contractText(c).map((p) => `<li>${esc(p)}</li>`).join('')}
    </ol>
    ${signed ? `
      <div class="signature-block"><strong>Assinatura do cliente:</strong><br><img src="${c.signatures.client}" alt="Assinatura do cliente"></div>
      ${c.signatures.company ? `<div class="signature-block"><strong>Assinatura slürk:</strong><br><img src="${c.signatures.company}" alt="Assinatura da empresa"></div>` : ''}
    ` : `
      <h3 style="font-size: var(--text-base);">Assinatura do cliente *</h3>
      <canvas class="signature-pad" id="sig-client"></canvas>
      <h3 style="font-size: var(--text-base); margin-top: var(--space-4);">Assinatura slürk (opcional)</h3>
      <canvas class="signature-pad" id="sig-company"></canvas>
    `}
    <div class="row-actions" style="margin-top: var(--space-4);">
      ${signed ? '' : `
        <button class="btn btn--yellow" id="sig-save">Concluir assinatura</button>
        <button class="btn btn--outline" id="sig-clear">Limpar</button>`}
      <button class="btn btn--outline" id="ct-print">Imprimir</button>
      <button class="btn btn--outline" id="ct-delete" style="color: var(--danger); border-color: var(--danger);">Excluir</button>
    </div>`);

  if (!signed) {
    const padClient = initSignaturePad($('#sig-client'));
    const padCompany = initSignaturePad($('#sig-company'));
    $('#sig-clear').addEventListener('click', () => { padClient.clear(); padCompany.clear(); });
    $('#sig-save').addEventListener('click', () => {
      if (padClient.isEmpty()) {
        showToast('Colete a assinatura do cliente');
        return;
      }
      db.contracts.update(id, {
        signatures: {
          client: padClient.toDataURL(),
          company: padCompany.isEmpty() ? null : padCompany.toDataURL(),
        },
        signedAt: new Date().toISOString(),
      });
      showToast('Contrato assinado');
      openContractDetail(id);
      route();
    });
  }
  $('#ct-print').addEventListener('click', () => printContract(db.contracts.get(id)));
  $('#ct-delete').addEventListener('click', () => {
    if (confirm('Excluir este contrato?')) {
      db.contracts.remove(id);
      closeModal();
      route();
    }
  });
}

function printContract(c) {
  const signed = Boolean(c.signatures?.client);
  printDoc(`
    ${docHead('CONTRATO DE LOCAÇÃO DE CHOPEIRA', c.number)}
    <ol>${contractText(c).map((p) => `<li style="margin-bottom:8px;">${esc(p)}</li>`).join('')}</ol>
    <p>São Paulo, ${dateBR(c.signedAt ?? new Date().toISOString())}.</p>
    <div class="sig-line">
      <div>${signed && c.signatures.company ? `<img src="${c.signatures.company}" alt="">` : ''}<div class="line">${esc(COMPANY.name)}<br><small>Locadora</small></div></div>
      <div>${signed ? `<img src="${c.signatures.client}" alt="">` : ''}<div class="line">${esc(c.clientName)}<br><small>Locatário(a)${signed ? ` — assinado eletronicamente em ${dateTimeBR(c.signedAt)}` : ''}</small></div></div>
    </div>`);
}

/* ============================================================
   CLIENTES E FORNECEDORES (cadastros)
   ============================================================ */
function renderRegistry(view, { title, subtitle, coll, fields }) {
  const list = coll.list();
  view.innerHTML = `
    <div class="view-head">
      <div><h1>${title}</h1><p>${subtitle}</p></div>
      <button class="btn btn--yellow" data-action="new">+ Cadastrar</button>
    </div>
    <div class="admin-card">
      ${list.length === 0 ? `<p class="admin-empty">Nenhum cadastro ainda.</p>` : `
      <div class="table-wrap"><table class="admin-table">
        <thead><tr>${fields.map((f) => `<th>${f.label}</th>`).join('')}<th>Ações</th></tr></thead>
        <tbody>${list.map((item) => `
          <tr data-id="${item.id}">
            ${fields.map((f) => `<td class="wrap">${esc(item[f.key] || '—')}</td>`).join('')}
            <td><div class="row-actions">
              <button class="btn btn--outline" data-action="edit">Editar</button>
              <button class="btn btn--outline" data-action="del" style="color: var(--danger); border-color: var(--danger);">Excluir</button>
            </div></td>
          </tr>`).join('')}</tbody>
      </table></div>`}
    </div>`;

  const openForm = (item) => {
    openModal(item ? `Editar — ${item[fields[0].key]}` : `Cadastrar ${title.toLowerCase()}`, `
      <form id="reg-form" class="admin-form form-grid">
        ${fields.map((f) => `
          <div class="form-field">
            <label for="reg-${f.key}">${f.label}${f.required ? ' *' : ''}</label>
            <input id="reg-${f.key}" value="${esc(item?.[f.key] ?? '')}" ${f.required ? 'required' : ''}>
          </div>`).join('')}
        <button class="btn btn--yellow btn--block" type="submit">Salvar</button>
      </form>`);
    $('#reg-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {};
      fields.forEach((f) => { data[f.key] = $(`#reg-${f.key}`).value.trim(); });
      if (!data[fields[0].key]) return;
      if (item) coll.update(item.id, data);
      else coll.create(data);
      closeModal();
      showToast('Cadastro salvo');
      route();
    });
  };

  view.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('tr')?.dataset.id;
    if (btn.dataset.action === 'new') openForm(null);
    if (btn.dataset.action === 'edit') openForm(coll.get(id));
    if (btn.dataset.action === 'del' && confirm('Excluir este cadastro?')) {
      coll.remove(id);
      route();
    }
  });
}

const renderClients = (view) =>
  renderRegistry(view, {
    title: 'Clientes',
    subtitle: 'Cadastro de clientes para pedidos e contratos.',
    coll: db.clients,
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'phone', label: 'Telefone' },
      { key: 'doc', label: 'CPF/CNPJ' },
      { key: 'email', label: 'E-mail' },
      { key: 'address', label: 'Endereço' },
    ],
  });

const renderSuppliers = (view) =>
  renderRegistry(view, {
    title: 'Fornecedores',
    subtitle: 'Fornecedores de barris, insumos e equipamentos.',
    coll: db.suppliers,
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'doc', label: 'CNPJ' },
      { key: 'phone', label: 'Telefone' },
      { key: 'contact', label: 'Contato' },
      { key: 'notes', label: 'Observações' },
    ],
  });

/* ============================================================
   FINANCEIRO
   ============================================================ */
function financeData() {
  const purchases = db.purchases.list();
  const orders = db.orders.list().filter((o) => o.status !== 'cancelado');

  /* custo médio por variante (barril) a partir das notas de compra */
  const costByVariant = {};
  purchases.forEach((p) => {
    const acc = (costByVariant[p.variantId] ??= { qty: 0, total: 0 });
    acc.qty += Number(p.qty);
    acc.total += Number(p.qty) * Number(p.unitCost);
  });
  const avgCost = (variantId) => {
    const acc = costByVariant[variantId];
    return acc && acc.qty > 0 ? acc.total / acc.qty : null;
  };

  /* receita e custo estimado dos pedidos */
  let revenue = 0;
  let estCost = 0;
  const monthly = {};
  orders.forEach((o) => {
    revenue += o.total;
    const m = (o.createdAt ?? '').slice(0, 7);
    const acc = (monthly[m] ??= { revenue: 0, cost: 0 });
    acc.revenue += o.total;
    o.items.forEach((i) => {
      const c = avgCost(i.id);
      if (c != null) {
        estCost += c * i.qty;
        acc.cost += c * i.qty;
      }
    });
  });

  const totalPurchases = purchases.reduce((s, p) => s + Number(p.qty) * Number(p.unitCost), 0);
  return { purchases, orders, avgCost, revenue, estCost, monthly, totalPurchases };
}

function renderFinance(view) {
  const { purchases, avgCost, revenue, estCost, monthly, totalPurchases } = financeData();
  const profit = revenue - estCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const suppliers = db.suppliers.list();

  /* comparativo custo médio × preço de venda por barril */
  const compareGroups = PRODUCTS.filter((p) => avgCost(p.id) != null).map((p) => ({
    label: p.name.replace(' — Barril', ''),
    values: [
      { serie: 'custo', value: avgCost(p.id) },
      { serie: 'venda', value: p.price },
    ],
  }));

  const profitBars = PRODUCTS.filter((p) => avgCost(p.id) != null).map((p) => ({
    label: p.name.replace(' — Barril', ''),
    value: p.price - avgCost(p.id),
  }));

  const monthGroups = Object.keys(monthly)
    .sort()
    .slice(-6)
    .map((m) => ({
      label: new Date(m + '-02').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      values: [
        { serie: 'custo', value: monthly[m].cost },
        { serie: 'receita', value: monthly[m].revenue },
        { serie: 'lucro', value: monthly[m].revenue - monthly[m].cost },
      ],
    }));

  view.innerHTML = `
    <div class="view-head">
      <div><h1>Financeiro</h1><p>Notas de compra dos barris e lucro dos aluguéis (pedidos cancelados ficam de fora).</p></div>
      <button class="btn btn--yellow" data-action="new-purchase">+ Nota de compra</button>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><span>Receita (pedidos)</span><strong>${money(revenue)}</strong></div>
      <div class="kpi kpi--cost"><span>Custo dos barris vendidos</span><strong>${money(estCost)}</strong></div>
      <div class="kpi kpi--profit"><span>Lucro dos aluguéis</span><strong>${money(profit)}</strong></div>
      <div class="kpi kpi--profit"><span>Margem</span><strong>${margin.toFixed(1).replace('.', ',')}%</strong></div>
      <div class="kpi kpi--cost"><span>Total em compras</span><strong>${money(totalPurchases)}</strong></div>
    </div>

    <div class="admin-card">
      <h2>Lucro por barril (venda − custo médio)</h2>
      ${hBarChart(profitBars)}
      ${profitBars.length === 0 ? '' : '<p style="font-size: 0.8rem; color: var(--ink-soft); margin: var(--space-3) 0 0;">Custo médio calculado a partir das notas de compra lançadas.</p>'}
    </div>

    <div class="admin-card">
      <h2>Custo médio × preço de venda</h2>
      ${groupedBarChart(compareGroups, [{ id: 'custo', label: 'Custo médio' }, { id: 'venda', label: 'Preço de venda' }])}
    </div>

    <div class="admin-card">
      <h2>Receita × custo × lucro por mês</h2>
      ${groupedBarChart(monthGroups, [{ id: 'custo', label: 'Custo' }, { id: 'receita', label: 'Receita' }, { id: 'lucro', label: 'Lucro' }])}
    </div>

    <div class="admin-card">
      <h2>Notas de compra lançadas</h2>
      ${purchases.length === 0 ? '<p class="admin-empty">Nenhuma nota lançada. Cadastre as compras de barris para ver o lucro real.</p>' : `
      <div class="table-wrap"><table class="admin-table">
        <thead><tr><th>Data</th><th>Nº nota</th><th>Fornecedor</th><th>Barril</th><th>Qtd</th><th>Custo unit.</th><th>Total</th><th></th></tr></thead>
        <tbody>${purchases.map((p) => {
          const prod = getProduct(p.variantId);
          const sup = db.suppliers.get(p.supplierId);
          return `<tr data-id="${p.id}">
            <td>${dateBR(p.date)}</td>
            <td>${esc(p.noteNumber || '—')}</td>
            <td>${esc(sup?.name ?? p.supplierName ?? '—')}</td>
            <td class="wrap">${esc(prod?.name ?? p.variantId)}</td>
            <td>${p.qty}</td>
            <td>${money(p.unitCost)}</td>
            <td><strong>${money(p.qty * p.unitCost)}</strong></td>
            <td><button class="btn btn--outline" data-action="del-purchase" style="color: var(--danger); border-color: var(--danger);">Excluir</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>`;

  view.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'new-purchase') {
      openModal('Lançar nota de compra', `
        <form id="purchase-form" class="admin-form form-grid form-grid--2col">
          <div class="form-field"><label for="pu-date">Data *</label><input type="date" id="pu-date" value="${todayISO()}" required></div>
          <div class="form-field"><label for="pu-note">Nº da nota</label><input id="pu-note"></div>
          <div class="form-field form-field--full">
            <label for="pu-supplier">Fornecedor</label>
            <select id="pu-supplier">
              <option value="">— selecionar —</option>
              ${suppliers.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
            </select>
            <span class="hint">Cadastre fornecedores na aba Fornecedores.</span>
          </div>
          <div class="form-field form-field--full">
            <label for="pu-variant">Barril *</label>
            <select id="pu-variant" required>
              ${PRODUCTS.map((p) => `<option value="${p.id}">${esc(p.name)} (venda ${money(p.price)})</option>`).join('')}
            </select>
          </div>
          <div class="form-field"><label for="pu-qty">Quantidade *</label><input type="number" min="1" id="pu-qty" value="1" required></div>
          <div class="form-field"><label for="pu-cost">Custo unitário (R$) *</label><input type="number" step="0.01" min="0" id="pu-cost" required></div>
          <button class="btn btn--yellow btn--block form-field--full" type="submit">Lançar</button>
        </form>`);
      $('#purchase-form').addEventListener('submit', (ev) => {
        ev.preventDefault();
        db.purchases.create({
          date: $('#pu-date').value,
          noteNumber: $('#pu-note').value.trim(),
          supplierId: $('#pu-supplier').value || null,
          variantId: $('#pu-variant').value,
          qty: Number($('#pu-qty').value),
          unitCost: Number($('#pu-cost').value),
        });
        closeModal();
        showToast('Nota lançada');
        route();
      });
    }
    if (btn.dataset.action === 'del-purchase' && confirm('Excluir esta nota de compra?')) {
      db.purchases.remove(btn.closest('tr').dataset.id);
      route();
    }
  });
}

/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */
function renderConfig(view) {
  view.innerHTML = `
    <div class="view-head"><div><h1>Configurações</h1><p>Segurança e backup dos dados do painel.</p></div></div>

    <div class="admin-card">
      <h2>Trocar senha</h2>
      <form id="pass-form" class="admin-form form-grid form-grid--2col">
        <div class="form-field"><label for="cf-new">Nova senha *</label><input type="password" id="cf-new" minlength="6" required></div>
        <div class="form-field"><label for="cf-confirm">Confirmar *</label><input type="password" id="cf-confirm" required></div>
        <button class="btn btn--yellow form-field--full" type="submit">Salvar nova senha</button>
      </form>
    </div>

    <div class="admin-card">
      <h2>Backup dos dados</h2>
      <p style="color: var(--ink-soft); font-size: var(--text-sm);">Os dados do painel ficam armazenados neste navegador. Exporte um arquivo de backup regularmente e importe para restaurar ou migrar de máquina.</p>
      <div class="row-actions">
        <button class="btn btn--outline" id="cf-export">Exportar backup (.json)</button>
        <label class="btn btn--outline" style="cursor:pointer;">Importar backup<input type="file" id="cf-import" accept=".json" hidden></label>
      </div>
    </div>

    <div class="admin-card">
      <h2>Dados de demonstração</h2>
      <p style="color: var(--ink-soft); font-size: var(--text-sm);">Preencha o painel com dados fictícios para conhecer as telas (não sobrescreve dados existentes).</p>
      <button class="btn btn--outline" id="cf-seed">Carregar dados de exemplo</button>
    </div>`;

  $('#pass-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if ($('#cf-new').value !== $('#cf-confirm').value) {
      showToast('As senhas não conferem');
      return;
    }
    await auth.setPassword($('#cf-new').value);
    showToast('Senha atualizada');
    e.target.reset();
  });

  $('#cf-export').addEventListener('click', () => {
    const dump = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k.startsWith('slurk-')) dump[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `slurk-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#cf-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dump = JSON.parse(await file.text());
      Object.entries(dump).forEach(([k, v]) => {
        if (k.startsWith('slurk-')) localStorage.setItem(k, v);
      });
      showToast('Backup importado');
      route();
    } catch {
      showToast('Arquivo de backup inválido');
    }
  });

  $('#cf-seed').addEventListener('click', () => {
    seedDemo();
    showToast('Dados de exemplo carregados');
    route();
  });
}

function seedDemo() {
  if (db.suppliers.list().length === 0) {
    db.suppliers.create({ name: 'Maltes & Cia', doc: '11.111.111/0001-11', phone: '(11) 4002-8922', contact: 'Carlos', notes: 'Barris de chopp' });
    db.suppliers.create({ name: 'Bebidas do Vale', doc: '22.222.222/0001-22', phone: '(31) 3333-1234', contact: 'Fernanda', notes: 'Mate e água' });
  }
  if (db.clients.list().length === 0) {
    db.clients.create({ name: 'Mariana Costa', phone: '(11) 98888-1111', doc: '123.456.789-00', email: 'mari@email.com', address: 'Rua A, 100 — Pinheiros' });
    db.clients.create({ name: 'Rafael Torres', phone: '(11) 97777-2222', doc: '987.654.321-00', email: 'rafa@email.com', address: 'Rua B, 200 — Vila Madalena' });
  }
  if (db.purchases.list().length === 0) {
    const sup = db.suppliers.list()[0];
    [['chopp-pilsen-30', 2, 180], ['chopp-pilsen-50', 1, 260], ['chopp-ipa-30', 1, 280], ['slurk-mate-30', 1, 190], ['caipirinha-30', 1, 200], ['agua-gaseificada-30', 2, 40]]
      .forEach(([variantId, qty, unitCost], i) => {
        db.purchases.create({ date: todayISO(), noteNumber: `NF-10${i}`, supplierId: sup.id, variantId, qty, unitCost });
      });
  }
  if (db.orders.list().length === 0) {
    db.orders.create({
      customer: { name: 'Mariana Costa', phone: '(11) 98888-1111', address: 'Rua A, 100 — Pinheiros' },
      payment: 'pix',
      notes: 'Festa sábado à noite',
      items: [
        { id: 'chopp-pilsen-30', name: 'Chopp Pilsen — Barril 30L', qty: 1, unitPrice: 450, subtotal: 450 },
        { id: 'agua-gaseificada-30', name: 'Água Gaseificada — Barril 30L', qty: 1, unitPrice: 100, subtotal: 100 },
      ],
      total: 550,
      status: 'entregue',
    });
    db.orders.create({
      customer: { name: 'Rafael Torres', phone: '(11) 97777-2222', address: 'Rua B, 200 — Vila Madalena' },
      payment: 'cartao',
      notes: '',
      items: [{ id: 'chopp-ipa-30', name: 'Chopp IPA — Barril 30L', qty: 1, unitPrice: 600, subtotal: 600 }],
      total: 600,
      status: 'confirmado',
    });
  }
}

/* ============================================================
   LOGIN E ROTEAMENTO
   ============================================================ */
const SECTIONS = {
  '#pedidos': renderOrders,
  '#contratos': renderContracts,
  '#clientes': renderClients,
  '#fornecedores': renderSuppliers,
  '#financeiro': renderFinance,
  '#config': renderConfig,
};

function route() {
  if (!auth.isLogged()) return;
  const hash = SECTIONS[location.hash] ? location.hash : '#pedidos';
  document.querySelectorAll('.admin-nav a').forEach((a) => {
    a.classList.toggle('is-active', a.getAttribute('href') === hash);
  });
  const view = $('#view');
  const fresh = view.cloneNode(false); // remove listeners antigos da seção
  view.replaceWith(fresh);
  SECTIONS[hash](fresh);
}

function showApp() {
  $('#login-screen').hidden = true;
  $('#admin-app').classList.add('is-active');
  route();
}

function initLogin() {
  const firstAccess = !auth.hasPassword();
  $('#login-screen').hidden = false;
  if (firstAccess) {
    $('#login-title').textContent = 'Primeiro acesso';
    $('#login-password-label').textContent = 'Crie a senha do painel';
    $('#login-confirm-field').hidden = false;
    $('#login-submit').textContent = 'Criar senha e entrar';
    $('#login-hint').textContent = 'Guarde bem esta senha: ela protege o acesso ao painel neste navegador.';
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = $('#login-password').value;
    const field = $('#login-password').closest('.form-field');
    field.classList.remove('has-error');

    if (firstAccess) {
      if (pass.length < 6) {
        field.classList.add('has-error');
        field.querySelector('.error-msg').textContent = 'Use ao menos 6 caracteres.';
        return;
      }
      if (pass !== $('#login-confirm').value) {
        const cf = $('#login-confirm').closest('.form-field');
        cf.classList.add('has-error');
        cf.querySelector('.error-msg').textContent = 'As senhas não conferem.';
        return;
      }
      await auth.setPassword(pass);
      await auth.login(pass);
      showApp();
      return;
    }

    if (await auth.login(pass)) {
      showApp();
    } else {
      field.classList.add('has-error');
      field.querySelector('.error-msg').textContent = 'Senha incorreta.';
    }
  });
}

$('#logout-btn').addEventListener('click', () => {
  auth.logout();
  location.reload();
});
window.addEventListener('hashchange', route);

if (auth.isLogged()) showApp();
else initLogin();
