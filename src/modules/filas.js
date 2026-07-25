App._filaSearch = '';
App._filaTipo = '';

App.renderFilas = function() {
  this._filaSearch = '';
  this._filaTipo = '';
  this._renderFila();
};

App._renderFila = function() {
  var itens = Fila.collect();
  var resumo = Fila.getResumo();
  var tempoMedio = Fila.getTempoMedioPorPrioridade();

  if (this._filaTipo) itens = itens.filter(function(i) { return i.tipo === App._filaTipo; });
  if (this._filaSearch) {
    var q = this._filaSearch.toLowerCase().trim();
    itens = itens.filter(function(i) { return i.clientName && i.clientName.toLowerCase().indexOf(q) >= 0; });
  }

  var criticoCount = itens.filter(function(i) { return i.prioridade >= 80; }).length;

  var html = '<div class="rp-controls"><div class="rp-filters">' +
    '<input type="text" id="filaSearch" placeholder="Buscar cliente..." style="width:180px;padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);" oninput="App._onFilaSearch()">' +
    '<select id="filaTipo" onchange="App._onFilaTipo()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">' +
      '<option value="">Todos os tipos</option>' +
      '<option value="conversa">Conversas</option>' +
      '<option value="orcamento">Or\u00e7amentos</option>' +
      '<option value="posatendimento">P\u00f3s-atendimento</option>' +
      '<option value="crm">CRM</option>' +
      '<option value="atendimento">Atendimento</option>' +
    '</select>' +
  '</div></div>' +
  '<div class="rp-grid" style="margin-bottom:18px;">' +
    '<div class="rp-card rp-card-red"><span class="rp-num">' + itens.length + '</span><span class="rp-lbl">Na fila</span></div>' +
    '<div class="rp-card rp-card-red"><span class="rp-num">' + criticoCount + '</span><span class="rp-lbl">Cr\u00edticos</span></div>' +
    '<div class="rp-card"><span class="rp-num">' + (resumo.maiorEsperaMin ? Math.floor(resumo.maiorEsperaMin / 60) + 'h' + (resumo.maiorEsperaMin % 60) + 'min' : '—') + '</span><span class="rp-lbl">Maior espera</span></div>' +
  '</div>';

  // Tempo médio por faixa
  html += '<div class="rp-grid" style="margin-bottom:18px;grid-template-columns:repeat(4,1fr);">';
  Object.keys(tempoMedio).forEach(function(k) {
    var val = tempoMedio[k];
    var label = val > 0 ? (Math.floor(val / 60) + 'h' + (val % 60) + 'min') : '—';
    html += '<div class="rp-card" style="padding:8px 12px;"><span class="rp-num" style="font-size:0.85rem;">' + label + '</span><span class="rp-lbl">Espera ' + k + '</span></div>';
  });
  html += '</div>';

  if (itens.length === 0) {
    html += C.emptyStateFull({ icon: 'bell', title: 'Fila vazia', desc: 'Nenhum item na fila de atendimento.' });
    document.getElementById('moduleContent').innerHTML = html;
    return;
  }

  html += '<div style="display:flex;flex-direction:column;gap:6px;">';
  itens.forEach(function(item, idx) {
    var p = item.prioridade;
    var pCls = p >= 80 ? 'rp-card-red' : p >= 60 ? 'rp-card-yellow' : '';
    var tempoStr = item.tempoAguardando !== null && item.tempoAguardando !== undefined
      ? (item.tempoAguardando < 60 ? item.tempoAguardando + 'min' : Math.floor(item.tempoAguardando / 60) + 'h' + (item.tempoAguardando % 60) + 'min')
      : '—';
    var tipoIcon = { conversa: '\uD83D\uDCAC', orcamento: '\uD83D\uDCCB', posatendimento: '\uD83C\uDFE5', crm: '\uD83D\uDC64', atendimento: '\uD83D\uDC68\u200D\u2695\uFE0F' };

    var targetClick = item.targetAcao === 'clientes' ? "App.openClientPanel('" + item.clientId + "')" : "App.navigate('" + item.targetAcao + "')";

    html += '<div class="rp-card ' + pCls + '" style="text-align:left;display:flex;align-items:center;gap:12px;animation:dbFadeUp 0.2s ease both;animation-delay:' + (idx * 0.03) + 's;">' +
      '<div style="min-width:48px;text-align:center;"><span style="font-size:1.2rem;font-weight:700;color:' + (p >= 80 ? 'var(--accent-hover)' : p >= 60 ? 'var(--yellow)' : 'var(--text-muted)') + ';">' + p + '</span></div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div class="flex gap-8" style="align-items:center;">' +
          '<span style="font-size:1rem;">' + (tipoIcon[item.tipo] || '\u2022') + '</span>' +
          '<strong>' + App._esc(item.clientName || '—') + '</strong>' +
          '<span style="font-size:0.65rem;color:var(--text-dim);">' + item.tipo + '</span>' +
          '<span style="font-size:0.65rem;color:var(--text-dim);margin-left:auto;">' + tempoStr + '</span>' +
        '</div>' +
        '<div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;display:flex;flex-wrap:wrap;gap:4px;">' +
          item.motivos.slice(0, 3).map(function(m) { return '<span class="badge badge-scheduled" style="font-size:0.55rem;padding:1px 5px;">' + App._esc(m) + '</span>'; }).join('') +
          (item.motivos.length > 3 ? ' <span style="color:var(--text-dim);font-size:0.6rem;">+(' + (item.motivos.length - 3) + ')</span>' : '') +
        '</div>' +
      '</div>' +
      '<div style="flex-shrink:0;">' +
        '<button class="btn btn-sm" onclick="' + targetClick + '">' + App._esc(item.labelAcao) + '</button>' +
      '</div>' +
    '</div>';
  });
  html += '</div>';
  document.getElementById('moduleContent').innerHTML = html;
};

App._onFilaTipo = function() {
  this._filaTipo = document.getElementById('filaTipo').value;
  this._renderFila();
};

App._onFilaSearch = function() {
  this._filaSearch = document.getElementById('filaSearch').value;
  this._renderFila();
};
