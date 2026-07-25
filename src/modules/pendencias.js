App._penState = {
  filtroTipo: 'todas',
  filtroPrioridade: 'todas',
  busca: '',
  ordenarPor: 'score',
  ordem: 'desc',
  selecionados: {},
  selecionarTodos: false
};

App.refreshPendencias = function() {
  if (this.currentModule === 'pendencias') this.renderPendencias();
};

App.renderPendencias = function() {
  var state = App._penState;
  state.selecionados = {};
  state.selecionarTodos = false;
  App._renderPendenciasAtual();
};

App._renderPendenciasAtual = function() {
  var state = App._penState;

  // Coletar e filtrar
  var todos = Pendencias.collect();
  var filtrados = Pendencias.filtrar(todos, { tipo: state.filtroTipo, prioridade: state.filtroPrioridade });
  filtrados = Pendencias.search(filtrados, state.busca);
  filtrados = Pendencias.ordenar(filtrados, state.ordenarPor, state.ordem);

  // Contadores
  var contadores = Pendencias.getContadores();

  var html = '<div class="pen-wrap">';

  // Barra de contadores por categoria
  html += '<div class="pen-contadores">' +
    '<div class="pen-chip' + (state.filtroTipo === 'todas' ? ' pen-chip-ativa' : '') + '" onclick="App._penFiltrarTipo(\'todas\')">' +
      'Todas <span class="pen-chip-count">' + contadores.total + '</span></div>';

  Pendencias.TIPOS.forEach(function(t) {
    var count = contadores[t.key] || 0;
    html += '<div class="pen-chip' + (state.filtroTipo === t.key ? ' pen-chip-ativa' : '') + (count > 0 ? '' : ' pen-chip-vazia') + '" onclick="App._penFiltrarTipo(\'' + t.key + '\')">' +
      t.icon + ' ' + t.label + ' <span class="pen-chip-count">' + count + '</span></div>';
  });

  html += '</div>';

  // Barra de busca e controles
  html += '<div class="pen-toolbar">' +
    '<div class="pen-busca">' +
      '<input type="text" id="penBusca" placeholder="Buscar por cliente, tipo, origem..." value="' + App._esc(state.busca) + '" oninput="App._penBuscar(this.value)">' +
    '</div>' +
    '<div class="pen-controles">' +
      '<select onchange="App._penOrdenar(this.value)" style="font-size:0.75rem;padding:3px 6px;">' +
        '<option value="score"' + (state.ordenarPor === 'score' ? ' selected' : '') + '>Score</option>' +
        '<option value="data"' + (state.ordenarPor === 'data' ? ' selected' : '') + '>Data</option>' +
        '<option value="cliente"' + (state.ordenarPor === 'cliente' ? ' selected' : '') + '>Cliente</option>' +
        '<option value="prioridade"' + (state.ordenarPor === 'prioridade' ? ' selected' : '') + '>Prioridade</option>' +
      '</select>' +
      '<button class="btn btn-sm" onclick="App._penAlternarOrdem()" title="Alternar ordem">' + (state.ordem === 'desc' ? '\u25BC' : '\u25B2') + '</button>' +
    '</div>' +
  '</div>';

  // Toolbar de a\u00e7\u00f5es em lote
  var qtdSel = Object.keys(state.selecionados).length;
  html += '<div class="pen-batch" id="penBatch" style="display:' + (qtdSel > 0 ? 'flex' : 'none') + ';">' +
    '<span style="font-size:0.8rem;color:var(--text-muted);margin-right:8px;">' + qtdSel + ' selecionado(s)</span>' +
    '<button class="btn btn-sm btn-primary" onclick="Executor.executar(\'pendencias.concluir\', {ids: App._penGetSelecionados()})">Concluir</button>' +
    '<button class="btn btn-sm" onclick="App._penPromptAdiar()">Adiar</button>' +
    '<button class="btn btn-sm" onclick="App._penPromptPrioridade()">Prioridade</button>' +
    '<button class="btn btn-sm" onclick="App._penPromptAtribuir()">Atribuir</button>' +
    '<button class="btn btn-sm btn-primary" onclick="Executor.executar(\'pendencias.abrir\', {ids: App._penGetSelecionados()})">Abrir</button>' +
    '<button class="btn btn-sm" onclick="App._penLimparSelecao()">Limpar</button>' +
  '</div>';

  // Tabela de pend\u00eancias
  if (filtrados.length === 0) {
    html += C.emptyState(contadores.total === 0 ? 'Nenhuma pend\u00eancia encontrada' : 'Nenhum resultado para os filtros atuais');
  } else {
    html += '<div class="pen-tabela-wrap"><table class="pen-tabela">' +
      '<thead><tr>' +
        '<th style="width:32px;"><input type="checkbox" id="penSelAll" ' + (state.selecionarTodos ? 'checked' : '') + ' onchange="App._penToggleTodos(this.checked)"></th>' +
        '<th>Tipo</th>' +
        '<th>Cliente</th>' +
        '<th>Origem</th>' +
        '<th>Prioridade</th>' +
        '<th>Score</th>' +
        '<th>Data</th>' +
        '<th>Tempo</th>' +
        '<th>Respons\u00e1vel</th>' +
        '<th>Motivos</th>' +
        '<th style="width:80px;">A\u00e7\u00e3o</th>' +
      '</tr></thead><tbody>';

    filtrados.forEach(function(item) {
      var isSel = state.selecionados[item.id] || false;
      var scoreCls = item.score >= 85 ? 'pen-critica' : item.score >= 65 ? 'pen-alta' : item.score >= 40 ? 'pen-media' : 'pen-baixa';
      var badgeCls = item.score >= 85 ? 'badge-cancelled' : item.score >= 65 ? 'badge-waiting' : 'badge-scheduled';

      html += '<tr class="' + (isSel ? 'pen-sel' : '') + '">' +
        '<td><input type="checkbox" ' + (isSel ? 'checked' : '') + ' onchange="App._penToggleSel(\'' + item.id + '\', this.checked)"></td>' +
        '<td><span class="pen-tipo-badge">' + App._esc(item.tipoLabel) + '</span></td>' +
        '<td><strong>' + App._esc(item.cliente) + '</strong></td>' +
        '<td class="text-muted text-sm">' + App._esc(item.origem) + '</td>' +
        '<td><span class="badge ' + badgeCls + '" style="font-size:0.55rem;">' + item.prioridade + '</span></td>' +
        '<td><span class="pen-score ' + scoreCls + '">' + item.score + '</span></td>' +
        '<td class="text-sm">' + item.data + '</td>' +
        '<td class="text-sm text-muted">' + item.tempoEmAberto + '</td>' +
        '<td class="text-sm">' + (item.responsavel ? App._esc(item.responsavel) : '<span class="text-muted">—</span>') + '</td>' +
        '<td class="text-sm">' +
          item.motivos.slice(0, 2).map(function(m) {
            return '<span class="badge badge-scheduled" style="font-size:0.5rem;padding:1px 4px;margin:0 1px;">' + App._esc(m) + '</span>';
          }).join('') +
          (item.motivos.length > 2 ? ' <span class="text-muted" style="font-size:0.55rem;">+' + (item.motivos.length - 2) + '</span>' : '') +
        '</td>' +
        '<td><button class="btn btn-sm btn-primary" style="font-size:0.65rem;padding:2px 8px;" onclick="Executor.executar(\'pendencias.abrir\', {ids: [\'' + item.id + '\']})">Resolver</button></td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
  }

  html += '</div>'; // .pen-wrap

  document.getElementById('moduleContent').innerHTML = html;
};

// ─── Helpers de estado ───

App._penFiltrarTipo = function(tipo) {
  App._penState.filtroTipo = tipo;
  App._penState.selecionados = {};
  App._penState.selecionarTodos = false;
  App._renderPendenciasAtual();
};

App._penBuscar = function(valor) {
  App._penState.busca = valor;
  App._renderPendenciasAtual();
};

App._penOrdenar = function(campo) {
  App._penState.ordenarPor = campo;
  App._renderPendenciasAtual();
};

App._penAlternarOrdem = function() {
  App._penState.ordem = App._penState.ordem === 'desc' ? 'asc' : 'desc';
  App._renderPendenciasAtual();
};

App._penToggleSel = function(id, checked) {
  if (checked) App._penState.selecionados[id] = true;
  else delete App._penState.selecionados[id];
  App._penAtualizarBatch();
};

App._penToggleTodos = function(checked) {
  App._penState.selecionarTodos = checked;
  var items = Pendencias.collect();
  items = Pendencias.filtrar(items, { tipo: App._penState.filtroTipo, prioridade: App._penState.filtroPrioridade });
  items = Pendencias.search(items, App._penState.busca);
  var self = this;
  items.forEach(function(i) {
    if (checked) App._penState.selecionados[i.id] = true;
    else delete App._penState.selecionados[i.id];
  });
  App._penAtualizarBatch();
};

App._penLimparSelecao = function() {
  App._penState.selecionados = {};
  App._penState.selecionarTodos = false;
  App._renderPendenciasAtual();
};

App._penGetSelecionados = function() {
  return Object.keys(App._penState.selecionados);
};

App._penAtualizarBatch = function() {
  var batch = document.getElementById('penBatch');
  var qtd = Object.keys(App._penState.selecionados).length;
  if (batch) {
    batch.style.display = qtd > 0 ? 'flex' : 'none';
    batch.innerHTML =
      '<span style="font-size:0.8rem;color:var(--text-muted);margin-right:8px;">' + qtd + ' selecionado(s)</span>' +
      '<button class="btn btn-sm btn-primary" onclick="Executor.executar(\'pendencias.concluir\', {ids: App._penGetSelecionados()})">Concluir</button>' +
      '<button class="btn btn-sm" onclick="App._penPromptAdiar()">Adiar</button>' +
      '<button class="btn btn-sm" onclick="App._penPromptPrioridade()">Prioridade</button>' +
      '<button class="btn btn-sm" onclick="App._penPromptAtribuir()">Atribuir</button>' +
      '<button class="btn btn-sm btn-primary" onclick="Executor.executar(\'pendencias.abrir\', {ids: App._penGetSelecionados()})">Abrir</button>' +
      '<button class="btn btn-sm" onclick="App._penLimparSelecao()">Limpar</button>';
  }
};

// ─── Prompts para a\u00e7\u00f5es em lote ───

App._penPromptAdiar = function() {
  var hoje = DB._today();
  App._showOverlay('Adiar pend\u00eancias', '<div class="form-group"><label>Nova data</label><input type="date" id="penAdiarData" value="' + hoje + '"></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._penAdiarConfirm()">Adiar</button></div>');
};

App._penAdiarConfirm = function() {
  var data = document.getElementById('penAdiarData').value;
  App._closeOverlay();
  Executor.executar('pendencias.adiar', { ids: App._penGetSelecionados(), data: data });
  App._penLimparSelecao();
};

App._penPromptPrioridade = function() {
  App._showOverlay('Alterar prioridade', '<div class="form-group"><label>Nova prioridade</label><select id="penNovaPrioridade"><option value="baixa">Baixa</option><option value="media" selected>M\u00e9dia</option><option value="alta">Alta</option><option value="critica">Cr\u00edtica</option></select></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._penPrioridadeConfirm()">Alterar</button></div>');
};

App._penPrioridadeConfirm = function() {
  var prio = document.getElementById('penNovaPrioridade').value;
  App._closeOverlay();
  Executor.executar('pendencias.prioridade', { ids: App._penGetSelecionados(), prioridade: prio });
  App._penLimparSelecao();
};

App._penPromptAtribuir = function() {
  App._showOverlay('Atribuir respons\u00e1vel', '<div class="form-group"><label>Nome do respons\u00e1vel</label><input type="text" id="penResponsavel" placeholder="Digite o nome"></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._penAtribuirConfirm()">Atribuir</button></div>');
};

App._penAtribuirConfirm = function() {
  var resp = document.getElementById('penResponsavel').value.trim();
  App._closeOverlay();
  if (resp) {
    Executor.executar('pendencias.atribuir', { ids: App._penGetSelecionados(), responsavel: resp });
    App._penLimparSelecao();
  }
};

// Auto-registrar refresh via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('pendencias.updated', function() {
    if (typeof App !== 'undefined' && App.refreshPendencias) App.refreshPendencias();
  });
})();
