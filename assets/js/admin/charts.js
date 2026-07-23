/** Gráficos SVG sem dependências, na paleta da marca. */

const COLORS = { venda: '#823B00', custo: '#A15600', lucro: '#5C8A3A', destaque: '#EDE662' };

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/**
 * Gráfico de barras agrupadas.
 * groups: [{ label, values: [{ serie, value }] }]
 * series: [{ id, label }] — cores por ordem: venda, custo, lucro
 */
export function groupedBarChart(groups, series, { height = 260 } = {}) {
  if (!groups.length) return '<p class="admin-empty">Sem dados para exibir ainda.</p>';

  const palette = [COLORS.custo, COLORS.venda, COLORS.lucro];
  const max = Math.max(1, ...groups.flatMap((g) => g.values.map((v) => v.value)));
  const groupW = 100 / groups.length;
  const barW = Math.min(26, (groupW * 0.7) / series.length);
  const chartH = height - 58;

  let bars = '';
  groups.forEach((g, gi) => {
    const cx = gi * groupW + groupW / 2;
    g.values.forEach((v, si) => {
      const h = Math.max(1, (v.value / max) * chartH);
      const x = cx - (series.length * barW) / 2 + si * barW;
      bars += `
        <rect x="${x.toFixed(2)}%" y="${(chartH - h + 12).toFixed(2)}" width="${(barW * 0.86).toFixed(2)}%" height="${h.toFixed(2)}"
              fill="${palette[si % palette.length]}">
          <title>${g.label} — ${series[si].label}: ${fmt.format(v.value)}</title>
        </rect>`;
    });
  });

  /* Rótulos em HTML fora do SVG: o viewBox esticado distorceria o texto. */
  const labels = `<div class="chart-labels" style="grid-template-columns: repeat(${groups.length}, 1fr);">${groups
    .map((g) => `<span>${g.label}</span>`)
    .join('')}</div>`;

  const legend = series
    .map(
      (s, i) =>
        `<span class="chart-legend__item"><span class="chart-legend__dot" style="background:${palette[i % palette.length]}"></span>${s.label}</span>`,
    )
    .join('');

  return `
    <div class="chart-legend">${legend}</div>
    <svg viewBox="0 0 100 ${chartH + 16}" preserveAspectRatio="none" class="chart" role="img" aria-label="Gráfico de barras" style="width:100%; height:${chartH + 16}px;">
      <line x1="0" y1="${chartH + 12}" x2="100" y2="${chartH + 12}" stroke="#E7E0D6" stroke-width="1" vector-effect="non-scaling-stroke"/>
      ${bars}
    </svg>
    ${labels}`;
}

/** Barras horizontais simples: items [{ label, value, color? }] */
export function hBarChart(items) {
  if (!items.length) return '<p class="admin-empty">Sem dados para exibir ainda.</p>';
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return `<div class="hbars">${items
    .map((i) => {
      const w = (Math.abs(i.value) / max) * 100;
      const color = i.color ?? (i.value >= 0 ? COLORS.lucro : '#9B2C13');
      return `
      <div class="hbar">
        <span class="hbar__label">${i.label}</span>
        <span class="hbar__track"><span class="hbar__fill" style="width:${w.toFixed(1)}%; background:${color};"></span></span>
        <span class="hbar__value">${fmt.format(i.value)}</span>
      </div>`;
    })
    .join('')}</div>`;
}
