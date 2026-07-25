App._apFiltroPrioridade = 'todas';
App._apFiltroStatus = 'todas';
App._apFiltroOrigem = '';
App._apBusca = '';

App.refreshAcoesPrioritarias = function() {
  if (this.currentModule === 'acoes_prioritarias') this.renderAcoesPrioritarias();
};

App.renderAcoesPrioritarias = function() {
  App._apFiltroPrioridade = 'todas';
  App._apFiltroStatus = 'todas';
  App._apFiltroOrigem = '';
  App._apBusca = '';
  App._renderApAtual();
};

App._renderApAtual = function() {
  var fila = AcoesPrioritarias.getFila();
  AcoesPrioritarias.persistir(fila);

  var filtrados = AcoesPrioritarias.filtrar(fila, {
    prioridade: App._apFiltroPrioridade,
    status: App._apFiltroStatus,
    origem: App._apFiltroOrigem || null
  });
  filtrados = AcoesPrioritarias.buscar(filtrados, App._apBusca);

  var pendentes = fila.filter(function(a) { return a.status === 'pendente'; });
  var criticos = pendentes.filter(function(a) { return a.prioridade === 'Cr\u00edtico'; });
  var altos = pendentes.filter(function(a) { return a.prioridade === 'Alto'; });

  var origens = {};
  fila.forEach(function(a) { origens[a.origem] = true; });
  var listaOrigens = Object.keys(origens).sort();

  var html = '<div class="ap-wrap">';

  // M\u00e9tricas
  html += '<div class="ap-metrics">' +
    '<div class="ap-card ap-card-red"><span class="ap-card-val">' + criticos.length + '</span><span class="ap-card-lbl">Cr\u00edticas</span></div>' +
    '<div class="ap-card ap-card-orange"><span class="ap-card-val">' + altos.length + '</span><span class="ap-card-lbl">Altas</span></div>' +
    '<div class="ap-card ap-card-blue"><span class="ap-card-val">' + pendentes.length + '</span><span class="ap-card-lbl">Pendentes</span></div>' +
    '<div class="ap-card ap-card-purple"><span class="ap-card-val">' + fila.length + '</span><span class="ap-card-lbl">Total na fila</span></div>' +
  '</div>';

  // Filtros
  html += '<div class="ap-filtros">' +
    '<div class="ap-busca">' +
      '<input type="text" id="apBusca" placeholder="Buscar a\u00e7\u00f5es..." value="' + App._esc(App._apBusca) + '" oninput="App._apBuscar(this.value)" style="width:100%;padding:6px 10px;font-size:0.82rem;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text);">' +
    '</div>' +
    '<div class="ap-controles">' +
      '<select onchange="App._apFiltrarPrioridade(this.value)" style="font-size:0.72rem;padding:3px 6px;">' +
        '<option value="todas"' + (App._apFiltroPrioridade === 'todas' ? ' selected' : '') + '>Todas prioridades</option>' +
        '<option value="Cr\u00edtico"' + (App._apFiltroPrioridade === 'Cr\u00edtico' ? ' selected' : '') + '>Cr\u00edtico</option>' +
        '<option value="Alto"' + (App._apFiltroPrioridade === 'Alto' ? ' selected' : '') + '>Alto</option>' +
        '<option value="M\u00e9dio"' + (App._apFiltroPrioridade === 'M\u00e9dio' ? ' selected' : '') + '>M\u00e9dio</option>' +
        '<option value="Baixo"' + (App._apFiltroPrioridade === 'Baixo' ? ' selected' : '') + '>Baixo</option>' +
      '</select>' +
      '<select onchange="App._apFiltrarStatus(this.value)" style="font-size:0.72rem;padding:3px 6px;">' +
        '<option value="todas"' + (App._apFiltroStatus === 'todas' ? ' selected' : '') + '>Todos status</option>' +
        '<option value="pendente"' + (App._apFiltroStatus === 'pendente' ? ' selected' : '') + '>Pendente</option>' +
        '<option value="concluida"' + (App._apFiltroStatus === 'concluida' ? ' selected' : '') + '>Conclu\u00edda</option>' +
        '<option value="ignorada"' + (App._apFiltroStatus === 'ignorada' ? ' selected' : '') + '>Ignorada</option>' +
      '</select>' +
      '<select onchange="App._apFiltrarOrigem(this.value)" style="font-size:0.72rem;padding:3px 6px;">' +
        '<option value="">Todas origens</option>';
  listaOrigens.forEach(function(o) {
    html += '<option value="' + App._esc(o) + '"' + (App._apFiltroOrigem === o ? ' selected' : '') + '>' + App._esc(o) + '</option>';
  });
  html += '</select></div></div>';

  // Lista de a\u00e7\u00f5es
  if (filtrados.length === 0) {
    html += C.emptyState('Nenhuma a\u00e7\u00e3o priorit\u00e1ria encontrada.');
  } else {
    html += '<div class="ap-lista">';
    filtrados.forEach(function(a) {
      var prioCls = a.prioridade === 'Cr\u00edtico' ? 'ap-prio-critico' : a.prioridade === 'Alto' ? 'ap-prio-alto' : a.prioridade === 'M\u00e9dio' ? 'ap-prio-medio' : 'ap-prio-baixo';
      var statusLabel = a.status === 'pendente' ? 'Pendente' : a.status === 'concluida' ? 'Conclu\u00edda' : a.status === 'ignorada' ? 'Ignorada' : a.status;
      var statusCls = a.status === 'pendente' ? 'badge-scheduled' : a.status === 'concluida' ? 'badge-completed' : 'badge-cancelled';
      var bg = a.status === 'concluida' || a.status === 'ignorada' ? 'opacity:0.45;' : '';

      html += '<div class="ap-item" style="' + bg + '">' +
        '<div class="ap-item-top">' +
          '<span class="ap-prio ' + prioCls + '">' + a.prioridade + '</span>' +
          '<strong class="ap-titulo">' + App._esc(a.titulo) + '</strong>' +
          '<span class="badge ' + statusCls + '" style="font-size:0.55rem;">' + statusLabel + '</span>' +
        '</div>' +
        '<div class="ap-motivo">' + App._esc(a.motivo) + '</div>' +
        '<div class="ap-detalhes">' +
          '<span class="ap-det"><span class="ap-det-label">Origem:</span> ' + App._esc(a.origem) + '</span>' +
          '<span class="ap-det"><span class="ap-det-label">Impacto:</span> ' + App._esc(a.impacto) + '</span>' +
          '<span class="ap-det"><span class="ap-det-label">Respons\u00e1vel:</span> ' + App._esc(a.responsavel) + '</span>' +
          '<span class="ap-det"><span class="ap-det-label">Prazo:</span> ' + a.prazoRecomendado + '</span>' +
          '<span class="ap-det"><span class="ap-det-label">Tempo estimado:</span> ' + a.tempoEstimado + '</span>' +
        '</div>' +
        (a.recomendacao ? '<div class="ap-rec">\uD83D\uDCA1 ' + App._esc(a.recomendacao) + '</div>' : '') +
        '<div class="ap-actions">' +
          (a.status === 'pendente' ? '<button class="btn btn-sm btn-success" onclick="AcoesPrioritarias.concluir(\'' + a.id + '\');App._renderApAtual()">Concluir</button>' : '') +
          (a.status === 'pendente' ? '<button class="btn btn-sm" onclick="AcoesPrioritarias.adiar(\'' + a.id + '\');App._renderApAtual()">Adiar</button>' : '') +
          (a.status === 'pendente' ? '<button class="btn btn-sm btn-danger" onclick="App._apConfirmIgnorar(\'' + a.id + '\')">Ignorar</button>' : '') +
          (a.status === 'concluida' || a.status === 'ignorada' ? '<span style="font-size:0.65rem;color:var(--text-dim);">' + (a.status === 'concluida' ? 'Conclu\u00edda' : 'Ignorada') + '</span>' : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  html += '</div>'; // .ap-wrap
  document.getElementById('moduleContent').innerHTML = html;
};

// Helpers
App._apBuscar = function(valor) {
  App._apBusca = valor;
  App._renderApAtual();
};

App._apFiltrarPrioridade = function(valor) {
  App._apFiltroPrioridade = valor;
  App._renderApAtual();
};

App._apFiltrarStatus = function(valor) {
  App._apFiltroStatus = valor;
  App._renderApAtual();
};

App._apFiltrarOrigem = function(valor) {
  App._apFiltroOrigem = valor;
  App._renderApAtual();
};

App._apConfirmIgnorar = function(id) {
  if (confirm('Ignorar esta a\u00e7\u00e3o priorit\u00e1ria?')) {
    AcoesPrioritarias.ignorar(id);
    App._renderApAtual();
  }
};

// Auto-registrar refresh via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('acoes_prioritarias.updated', function() {
    if (typeof App !== 'undefined' && App.refreshAcoesPrioritarias) App.refreshAcoesPrioritarias();
  });
})();
