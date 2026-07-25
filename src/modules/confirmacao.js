App._confFiltro = '';

App.renderConfirmacao = function() {
  this._confFiltro = '';
  this._renderConf();
};

App._renderConf = function() {
  var itens = Confirmacao.collect();
  var resumo = Confirmacao.getResumo();

  if (this._confFiltro === 'pendentes') itens = itens.filter(function(i) { return i.statusConfirmacao === 'pendente'; });
  if (this._confFiltro === 'hoje') itens = itens.filter(function(i) { return i.isToday; });
  if (this._confFiltro === 'risco') itens = itens.filter(function(i) { return i.prioridade <= 1; });

  var html = L.controls(
    '<button class="btn btn-sm ' + (!this._confFiltro ? 'btn-primary' : '') + '" onclick="App._confFiltro=\'\';App._renderConf();">Todos</button>' +
    '<button class="btn btn-sm ' + (this._confFiltro === 'pendentes' ? 'btn-primary' : '') + '" onclick="App._confFiltro=\'pendentes\';App._renderConf();">Pendentes</button>' +
    '<button class="btn btn-sm ' + (this._confFiltro === 'hoje' ? 'btn-primary' : '') + '" onclick="App._confFiltro=\'hoje\';App._renderConf();">Hoje</button>' +
    '<button class="btn btn-sm ' + (this._confFiltro === 'risco' ? 'btn-primary' : '') + '" onclick="App._confFiltro=\'risco\';App._renderConf();">Risco</button>'
  ) +
  L.metrics([
    { value: resumo.total, label: 'Agendamentos' },
    { value: resumo.pendentes, label: 'Pendentes', cls: 'rp-card-red' },
    { value: resumo.hojeNaoConfirmados, label: 'Hoje n\u00e3o confirmados', cls: 'rp-card-yellow' },
    { value: resumo.atrasados, label: 'Atrasados', cls: 'rp-card-red' }
  ]);

  if (itens.length === 0) {
    html += L.empty('Tudo confirmado', 'Nenhum agendamento pendente de confirma\u00e7\u00e3o.', 'calendar');
    document.getElementById('moduleContent').innerHTML = html;
    return;
  }

  html += '<div style="display:flex;flex-direction:column;gap:6px;">';
  itens.forEach(function(item) {
    var pCls = item.prioridade <= 0 ? 'rp-card-red' : item.prioridade <= 1 ? 'rp-card-yellow' : item.prioridade <= 2 ? '' : 'rp-card';
    var prioLabel = item.prioridade <= 0 ? 'Atrasado' : item.prioridade <= 1 ? 'Urgente' : item.prioridade <= 2 ? 'Aten\u00e7\u00e3o' : 'OK';

    var msgBtns = '';
    if (item.mensagemSugerida) {
      msgBtns = '<button class="btn btn-sm" style="font-size:0.68rem;" onclick="App._enviarConfirmacao(\'' + item.id + '\',\'' + App._esc(item.mensagemSugerida) + '\')" title="' + App._esc(item.mensagemSugerida) + '">Enviar confirma\u00e7\u00e3o</button>';
    }
    if (item.statusConfirmacao === 'pendente') {
      msgBtns += '<button class="btn btn-sm" style="font-size:0.68rem;color:var(--green);" onclick="App._marcarConfirmado(\'' + item.appointmentId + '\',\'' + item.clientName + '\')">Marcar confirmado</button>';
    }

    html += '<div class="' + pCls + '" style="text-align:left;display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-md);">' +
      '<div style="min-width:60px;"><span class="badge ' + item.statusCls + '" style="font-size:0.6rem;">' + item.statusLabel + '</span></div>' +
      '<div style="flex:1;min-width:0;">' +
        '<strong>' + App._esc(item.clientName) + '</strong>' +
        '<br><span style="font-size:0.72rem;color:var(--text-muted);">' + item.date + ' \u00e0s ' + item.time + ' \u2014 ' + App._esc(item.service) + (item.professional ? ' \u2014 ' + Repos.studio.professionals.label(item.professional) : '') + '</span>' +
        '<br><span style="font-size:0.68rem;color:var(--text-dim);">' + item.proximaAcao + ' | \u00daltimo contato: ' + item.ultimoContato + '</span>' +
      '</div>' +
      '<div style="flex-shrink:0;display:flex;gap:4px;flex-wrap:wrap;">' +
        msgBtns +
        '<button class="btn btn-sm" style="font-size:0.68rem;" onclick="App.navigate(\'agenda\')">Agenda</button>' +
      '</div>' +
    '</div>';
  });
  html += '</div>';
  document.getElementById('moduleContent').innerHTML = html;
};

App._enviarConfirmacao = function(itemId, mensagem) {
  var itens = Confirmacao.collect();
  var item = null;
  for (var i = 0; i < itens.length; i++) { if (itens[i].id === itemId) { item = itens[i]; break; } }
  if (!item) return;

  // Find or create conversation
  var conversas = item.clientId ? DB.getConversasByClient(item.clientId) : DB.getConversas().filter(function(c) { return c.clientName === item.clientName; });
  var convId = null;
  if (conversas.length > 0) {
    convId = conversas[0].id;
  } else {
    var conv = Inbox.create({ clientName: item.clientName, clientId: item.clientId || null, origin: 'whatsapp', note: 'Confirma\u00e7\u00e3o de agendamento' });
    convId = conv.id;
  }
  Inbox.addMensagem(convId, 'enviada', mensagem);
  if (item.clientId) Confirmacao.marcarConfirmado(item.appointmentId);
  App._toast('Mensagem de confirma\u00e7\u00e3o registrada.', 'success');
  this._renderConf();
  App.refreshHoje();
};

App._marcarConfirmado = function(appointmentId) {
  Confirmacao.marcarConfirmado(appointmentId);
  App._toast('Agendamento marcado como confirmado.', 'success');
  this._renderConf();
  App.refreshHoje();
};

// Add to Confirmacao utility
Confirmacao.marcarConfirmado = function(appointmentId) {
  var a = Repos.agenda.get(appointmentId);
  if (!a) return;
  Repos.agenda.update(appointmentId, { status: 'confirmed' });
  if (a.clientId) {
    CRM.addTimeline(a.clientId, 'confirmacao', 'Agendamento confirmado: ' + (a.service || '') + ' em ' + a.date, appointmentId);
  }
};
