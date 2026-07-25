App._aiTab = 'prioridades';

App.renderAIHub = function() {
  this._aiTab = 'prioridades';
  this._renderAI();
};

App._renderAI = function() {
  var insights = AIHub.collect();
  var metrics = AIHub.getMetrics();
  var score = AIHub.getScore();
  var scoreCls = score >= 80 ? 'rp-card-green' : score >= 50 ? 'rp-card-yellow' : 'rp-card-red';

  document.getElementById('moduleContent').innerHTML =
    '<div class="rp-controls"><div class="rp-filters">' +
      '<button class="btn btn-sm ' + (this._aiTab === 'prioridades' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'prioridades\')">Prioridades</button>' +
      '<button class="btn btn-sm ' + (this._aiTab === 'oportunidades' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'oportunidades\')">Oportunidades</button>' +
      '<button class="btn btn-sm ' + (this._aiTab === 'alertas' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'alertas\')">Alertas</button>' +
      '<button class="btn btn-sm ' + (this._aiTab === 'todos' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'todos\')">Todos</button>' +
      '<button class="btn btn-sm ' + (this._aiTab === 'historico' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'historico\')">Hist\u00f3rico</button>' +
    '</div></div>' +
    '<div class="rp-grid" style="margin-bottom:18px;">' +
      '<div class="rp-card ' + scoreCls + '"><span class="rp-num">' + score + '</span><span class="rp-lbl">Score operacional</span></div>' +
      '<div class="rp-card"><span class="rp-num">' + metrics.total + '</span><span class="rp-lbl">Insights</span></div>' +
      '<div class="rp-card rp-card-red"><span class="rp-num">' + metrics.prioridades + '</span><span class="rp-lbl">Prioridades</span></div>' +
      '<div class="rp-card"><span class="rp-num">' + metrics.oportunidades + '</span><span class="rp-lbl">Oportunidades</span></div>' +
      '<div class="rp-card rp-card-yellow"><span class="rp-num">' + metrics.alertas + '</span><span class="rp-lbl">Alertas</span></div>' +
    '</div><div id="aiContent"></div>';
  this._renderAITab(insights);
};

App._setAITab = function(tab) { this._aiTab = tab; this._renderAI(); };

App._renderAITab = function(insights) {
  var el = document.getElementById('aiContent');
  if (!el) return;

  var filtrados = [];
  if (this._aiTab === 'prioridades') filtrados = AIHub.getPrioridades();
  else if (this._aiTab === 'oportunidades') filtrados = AIHub.getOpportunities();
  else if (this._aiTab === 'alertas') filtrados = AIHub.getWarnings();
  else if (this._aiTab === 'historico') { this._renderAIHistorico(el); return; }
  else filtrados = insights;

  if (filtrados.length === 0) {
    el.innerHTML = C.emptyStateFull({ icon: 'bell', title: 'Nenhum insight encontrado', desc: 'Tudo em ordem por aqui.' });
    return;
  }

  var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
  filtrados.forEach(function(i) {
    var tipoIcon = { alerta: '\u26A0', oportunidade: '\u2728', info: '\u2139\uFE0F' };
    var tipoCls = { alerta: 'rp-card-red', oportunidade: 'rp-card-yellow', info: 'rp-card-green' };
    var icon = tipoIcon[i.tipo] || '\u2728';
    var cls = tipoCls[i.tipo] || '';
    var acao = '';
    if (i.actionLabel && i.actionTarget) {
      var onclick = i.actionTarget === 'navigate' ? "App.navigate('" + i.actionParams + "')" : i.actionTarget === 'cliente' ? "App.openClientPanel('" + i.actionParams + "')" : "App.navigate('aihub')";
      acao = '<button class="btn btn-sm" onclick="' + onclick + '">' + App._esc(i.actionLabel) + '</button>';
    }
    html += '<div class="rp-card ' + cls + '" style="text-align:left;display:flex;align-items:center;gap:12px;">' +
      '<span style="font-size:1.2rem;">' + icon + '</span>' +
      '<div style="flex:1;"><strong>' + App._esc(i.titulo) + '</strong><br><span style="font-size:0.75rem;color:var(--text-muted);">' + App._esc(i.descricao) + '</span></div>' +
      '<div>' + acao + '</div>' +
    '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
};

App._renderAIHistorico = function(el) {
  var hist = AIHub.getHistory();
  if (hist.length === 0) {
    el.innerHTML = C.emptyStateFull({ icon: 'clock', title: 'Nenhum hist\u00f3rico', desc: 'O hist\u00f3rico de insights aparecer\u00e1 aqui.' });
    return;
  }
  var html = '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Prioridade</th><th>Insight</th><th>Status</th></tr></thead><tbody>' +
    hist.slice(0, 100).map(function(h) {
      var pCls = h.prioridade <= 1 ? 'rp-card-red' : h.prioridade <= 2 ? 'rp-card-yellow' : '';
      return '<tr class="' + pCls + '"><td class="text-muted text-sm">' + (h.createdAt ? h.createdAt.slice(0, 19).replace('T', ' ') : '—') + '</td><td>' + h.prioridade + '</td><td>' + App._esc(h.titulo) + '</td><td>' + App._esc(h.status) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  el.innerHTML = html;
};
