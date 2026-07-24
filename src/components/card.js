C.card = function(content, cls) {
  return '<div class="card' + (cls ? ' ' + cls : '') + '">' + content + '</div>';
};

C.statCard = function(value, label, cls) {
  return '<div class="rp-card' + (cls ? ' ' + cls : '') + '"><span class="rp-num">' + App._esc(value) + '</span><span class="rp-lbl">' + App._esc(label) + '</span></div>';
};

C.statGrid = function(items) {
  return '<div class="rp-grid">' + items.map(i => C.statCard(i.value, i.label, i.cls)).join('') + '</div>';
};
