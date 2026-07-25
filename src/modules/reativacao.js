App._reaState = {
  filtroClassificacao: 'todas',
  filtroVip: false,
  busca: '',
  ordenarPor: 'score',
  ordem: 'desc',
  selecionados: {},
  selecionarTodos: false
};

App.refreshReativacao = function() {
  if (this.currentModule === 'reativacao') this.renderReativacao();
};

App.renderReativacao = function() {
  var state = App._reaState;
  state.selecionados = {};
  state.selecionarTodos = false;
  App._renderReativacaoAtual();
};

App._renderReativacaoAtual = function() {
  var state = App._reaState;

  var todos = Reativacao.collect();
  var filtrados = Reativacao.filtrar(todos, { classificacao: state.filtroClassificacao, vip: state.filtroVip ? true : null });
  filtrados = Reativacao.search(filtrados, state.busca);
  filtrados = Reativacao.ordenar(filtrados, state.ordenarPor, state.ordem);
  var contadores = Reativacao.getContadores();

  var html = '<div class="rea-wrap">';

  // ─── Contadores ───
  var clsAll = state.filtroClassificacao === 'todas' ? ' rea-chip-ativa' : '';
  html += '<div class="rea-contadores">' +
    '<div class="rea-chip' + clsAll + '" onclick="App._reaFiltrar(\'todas\')">Todos <span class="rea-chip-count">' + contadores.total + '</span></div>' +
    '<div class="rea-chip' + (state.filtroClassificacao === 'contatar_hoje' ? ' rea-chip-ativa' : '') + '" onclick="App._reaFiltrar(\'contatar_hoje\')">\u26A0 Contatar hoje <span class="rea-chip-count">' + contadores.contatarHoje + '</span></div>' +
    '<div class="rea-chip' + (state.filtroClassificacao === 'esta_semana' ? ' rea-chip-ativa' : '') + '" onclick="App._reaFiltrar(\'esta_semana\')">\uD83D\uDCC5 Esta semana <span class="rea-chip-count">' + contadores.estaSemana + '</span></div>' +
    '<div class="rea-chip' + (state.filtroClassificacao === 'baixa_prioridade' ? ' rea-chip-ativa' : '') + '" onclick="App._reaFiltrar(\'baixa_prioridade\')">\u2139 Baixa prioridade <span class="rea-chip-count">' + contadores.baixaPrioridade + '</span></div>' +
    '<div class="rea-chip' + (state.filtroVip ? ' rea-chip-ativa' : '') + '" onclick="App._reaToggleVip()">\uD83C\uDFC6 VIP <span class="rea-chip-count">' + contadores.vips + '</span></div>' +
  '</div>';

  // ─── Busca e controles ───
  html += '<div class="rea-toolbar">' +
    '<div class="rea-busca">' +
      '<input type="text" id="reaBusca" placeholder="Buscar cliente, servi\u00e7o, telefone..." value="' + App._esc(state.busca) + '" oninput="App._reaBuscar(this.value)">' +
    '</div>' +
    '<div class="rea-controles">' +
      '<select onchange="App._reaOrdenar(this.value)" style="font-size:0.75rem;padding:3px 6px;">' +
        '<option value="score"' + (state.ordenarPor === 'score' ? ' selected' : '') + '>Score</option>' +
        '<option value="dias"' + (state.ordenarPor === 'dias' ? ' selected' : '') + '>Tempo sem retorno</option>' +
        '<option value="gasto"' + (state.ordenarPor === 'gasto' ? ' selected' : '') + '>Valor gasto</option>' +
        '<option value="nome"' + (state.ordenarPor === 'nome' ? ' selected' : '') + '>Nome</option>' +
      '</select>' +
      '<button class="btn btn-sm" onclick="App._reaAlternarOrdem()" title="Alternar ordem">' + (state.ordem === 'desc' ? '\u25BC' : '\u25B2') + '</button>' +
    '</div>' +
  '</div>';

  // ─── Toolbar de a\u00e7\u00f5es em lote ───
  var qtdSel = Object.keys(state.selecionados).length;
  html += '<div class="rea-batch" id="reaBatch" style="display:' + (qtdSel > 0 ? 'flex' : 'none') + ';">' +
    '<span style="font-size:0.8rem;color:var(--text-muted);margin-right:8px;">' + qtdSel + ' selecionado(s)</span>' +
    '<button class="btn btn-sm btn-primary" onclick="Executor.executar(\'reativacao.abrir\', {ids: App._reaGetSelecionados()})">Abrir conversa</button>' +
    '<button class="btn btn-sm" onclick="Executor.executar(\'reativacao.followup\', {ids: App._reaGetSelecionados()})">Criar follow-up</button>' +
    '<button class="btn btn-sm" onclick="Executor.executar(\'reativacao.adiar\', {ids: App._reaGetSelecionados()})">Adiar</button>' +
    '<button class="btn btn-sm btn-danger" onclick="App._reaConfirmIgnorar()">Ignorar</button>' +
    '<button class="btn btn-sm" onclick="App._reaLimparSelecao()">Limpar</button>' +
  '</div>';

  // ─── Lista de clientes ───
  if (filtrados.length === 0) {
    html += C.emptyState(contadores.total === 0 ? 'Nenhum cliente para reativa\u00e7\u00e3o no momento' : 'Nenhum resultado para os filtros atuais');
  } else {
    html += '<div class="rea-lista">';

    filtrados.forEach(function(c) {
      var isSel = state.selecionados[c.id] || false;
      var scoreCls = c.score >= 70 ? 'rea-score-alta' : c.score >= 45 ? 'rea-score-media' : 'rea-score-baixa';
      var classCls = c.classificacao === 'contatar_hoje' ? 'rea-cls-hoje' : c.classificacao === 'esta_semana' ? 'rea-cls-semana' : 'rea-cls-baixa';
      var classLabel = c.classificacao === 'contatar_hoje' ? 'Contatar hoje' : c.classificacao === 'esta_semana' ? 'Esta semana' : 'Baixa prioridade';

      html += '<div class="rea-card' + (isSel ? ' rea-sel' : '') + '">' +
        '<div class="rea-card-left">' +
          '<input type="checkbox" ' + (isSel ? 'checked' : '') + ' onchange="App._reaToggleSel(\'' + c.id + '\', this.checked)">' +
        '</div>' +
        '<div class="rea-card-body">' +
          '<div class="rea-card-top">' +
            '<strong class="rea-nome">' + App._esc(c.nome) + '</strong>' +
            '<span class="rea-class ' + classCls + '">' + classLabel + '</span>' +
            '<span class="rea-score ' + scoreCls + '">' + c.score + '</span>' +
          '</div>' +
          '<div class="rea-card-info">' +
            '<span>\uD83D\uDCC5 ' + (c.diasSemRetorno > 0 ? c.diasSemRetorno + ' dias sem retorno' : 'Sem visita registrada') + '</span>' +
            '<span> | \uD83D\uDCB0 R$ ' + c.totalGasto.toFixed(2).replace('.', ',') + '</span>' +
            (c.isVip ? '<span> | \uD83C\uDFC6 VIP</span>' : '') +
            '<span> | \uD83D\uDCAC ' + c.canalRecomendado.charAt(0).toUpperCase() + c.canalRecomendado.slice(1) + '</span>' +
          '</div>' +
          '<div class="rea-card-detalhes">' +
            (c.ultimoServico ? '<span class="rea-servico">\uD83D\uDD28 ' + App._esc(c.ultimoServico) + '</span>' : '') +
            '<span class="rea-horario">\u23F0 ' + c.melhorHorario + '</span>' +
          '</div>' +
          '<div class="rea-motivos">' +
            c.criterios.slice(0, 4).map(function(m) {
              return '<span class="badge badge-scheduled" style="font-size:0.5rem;padding:1px 4px;">' + App._esc(m) + '</span>';
            }).join('') +
            (c.criterios.length > 4 ? ' <span class="text-muted" style="font-size:0.55rem;">+' + (c.criterios.length - 4) + '</span>' : '') +
          '</div>' +
          '<div class="rea-prob">' +
            'Convers\u00e3o: <strong>' + c.probConversao + '%</strong> (' + c.probLabel + ')' +
            (c.boosterOciosidade > 0 ? ' <span class="rea-booster">\u26A1 +' + c.boosterOciosidade + ' pts (hor\u00e1rio ocioso)</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="rea-card-actions">' +
          '<button class="btn btn-sm btn-primary" onclick="Executor.executar(\'reativacao.abrir\', {ids: [\'' + c.id + '\']})" title="Abrir conversa">Abrir</button>' +
          '<button class="btn btn-sm" onclick="Executor.executar(\'reativacao.followup\', {ids: [\'' + c.id + '\']})" title="Criar tarefa de follow-up">Follow-up</button>' +
        '</div>' +
      '</div>';
    });

    html += '</div>';
  }

  html += '</div>'; // .rea-wrap

  document.getElementById('moduleContent').innerHTML = html;
};

// ─── Helpers de estado ───

App._reaFiltrar = function(classificacao) {
  App._reaState.filtroClassificacao = classificacao;
  App._reaState.selecionados = {};
  App._reaState.selecionarTodos = false;
  App._renderReativacaoAtual();
};

App._reaToggleVip = function() {
  App._reaState.filtroVip = !App._reaState.filtroVip;
  App._reaState.selecionados = {};
  App._reaState.selecionarTodos = false;
  App._renderReativacaoAtual();
};

App._reaBuscar = function(valor) {
  App._reaState.busca = valor;
  App._renderReativacaoAtual();
};

App._reaOrdenar = function(campo) {
  App._reaState.ordenarPor = campo;
  App._renderReativacaoAtual();
};

App._reaAlternarOrdem = function() {
  App._reaState.ordem = App._reaState.ordem === 'desc' ? 'asc' : 'desc';
  App._renderReativacaoAtual();
};

App._reaToggleSel = function(id, checked) {
  if (checked) App._reaState.selecionados[id] = true;
  else delete App._reaState.selecionados[id];
  App._reaAtualizarBatch();
};

App._reaLimparSelecao = function() {
  App._reaState.selecionados = {};
  App._reaState.selecionarTodos = false;
  App._renderReativacaoAtual();
};

App._reaGetSelecionados = function() {
  return Object.keys(App._reaState.selecionados);
};

App._reaAtualizarBatch = function() {
  var batch = document.getElementById('reaBatch');
  var qtd = Object.keys(App._reaState.selecionados).length;
  if (batch) {
    batch.style.display = qtd > 0 ? 'flex' : 'none';
    batch.innerHTML =
      '<span style="font-size:0.8rem;color:var(--text-muted);margin-right:8px;">' + qtd + ' selecionado(s)</span>' +
      '<button class="btn btn-sm btn-primary" onclick="Executor.executar(\'reativacao.abrir\', {ids: App._reaGetSelecionados()})">Abrir conversa</button>' +
      '<button class="btn btn-sm" onclick="Executor.executar(\'reativacao.followup\', {ids: App._reaGetSelecionados()})">Criar follow-up</button>' +
      '<button class="btn btn-sm" onclick="Executor.executar(\'reativacao.adiar\', {ids: App._reaGetSelecionados()})">Adiar</button>' +
      '<button class="btn btn-sm btn-danger" onclick="App._reaConfirmIgnorar()">Ignorar</button>' +
      '<button class="btn btn-sm" onclick="App._reaLimparSelecao()">Limpar</button>';
  }
};

App._reaConfirmIgnorar = function() {
  if (confirm('Ignorar ' + Object.keys(App._reaState.selecionados).length + ' cliente(s) da reativa\u00e7\u00e3o?')) {
    Executor.executar('reativacao.ignorar', { ids: App._reaGetSelecionados() });
    App._reaLimparSelecao();
  }
};

// Auto-registrar refresh via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('reativacao.updated', function() {
    if (typeof App !== 'undefined' && App.refreshReativacao) App.refreshReativacao();
  });
})();
