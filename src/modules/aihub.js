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
    L.controls(
      '<button class="btn btn-sm ' + (this._aiTab === 'prioridades' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'prioridades\')">Prioridades</button>' +
      '<button class="btn btn-sm ' + (this._aiTab === 'oportunidades' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'oportunidades\')">Oportunidades</button>' +
      '<button class="btn btn-sm ' + (this._aiTab === 'alertas' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'alertas\')">Alertas</button>' +
      '<button class="btn btn-sm ' + (this._aiTab === 'todos' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'todos\')">Todos</button>' +
      '<button class="btn btn-sm ' + (this._aiTab === 'historico' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'historico\')">Hist\u00f3rico</button>' +
      '<button class="btn btn-sm ' + (this._aiTab === 'timeline' ? 'btn-primary' : '') + '" onclick="App._setAITab(\'timeline\')">Timeline</button>'
    ) +
    L.metrics([
      { value: score, label: 'Score operacional', cls: scoreCls },
      { value: metrics.total, label: 'Insights' },
      { value: metrics.prioridades, label: 'Prioridades', cls: 'rp-card-red' },
      { value: metrics.oportunidades, label: 'Oportunidades' },
      { value: metrics.alertas, label: 'Alertas', cls: 'rp-card-yellow' }
    ]) +
    '<div id="aiContent"></div>';
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
  else if (this._aiTab === 'timeline') { this._renderAITimeline(el); return; }
  else filtrados = insights;

  if (filtrados.length === 0) {
    el.innerHTML = L.empty('Nenhum insight encontrado', 'Tudo em ordem por aqui.', 'bell');
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
      acao = L.btn(i.actionLabel, onclick);
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
    el.innerHTML = L.empty('Nenhum hist\u00f3rico', 'O hist\u00f3rico de insights aparecer\u00e1 aqui.', 'clock');
    return;
  }
  var html = '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Prioridade</th><th>Insight</th><th>Status</th></tr></thead><tbody>' +
    hist.slice(0, 100).map(function(h) {
      var pCls = h.prioridade <= 1 ? 'rp-card-red' : h.prioridade <= 2 ? 'rp-card-yellow' : '';
      return '<tr class="' + pCls + '"><td class="text-muted text-sm">' + (h.createdAt ? h.createdAt.slice(0, 19).replace('T', ' ') : '—') + '</td><td>' + h.prioridade + '</td><td>' + App._esc(h.titulo) + '</td><td>' + App._esc(h.status) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  el.innerHTML = html;
};

App._renderAITimeline = function(el) {
  var modulos = ['', 'agenda', 'whatsapp', 'crm', 'financeiro', 'marketing', 'notificacao', 'meudia', 'copiloto', 'ia', 'sistema'];
  var selModulo = '<select id="tlModulo" onchange="App._renderAITimeline(document.getElementById(\'aiContent\'))" style="padding:4px 8px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);margin-right:6px;">' +
    modulos.map(function(m) { return '<option value="' + m + '">' + (m || 'Todos os m\u00f3dulos') + '</option>'; }).join('') + '</select>';

  var filtros = {};
  var sel = document.getElementById('tlModulo');
  if (sel && sel.value) filtros.modulo = sel.value;

  var events = EventTimeline.list(filtros);
  if (events.length === 0) {
    el.innerHTML = selModulo + L.empty('Nenhum evento registrado', 'Os eventos do sistema aparecer\u00e3o aqui.', 'clock');
    return;
  }

  var html = selModulo + '<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">' +
    '<button class="btn btn-sm" onclick="EventTimeline.clear();App._renderAITimeline(document.getElementById(\'aiContent\'))">Limpar</button>' +
    '<button class="btn btn-sm" onclick="var d=document.createElement(\'a\');d.href=\'data:application/json;charset=utf-8,\'+encodeURIComponent(EventTimeline.export());d.download=\'event-timeline.json\';d.click();">Exportar</button>' +
  '</div>';

  html += '<div class="table-wrap"><table><thead><tr><th>Hora</th><th>Evento</th><th>M\u00f3dulo</th><th>Detalhes</th></tr></thead><tbody>' +
    events.slice(0, 200).map(function(e) {
      var payloadStr = '';
      if (e.payload) {
        var parts = [];
        if (e.payload.cliente) parts.push(e.payload.cliente);
        if (e.payload.servico) parts.push(e.payload.servico);
        if (e.payload.valor) parts.push('R$ ' + e.payload.valor);
        if (e.payload.status) parts.push(e.payload.status);
        if (e.payload.refId) parts.push('#' + e.payload.refId.slice(-6));
        payloadStr = parts.join(' \u2022 ');
      }
      return '<tr><td class="text-muted text-sm">' + (e.timestamp ? e.timestamp.slice(11, 19) : '—') + '</td>' +
        '<td><span class="badge badge-scheduled" style="font-size:0.55rem;">' + App._esc(e.evento) + '</span></td>' +
        '<td class="text-sm">' + App._esc(e.modulo || '—') + '</td>' +
        '<td class="text-sm">' + App._esc(payloadStr) + '</td></tr>';
    }).join('') + '</tbody></table></div>';

  el.innerHTML = html;
};
