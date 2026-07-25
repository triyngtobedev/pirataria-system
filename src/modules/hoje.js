App.refreshHoje = function() {
  if (this.currentModule === 'hoje') this.renderHoje();
};

App.renderHoje = function() {
  var hoje = DB._today();

  var tasks = Hoje.collectTasks();
  var wpp = typeof Inbox.collectWhatsApp === 'function' ? Inbox.collectWhatsApp() : [];
  var confirmacoes = typeof Confirmacao.collect === 'function' ? Confirmacao.collect() : [];
  var agendaHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status !== 'cancelled'; });
  var copAcoes = typeof Copiloto.collect === 'function' ? Copiloto.collect() : [];
  var acoesFila = typeof AcoesPrioritarias !== 'undefined' ? AcoesPrioritarias.getFila() : [];
  var gargalos = typeof GargalosOperacionais !== 'undefined' ? GargalosOperacionais.getSugestoes() : [];
  var opQueue = typeof Operador !== 'undefined' ? Operador.getQueue() : [];
  var ultimosEventos = typeof EventTimeline !== 'undefined' ? EventTimeline.last(8) : [];

  var aguardandoResposta = wpp.filter(function(c) { return c.status === 'aguardando_estudio'; }).length;
  var confirmacoesPendentes = confirmacoes.filter(function(c) { return c.statusConfirmacao === 'pendente'; });
  var pagamentosPendentes = agendaHoje.filter(function(a) { return a.status === 'completed' && a.value; });
  var tarefasCriticas = acoesFila.filter(function(a) { return a.prioridade === 'Critico' && a.status === 'pendente'; });
  var gargalosCriticos = gargalos.filter(function(g) { return g.prioridade === 'Critico'; });
  var alertasOp = opQueue.filter(function(o) { return o.urgencia <= 0; });

  var html = '<div class="dash-wrap">';

  // Bloco 1: Prioridade Agora
  html += '<div class="dash-bloco dash-prioridade">';
  if (tasks.length > 0) {
    var top = tasks[0];
    var prioCls = top.score >= 85 ? 'dash-critico' : top.score >= 65 ? 'dash-alto' : 'dash-medio';
    html += '<div class="dash-prio-header">\u26A0 Prioridade Agora</div>' +
      '<div class="dash-prio-card ' + prioCls + '">' +
      '<div class="dash-prio-score">' + top.score + '</div>' +
      '<div class="dash-prio-body">' +
      '<div class="dash-prio-titulo">' + App._esc(top.clientName || '') + (top.clientName ? ' \u2014 ' : '') + App._esc(top.descricao) + '</div>' +
      '<div class="dash-prio-origem">' + App._esc(top.origem) + ' \u2022 ' + (top.horario || '') + '</div>' +
      '<div class="dash-prio-motivos">' + top.motivos.slice(0, 2).map(function(m) { return '<span class="badge badge-scheduled" style="font-size:0.5rem;padding:1px 4px;">' + App._esc(m) + '</span>'; }).join('') + '</div>' +
      '</div>' +
      '<button class="btn btn-primary btn-sm" style="white-space:nowrap;" onclick="' + (top.acaoFn || "App.navigate('" + top.origem + "')") + '">' + App._esc(top.acaoLabel || 'Abrir') + '</button>' +
      '</div>';
  } else {
    html += '<div class="dash-prio-header">\u2705 Nenhuma prioridade cr\u00edtica no momento</div>';
  }
  html += '</div>';

  // Bloco 2: WhatsApp
  html += '<div class="dash-bloco">' +
    '<div class="dash-bloco-header" onclick="App.navigate(\'inbox\')">\uD83D\uDCE8 WhatsApp <span class="dash-bloco-count">' + aguardandoResposta + '</span></div>';
  var wppAguardando = wpp.filter(function(c) { return c.status === 'aguardando_estudio'; }).slice(0, 5);
  if (wppAguardando.length === 0) {
    html += '<div class="dash-vazio">Nenhuma mensagem aguardando resposta.</div>';
  } else {
    wppAguardando.forEach(function(c) {
      html += '<div class="dash-item clickable" onclick="Executor.executar(\'whatsapp\', {conversaId:\'' + c.id + '\'})">' +
        '<span class="dash-item-nome">' + App._esc(c.clientName) + '</span>' +
        '<span class="dash-item-meta">' + App._esc(c.motivoLabel || '') + ' \u2022 ' + c.tempoLabel + '</span>' +
        '<span class="dash-item-prio inb-' + (c.priority || 'medium') + '">' + (c.priority === 'high' ? 'Alta' : '') + '</span>' +
      '</div>';
    });
  }
  html += '</div>';

  // Bloco 3: Agenda
  html += '<div class="dash-bloco">' +
    '<div class="dash-bloco-header" onclick="App.navigate(\'agenda\')">\uD83D\uDCC5 Agenda <span class="dash-bloco-count">' + agendaHoje.length + '</span></div>';
  var proximos = agendaHoje.filter(function(a) { return a.status === 'pending' || a.status === 'confirmed'; }).slice(0, 5);
  if (proximos.length === 0) {
    html += '<div class="dash-vazio">Nenhum atendimento hoje.</div>';
  } else {
    proximos.forEach(function(a) {
      var statusIcon = a.status === 'confirmed' ? '\u2705' : a.status === 'in_progress' ? '\u25B6' : '\u23F3';
      html += '<div class="dash-item clickable" onclick="App.navigate(\'agenda\')">' +
        '<span class="dash-item-hora">' + a.time + '</span>' +
        '<span class="dash-item-nome">' + App._esc(a.clientName) + '</span>' +
        '<span class="dash-item-meta">' + App._esc(a.service || '') + '</span>' +
        '<span>' + statusIcon + '</span>' +
      '</div>';
    });
  }
  if (confirmacoesPendentes.length > 0) {
    html += '<div class="dash-bloco-sub" onclick="App.navigate(\'confirmacao\')">\u2705 ' + confirmacoesPendentes.length + ' confirma\u00e7\u00e3o(\u00f5es) pendente(s)</div>';
  }
  html += '</div>';

  // Bloco 4: Opera\u00e7\u00e3o
  html += '<div class="dash-bloco">' +
    '<div class="dash-bloco-header">\u2699 Opera\u00e7\u00e3o</div>';
  var pends = acoesFila.filter(function(a) { return a.status === 'pendente'; });
  if (pends.length > 0) {
    html += '<div class="dash-bloco-sub" onclick="App.navigate(\'acoes_prioritarias\')">\uD83D\uDCCB ' + pends.length + ' a\u00e7\u00e3o(\u00f5es) priorit\u00e1ria(s)' +
      (tarefasCriticas.length > 0 ? ' <span class="dash-badge-critico">' + tarefasCriticas.length + ' cr\u00edtica(s)</span>' : '') +
    '</div>';
  }
  if (gargalos.length > 0) {
    html += '<div class="dash-bloco-sub" onclick="App.navigate(\'gargalos_operacionais\')">\u26A0 ' + gargalos.length + ' gargalo(s) detectado(s)' +
      (gargalosCriticos.length > 0 ? ' <span class="dash-badge-critico">' + gargalosCriticos.length + ' cr\u00edtico(s)</span>' : '') +
    '</div>';
  }
  if (opQueue.length > 0) {
    html += '<div class="dash-bloco-sub" onclick="App.navigate(\'operador\')">\uD83D\uDD04 ' + opQueue.length + ' tarefa(s) na fila operacional</div>';
  }
  copAcoes.forEach(function(a) {
    html += '<div class="dash-bloco-sub" onclick="Executor.executar(\'' + App._esc(a.tipo || '') + '\', {})">' + App._esc(a.categoria + ': ' + a.quantidade + ' \u2014 ' + a.motivo.substring(0, 40)) + '</div>';
  });
  if (pends.length === 0 && gargalos.length === 0 && opQueue.length === 0 && copAcoes.length === 0) {
    html += '<div class="dash-vazio">Nenhuma opera\u00e7\u00e3o pendente.</div>';
  }
  html += '</div>';

  // Bloco 5: Di\u00e1rio Operacional
  html += '<div class="dash-bloco">' +
    '<div class="dash-bloco-header" onclick="App.navigate(\'diario_operacional\')">\uD83D\uDCCA \u00daltimos eventos</div>';
  if (ultimosEventos.length === 0) {
    html += '<div class="dash-vazio">Nenhum evento registrado.</div>';
  } else {
    ultimosEventos.forEach(function(e) {
      var horario = e.timestamp ? e.timestamp.slice(11, 19) : '--:--';
      html += '<div class="dash-item">' +
        '<span class="dash-item-hora">' + horario + '</span>' +
        '<span class="dash-item-nome">' + App._esc(e.evento) + '</span>' +
        '<span class="dash-item-meta">' + App._esc(e.modulo || '') + '</span>' +
      '</div>';
    });
  }
  html += '</div>';

  // Bloco 6: Resumo
  html += '<div class="dash-bloco dash-resumo">' +
    '<div class="dash-bloco-header">\uD83D\uDCCA Resumo operacional</div>' +
    '<div class="dash-resumo-grid">' +
    '<div class="dash-resumo-item"><span class="dash-resumo-val">' + aguardandoResposta + '</span><span>Clientes aguardando resposta</span></div>' +
    '<div class="dash-resumo-item"><span class="dash-resumo-val">' + pagamentosPendentes.length + '</span><span>Clientes aguardando pagamento</span></div>' +
    '<div class="dash-resumo-item"><span class="dash-resumo-val">' + agendaHoje.length + '</span><span>Atendimentos hoje</span></div>' +
    '<div class="dash-resumo-item"><span class="dash-resumo-val dash-badge-critico">' + (tarefasCriticas.length + gargalosCriticos.length) + '</span><span>Tarefas cr\u00edticas</span></div>' +
    '<div class="dash-resumo-item"><span class="dash-resumo-val">' + (alertasOp.length + gargalos.length) + '</span><span>Alertas operacionais</span></div>' +
    '</div></div>';

  html += '</div>'; // dash-wrap
  document.getElementById('moduleContent').innerHTML = html;
};

// Auto-registrar refresh via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('meudia.updated', function() {
    if (typeof App !== 'undefined' && App.refreshHoje) App.refreshHoje();
  });
  EventBus.on('copiloto.updated', function() {
    if (typeof App !== 'undefined' && App.refreshHoje) App.refreshHoje();
  });
})();

(function() {
  var k = 'hj_state';
  App._hojeTaskFilter = 'tudo';
  try {
    var s = JSON.parse(localStorage.getItem(k));
    if (s) { App._hojeTaskFilter = s.f || 'tudo'; }
  } catch(e) {}
  App._saveHojeState = function() { localStorage.setItem(k, JSON.stringify({ f: App._hojeTaskFilter })); };
})();

