App._opFiltro = '';
App._opSearch = '';

App.renderOportunidades = function() {
  this._opFiltro = '';
  this._opSearch = '';
  this._renderOp();
};

App._renderOp = function() {
  var ops = Oportunidade.collect();
  var resumo = Oportunidade.getResumo();

  if (this._opFiltro) ops = ops.filter(function(o) { return o.categoria === App._opFiltro; });
  if (this._opSearch) {
    var q = this._opSearch.toLowerCase().trim();
    ops = ops.filter(function(o) { return o.clientName && o.clientName.toLowerCase().indexOf(q) >= 0; });
  }

  var melhoria = Oportunidade.getMelhorOportunidade();

  var html = '<div class="rp-controls"><div class="rp-filters">' +
    '<input type="text" id="opSearch" placeholder="Buscar cliente..." style="width:180px;padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);" oninput="App._onOpSearch()">' +
    '<select id="opFiltro" onchange="App._onOpFiltro()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">' +
      '<option value="">Todas categorias</option>' +
      Oportunidade.CATEGORIAS.map(function(c) { return '<option value="' + c + '"' + (App._opFiltro === c ? ' selected' : '') + '>' + Oportunidade.CATEGORIA_LABELS[c] + '</option>'; }).join('') +
    '</select>' +
  '</div></div>' +
  '<div class="rp-grid" style="margin-bottom:18px;">' +
    '<div class="rp-card rp-card-green"><span class="rp-num">' + resumo.total + '</span><span class="rp-lbl">Oportunidades</span></div>' +
    '<div class="rp-card rp-card-red"><span class="rp-num">' + resumo.criticas + '</span><span class="rp-lbl">Cr\u00edticas</span></div>' +
    '<div class="rp-card"><span class="rp-num">' + (resumo.valorPotencial > 0 ? 'R$ ' + resumo.valorPotencial.toFixed(2).replace('.', ',') : '—') + '</span><span class="rp-lbl">Valor potencial</span></div>' +
  '</div>';

  if (melhoria) {
    var icon = melhoria.score >= 80 ? '\u26A0' : melhoria.score >= 60 ? '\u2728' : '\u2139\uFE0F';
    html += '<div class="rp-card" style="margin-bottom:16px;border-left:3px solid var(--gold);display:flex;align-items:center;gap:12px;">' +
      '<span style="font-size:1.3rem;">' + icon + '</span>' +
      '<div style="flex:1;"><strong>Melhor oportunidade do dia</strong><br><span style="font-size:0.78rem;color:var(--text-muted);">' + App._esc(melhoria.clientName) + ' — ' + melhoria.descricao + '</span></div>' +
      '<span class="badge badge-progress" style="font-size:0.7rem;">Score ' + melhoria.score + '</span>' +
      '<button class="btn btn-primary btn-sm" onclick="App.navigate(\'' + melhoria.btnTarget + '\')">' + App._esc(melhoria.btnLabel) + '</button>' +
    '</div>';
  }

  if (ops.length === 0) {
    html += C.emptyStateFull({ icon: 'bell', title: 'Nenhuma oportunidade encontrada', desc: 'Todas as oportunidades aparecer\u00e3o aqui automaticamente.' });
    document.getElementById('moduleContent').innerHTML = html;
    return;
  }

  html += '<div style="display:flex;flex-direction:column;gap:8px;">';
  ops.forEach(function(o) {
    var scoreCls = o.score >= 80 ? 'rp-card-red' : o.score >= 60 ? 'rp-card-yellow' : '';
    var scorePct = o.score + '%';
    var valorStr = o.valorEstimado > 0 ? 'R$ ' + o.valorEstimado.toFixed(2).replace('.', ',') : '—';
    var targetOnclick = "App.navigate('" + o.btnTarget + "')";
    if (o.btnTarget === 'clientes') targetOnclick = "App.openClientPanel('" + o.clientId + "')";

    html += '<div class="rp-card ' + scoreCls + '" style="text-align:left;display:flex;align-items:center;gap:12px;">' +
      '<div style="min-width:60px;text-align:center;"><span class="badge badge-progress" style="font-size:0.7rem;">' + scorePct + '</span></div>' +
      '<div style="flex:1;min-width:0;">' +
        '<strong>' + App._esc(o.clientName) + '</strong>' +
        '<br><span style="font-size:0.72rem;color:var(--text-muted);">' + App._esc(o.descricao) + '</span>' +
        '<br><span class="badge badge-scheduled" style="font-size:0.6rem;">' + App._esc(o.categoriaLabel) + '</span>' +
        (o.valorEstimado > 0 ? ' <span style="font-size:0.7rem;color:var(--gold);">' + valorStr + '</span>' : '') +
      '</div>' +
      '<div class="flex gap-4" style="flex-shrink:0;">' +
        '<button class="btn btn-sm" onclick="' + targetOnclick + '">' + App._esc(o.btnLabel) + '</button>' +
      '</div>' +
    '</div>';
  });
  html += '</div>';
  document.getElementById('moduleContent').innerHTML = html;
};

App._onOpFiltro = function() {
  this._opFiltro = document.getElementById('opFiltro').value;
  this._renderOp();
};

App._onOpSearch = function() {
  this._opSearch = document.getElementById('opSearch').value;
  this._renderOp();
};
