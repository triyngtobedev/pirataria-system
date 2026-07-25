/* ─── Layout Components ───
   Componentes base de layout reutilizáveis por todos os módulos.
   Consomem exclusivamente os tokens do Design System.
   Uso: L.pageHeader(), L.section(), L.filters(), etc.
*/

const L = {};

// ─── Page Header ───
// Título + ações opcionais
L.pageHeader = function(title, actionsHtml) {
  return '<div class="flex-between mb-12" style="align-items:center;">' +
    '<div class="section-title" style="font-size:var(--section-title-font-size);text-transform:uppercase;letter-spacing:var(--section-title-letter-spacing);color:var(--color-text-muted);">' + App._esc(title) + '</div>' +
    (actionsHtml || '') +
  '</div>';
};

// ─── Section ───
// Seção com título, contador e ações
L.section = function(title, contentHtml, count, extraHtml) {
  var headerRight = '';
  if (count !== undefined) headerRight += '<span class="hj-contador">' + count + '</span>';
  if (extraHtml) headerRight += extraHtml;
  var header = headerRight ? '<div class="flex-between mb-12"><div class="section-title">' + App._esc(title) + '</div>' + headerRight + '</div>' : L.pageHeader(title);
  return '<div class="hj-bloco">' + header + contentHtml + '</div>';
};

// ─── Card List ───
// Lista vertical de cards
L.cardList = function(items, renderItem) {
  if (!items || items.length === 0) return '';
  var html = '<div class="hj-card-list">';
  for (var i = 0; i < items.length; i++) {
    html += renderItem(items[i]);
  }
  html += '</div>';
  return html;
};

// ─── Empty State ───
// Estado vazio padronizado
L.empty = function(title, desc, icon) {
  return C.emptyStateFull({ icon: icon || 'box', title: title || 'Nenhum registro encontrado', desc: desc || '' });
};

// ─── Filter Chips ───
// Chips de filtro horizontal
L.filters = function(items, activeKey, onClick) {
  if (!items || items.length === 0) return '';
  var html = '<div class="hj-filtros">';
  for (var i = 0; i < items.length; i++) {
    var f = items[i];
    var active = f.key === activeKey ? ' hj-chip-active' : '';
    html += '<span class="hj-chip' + active + '" onclick="' + onClick + '(\'' + f.key + '\')">' + App._esc(f.label) + '</span>';
  }
  html += '</div>';
  return html;
};

// ─── Metrics Grid ───
// Grid de métricas/cards
L.metrics = function(items) {
  if (!items || items.length === 0) return '';
  var html = '<div class="rp-grid" style="margin-bottom:18px;">';
  for (var i = 0; i < items.length; i++) {
    var m = items[i];
    var cls = m.cls ? ' ' + m.cls : '';
    html += '<div class="rp-card' + cls + '"><span class="rp-num">' + (m.value !== undefined ? m.value : '—') + '</span><span class="rp-lbl">' + App._esc(m.label) + '</span></div>';
  }
  html += '</div>';
  return html;
};

// ─── Search Input ───
// Input de busca padronizado
L.search = function(id, placeholder, onInput) {
  return '<input type="text" id="' + id + '" placeholder="' + App._esc(placeholder || 'Buscar...') + '" style="width:180px;padding:6px 10px;font-size:var(--font-size-md);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text);" oninput="' + onInput + '()">';
};

// ─── Select Filter ───
// Select de filtro padronizado
L.select = function(id, options, onChange) {
  var html = '<select id="' + id + '" onchange="' + onChange + '()" style="padding:6px 10px;font-size:var(--font-size-md);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text);">';
  for (var i = 0; i < options.length; i++) {
    var o = options[i];
    html += '<option value="' + App._esc(o.value) + '">' + App._esc(o.label) + '</option>';
  }
  html += '</select>';
  return html;
};

// ─── Controls Bar ───
// Barra de controles (filtros + ações)
L.controls = function(leftHtml, rightHtml) {
  return '<div class="rp-controls"><div class="rp-filters">' + (leftHtml || '') + '</div>' + (rightHtml ? '<div>' + rightHtml + '</div>' : '') + '</div>';
};

// ─── Action Button ───
// Botão de ação padronizado (primary, sm)
L.btn = function(label, onClick, primary) {
  return '<button class="btn' + (primary ? ' btn-primary' : '') + ' btn-sm" onclick="' + onClick + '">' + App._esc(label) + '</button>';
};

// ─── Badge (wrapper para C.badge com fallback) ───
L.badge = function(text, type) {
  return C.badge ? C.badge(text, type) : '<span class="badge badge-' + (type || 'scheduled') + '">' + App._esc(text) + '</span>';
};

// ─── Card de Métrica (linha única) ───
L.statCard = function(value, label, cls) {
  return '<div class="rp-card' + (cls ? ' ' + cls : '') + '"><span class="rp-num">' + (value !== undefined ? value : '—') + '</span><span class="rp-lbl">' + App._esc(label) + '</span></div>';
};

// ─── See All Link ───
L.seeAll = function(count, navigateTo) {
  if (!count || count <= 0) return '';
  return '<div class="hj-mais" onclick="App.navigate(\'' + navigateTo + '\')">Ver todos (+' + count + ')</div>';
};
