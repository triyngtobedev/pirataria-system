C.emptyState = function(msg) {
  return '<div class="empty-state">' + App._esc(msg) + '</div>';
};

C.emptyStateFull = function(opts) {
  var icon = opts.icon || 'box';
  var title = opts.title || 'Nenhum registro encontrado';
  var desc = opts.desc || '';
  var btnLabel = opts.btnLabel || '';
  var btnAction = opts.btnAction || '';

  var svgs = {
    box: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="14" width="36" height="28" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 14L16 6h16l10 8" stroke="currentColor" stroke-width="2" fill="none"/><line x1="24" y1="14" x2="24" y2="26" stroke="currentColor" stroke-width="2"/><line x1="16" y1="20" x2="32" y2="20" stroke="currentColor" stroke-width="2"/></svg>',
    person: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="16" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M10 40c0-8 6-14 14-14s14 6 14 14" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    calendar: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="36" height="34" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><line x1="6" y1="18" x2="42" y2="18" stroke="currentColor" stroke-width="2"/><line x1="16" y1="6" x2="16" y2="14" stroke="currentColor" stroke-width="2"/><line x1="32" y1="6" x2="32" y2="14" stroke="currentColor" stroke-width="2"/><line x1="16" y1="26" x2="22" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="32" x2="28" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="2" fill="none"/><line x1="24" y1="14" x2="24" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="24" x2="32" y2="28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    cart: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 10h6l4 20h24l4-16H16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="38" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="36" cy="38" r="3" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    document: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 6h14l10 10v26a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2" fill="none"/><line x1="16" y1="20" x2="32" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="28" x2="28" y2="28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="36" x2="24" y2="36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    bell: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 34h16l4 6H12l4-6z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M16 20c0-5 4-10 8-10s8 5 8 10v8H16v-8z" stroke="currentColor" stroke-width="2" fill="none"/><line x1="24" y1="8" x2="24" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    coin: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="2" fill="none"/><line x1="20" y1="20" x2="28" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="20" x2="24" y2="28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="28" x2="28" y2="28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    search: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="10" stroke="currentColor" stroke-width="2" fill="none"/><line x1="28" y1="28" x2="38" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    chart: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="16" width="8" height="24" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><rect x="20" y="10" width="8" height="30" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><rect x="34" y="20" width="8" height="20" rx="2" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    file: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 6h18l10 10v26a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2" fill="none"/><line x1="14" y1="16" x2="26" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="24" x2="34" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="32" x2="30" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M28 6v10h10" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    heart: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 40S8 28 8 18c0-4 3-8 8-8 3 0 5 1 8 4 3-3 5-4 8-4 5 0 8 4 8 8 0 10-16 22-16 22z" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    tag: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6h16l20 20-16 16L6 22V6z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    mail: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 14l18 12 18-12" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  };

  var svgHtml = svgs[icon] || svgs.box;

  var btnHtml = '';
  if (btnLabel && btnAction) {
    btnHtml = '<button class="btn btn-primary btn-sm" onclick="' + App._esc(btnAction) + '" style="margin-top:12px;">' + App._esc(btnLabel) + '</button>';
  }

  return '<div class="es-wrap">' +
    '<div class="es-icon">' + svgHtml + '</div>' +
    '<div class="es-title">' + App._esc(title) + '</div>' +
    (desc ? '<div class="es-desc">' + App._esc(desc) + '</div>' : '') +
    btnHtml +
  '</div>';
};
