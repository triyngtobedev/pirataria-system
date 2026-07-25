App._orcFilter = 'todos';
App._orcSearch = '';
App._selectedOrc = null;

App.renderOrcamentos = function() {
  this._selectedOrc = null;
  this._orcFilter = 'todos';
  this._orcSearch = '';
  this._renderOrcList();
};

App._renderOrcList = function() {
  var list = this._filterOrcamentos();
  var metrics = Orcamento.getMetrics();
  var html = '<div class="rp-controls"><div class="rp-filters">' +
    '<input type="text" id="orcSearch" placeholder="Buscar..." style="width:160px;padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);" oninput="App._onOrcSearch()">' +
    '<select id="orcFilter" onchange="App._onOrcFilter()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">' +
      '<option value="todos">Todos</option>' +
      Orcamento.STATUS.map(function(s) { return '<option value="' + s + '">' + Orcamento.STATUS_LABELS[s] + '</option>'; }).join('') +
    '</select>' +
    '<button class="btn btn-primary btn-sm" onclick="App._showNewOrcamento()">+ Novo or\u00e7amento</button>' +
  '</div></div>' +
  '<div class="rp-grid" style="margin-bottom:18px;">' +
    '<div class="rp-card"><span class="rp-num">' + metrics.criados + '</span><span class="rp-lbl">Criados</span></div>' +
    '<div class="rp-card"><span class="rp-num">' + metrics.enviados + '</span><span class="rp-lbl">Enviados</span></div>' +
    '<div class="rp-card rp-card-green"><span class="rp-num">' + metrics.aprovados + '</span><span class="rp-lbl">Aprovados</span></div>' +
    '<div class="rp-card rp-card-red"><span class="rp-num">' + metrics.recusados + '</span><span class="rp-lbl">Recusados</span></div>' +
    '<div class="rp-card"><span class="rp-num">' + metrics.conversao + '%</span><span class="rp-lbl">Convers\u00e3o</span></div>' +
    '<div class="rp-card"><span class="rp-num">R$ ' + metrics.valorPotencial.toFixed(2).replace('.', ',') + '</span><span class="rp-lbl">Valor potencial</span></div>' +
    '<div class="rp-card rp-card-green"><span class="rp-num">R$ ' + metrics.valorConvertido.toFixed(2).replace('.', ',') + '</span><span class="rp-lbl">Valor convertido</span></div>' +
  '</div>';

  if (list.length === 0) {
    html += C.emptyStateFull({ icon: 'document', title: 'Nenhum or\u00e7amento encontrado', desc: 'Crie o primeiro or\u00e7amento para come\u00e7ar.' });
  } else {
    html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>Cliente</th><th>Procedimento</th><th>Valor</th><th>Status</th><th>Validade</th><th>Atualizado</th><th></th></tr></thead><tbody>' +
      list.map(function(o) {
        var statusCls = o.status === 'aprovado' ? 'badge-completed' : o.status === 'recusado' || o.status === 'expirado' ? 'badge-cancelled' : o.status === 'enviado' ? 'badge-scheduled' : 'badge-progress';
        var val = o.valorFinal ? 'R$ ' + o.valorFinal : '—';
        var valStr = o.validade || '—';
        var upd = o.updatedAt ? o.updatedAt.slice(0, 10) : '—';
        return '<tr class="clickable" onclick="App._viewOrcamento(\'' + o.id + '\')"><td><strong>#' + o.numero + '</strong></td><td>' + App._esc(o.nomeCliente) + '</td><td class="text-sm">' + App._esc(o.procedimentos || '—') + '</td><td>' + val + '</td><td><span class="badge ' + statusCls + '">' + Orcamento.STATUS_LABELS[o.status] + '</span></td><td class="text-muted text-sm">' + valStr + '</td><td class="text-muted text-sm">' + upd + '</td><td><button class="btn btn-sm" onclick="event.stopPropagation();App._viewOrcamento(\'' + o.id + '\')">Detalhes</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  document.getElementById('moduleContent').innerHTML = '<div class="rp-section">' + html + '</div>';
};

App._filterOrcamentos = function() {
  var list = DB.getOrcamentos();
  var filtro = this._orcFilter;
  var busca = this._orcSearch.toLowerCase().trim();
  if (filtro !== 'todos') list = list.filter(function(o) { return o.status === filtro; });
  if (busca) list = list.filter(function(o) { return o.nomeCliente.toLowerCase().indexOf(busca) >= 0 || (o.numero || '').indexOf(busca) >= 0; });
  return list;
};

App._onOrcFilter = function() {
  this._orcFilter = document.getElementById('orcFilter').value;
  this._renderOrcList();
};

App._onOrcSearch = function() {
  this._orcSearch = document.getElementById('orcSearch').value;
  this._renderOrcList();
};

App._showNewOrcamento = function() {
  var clients = DB.getClients();
  this._showOverlay('Novo or\u00e7amento', '<div class="form-group"><label>Cliente</label><select id="orcNewClient"><option value="">— Novo cliente</option>' + clients.map(function(c) { return '<option value="' + c.id + '">' + App._esc(c.name) + (c.phone ? ' (' + App._esc(c.phone) + ')' : '') + '</option>'; }).join('') + '</select></div><div class="form-group" id="orcNewNameGroup"><label>Nome do cliente</label><input type="text" id="orcNewName" placeholder="Nome"></div><div class="form-row"><div class="form-group"><label>Telefone</label><input type="text" id="orcNewPhone" placeholder="(71) 9..."></div><div class="form-group"><label>Validade</label><input type="date" id="orcNewValidade"></div></div><div class="form-group"><label>Procedimento(s)</label><input type="text" id="orcNewProc" placeholder="Ex: Piercing h\u00e9lix"></div><div class="form-group"><label>Joias selecionadas</label><input type="text" id="orcNewJoias" placeholder="Ex: Opalito 3mm"></div><div class="form-row"><div class="form-group"><label>Subtotal (R$)</label><input type="text" id="orcNewSub" placeholder="0,00"></div><div class="form-group"><label>Desconto (R$)</label><input type="text" id="orcNewDesc" placeholder="0,00"></div><div class="form-group"><label>Valor final (R$)</label><input type="text" id="orcNewFinal" placeholder="0,00"></div></div><div class="form-group"><label>Observa\u00e7\u00f5es</label><textarea id="orcNewObs" rows="2"></textarea></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmNewOrcamento()">Criar or\u00e7amento</button></div>');

  document.getElementById('orcNewClient').addEventListener('change', function() {
    var g = document.getElementById('orcNewNameGroup');
    g.style.display = this.value ? 'none' : 'block';
    if (this.value) {
      var c = Repos.clientes.get(this.value);
      if (c) { document.getElementById('orcNewName').value = c.name; document.getElementById('orcNewPhone').value = c.phone || ''; }
    }
  });
};

App._confirmNewOrcamento = function() {
  var clientId = document.getElementById('orcNewClient').value || null;
  var name = clientId ? (Repos.clientes.get(clientId) || {}).name : document.getElementById('orcNewName').value.trim();
  if (!name) { App._toast('Nome \u00e9 obrigat\u00f3rio.', 'warning'); return; }
  if (!clientId) {
    var c = Repos.clientes.create({ name: name, phone: document.getElementById('orcNewPhone').value.trim() });
    clientId = c.id;
    Events.emit('crm.cliente_criado', { clientId: c.id });
  }
  var o = Orcamento.create({ clientId: clientId, nomeCliente: name, telefone: document.getElementById('orcNewPhone').value.trim(), procedimentos: document.getElementById('orcNewProc').value.trim(), joias: document.getElementById('orcNewJoias').value.trim(), observacoes: document.getElementById('orcNewObs').value.trim(), subtotal: document.getElementById('orcNewSub').value.trim(), desconto: document.getElementById('orcNewDesc').value.trim(), valorFinal: document.getElementById('orcNewFinal').value.trim(), validade: document.getElementById('orcNewValidade').value, status: 'rascunho' });
  if (o.clientId) CRM.addTimeline(o.clientId, 'orcamento_criado', 'Or\u00e7amento #' + o.numero + ' criado — ' + (o.procedimentos || ''), o.id);
  App._closeOverlay();
  App._toast('Or\u00e7amento #' + o.numero + ' criado.', 'success');
  this._renderOrcList();
  EventBus.emit('meudia.updated');
};

App._viewOrcamento = function(id) {
  var o = DB.getOrcamento(id);
  if (!o) return;
  var statusOpts = Orcamento.STATUS.map(function(s) { return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + Orcamento.STATUS_LABELS[s] + '</option>'; }).join('');

  var hasConv = o.conversationId ? DB.getConversa(o.conversationId) : null;
  var convHtml = hasConv ? '<button class="btn btn-sm" onclick="App.navigate(\'inbox\')">Ver conversa</button>' : '<button class="btn btn-sm" onclick="App._linkOrcToConversa(\'' + o.id + '\')">Vincular conversa</button>';

  this._showOverlay('Or\u00e7amento #' + o.numero, '<div class="os-detail">' +
    '<div class="os-detail-row"><span class="os-detail-label">#</span><span class="os-detail-value">' + o.numero + '</span></div>' +
    '<div class="os-detail-row"><span class="os-detail-label">Cliente</span><span class="os-detail-value">' + App._esc(o.nomeCliente) + '</span></div>' +
    (o.telefone ? '<div class="os-detail-row"><span class="os-detail-label">Telefone</span><span class="os-detail-value">' + App._esc(o.telefone) + '</span></div>' : '') +
    '<div class="os-detail-row"><span class="os-detail-label">Procedimento</span><span class="os-detail-value">' + App._esc(o.procedimentos || '—') + '</span></div>' +
    (o.joias ? '<div class="os-detail-row"><span class="os-detail-label">Joias</span><span class="os-detail-value">' + App._esc(o.joias) + '</span></div>' : '') +
    '<div class="os-detail-row"><span class="os-detail-label">Subtotal</span><span class="os-detail-value">R$ ' + (o.subtotal || '0') + '</span></div>' +
    (o.desconto && parseFloat(o.desconto) > 0 ? '<div class="os-detail-row"><span class="os-detail-label">Desconto</span><span class="os-detail-value">R$ ' + o.desconto + '</span></div>' : '') +
    '<div class="os-detail-row"><span class="os-detail-label">Valor final</span><span class="os-detail-value"><strong>R$ ' + (o.valorFinal || '0') + '</strong></span></div>' +
    (o.validade ? '<div class="os-detail-row"><span class="os-detail-label">Validade</span><span class="os-detail-value">' + o.validade + '</span></div>' : '') +
    '<div class="os-detail-row"><span class="os-detail-label">Status</span><span class="os-detail-value"><select id="orcDetailStatus" style="padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:0.84rem;">' + statusOpts + '</select></span></div>' +
    (o.observacoes ? '<div class="os-detail-row"><span class="os-detail-label">Obs</span><span class="os-detail-value">' + App._esc(o.observacoes) + '</span></div>' : '') +
    '<div class="os-detail-row"><span class="os-detail-label">Criado</span><span class="os-detail-value">' + (o.createdAt ? o.createdAt.slice(0, 19).replace('T', ' ') : '—') + '</span></div>' +
  '</div>' +
  '<div style="margin-top:16px;">' + convHtml + '</div>' +
  '<div class="overlay-actions" style="margin-top:16px;">' +
    '<button class="btn" onclick="App._closeOverlay()">Fechar</button>' +
    '<button class="btn btn-primary" onclick="App._saveOrcStatus(\'' + o.id + '\')">Salvar status</button>' +
    (o.status === 'aprovado' ? '<button class="btn btn-success" onclick="App._createAgendaFromOrc(\'' + o.id + '\')">Criar agendamento</button>' : '') +
  '</div>');
};

App._saveOrcStatus = function(id) {
  var newStatus = document.getElementById('orcDetailStatus').value;
  var o = Orcamento.setStatus(id, newStatus);
  if (!o) { App._toast('Status n\u00e3o pode ser alterado.', 'warning'); return; }
  App._closeOverlay();
  App._toast('Or\u00e7amento #' + o.numero + ': ' + Orcamento.STATUS_LABELS[newStatus], 'success');
  this._renderOrcList();
  EventBus.emit('meudia.updated');
};

App._linkOrcToConversa = function(orcId) {
  var o = DB.getOrcamento(orcId);
  if (!o) return;
  var conversas = DB.getConversas().filter(function(c) { return c.status !== 'encerrada'; });
  var html = '<div class="form-group"><label>Selecionar conversa</label><select id="orcLinkConv">';
  conversas.forEach(function(c) {
    html += '<option value="' + c.id + '">' + App._esc(c.clientName) + (c.origin ? ' [' + (Inbox.ORIGEM_LABELS[c.origin] || c.origin) + ']' : '') + '</option>';
  });
  html += '</select></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmLinkOrcToConversa(\'' + orcId + '\')">Vincular</button></div>';
  App._showOverlay('Vincular conversa', html);
};

App._confirmLinkOrcToConversa = function(orcId) {
  var convId = document.getElementById('orcLinkConv').value;
  DB.updateOrcamento(orcId, { conversationId: convId });
  Inbox.addMensagem(convId, 'recebida', 'Or\u00e7amento #' + (DB.getOrcamento(orcId) || {}).numero + ' vinculado');
  App._closeOverlay();
  App._toast('Conversa vinculada.', 'success');
  App._viewOrcamento(orcId);
};

App._createAgendaFromOrc = function(orcId) {
  var o = DB.getOrcamento(orcId);
  if (!o) return;
  App._closeOverlay();
  this._showOverlay('Criar agendamento', '<div class="form-group"><label>Cliente</label><input type="text" value="' + App._esc(o.nomeCliente) + '" disabled></div><div class="form-row"><div class="form-group"><label>Data</label><input type="date" id="orcAgDate" value="' + DB._today() + '"></div><div class="form-group"><label>Hor\u00e1rio</label><input type="time" id="orcAgTime" value="10:00"></div></div><div class="form-row"><div class="form-group"><label>Servi\u00e7o</label><input type="text" id="orcAgService" value="' + App._esc(o.procedimentos || '') + '"></div><div class="form-group"><label>Profissional</label><select id="orcAgProf">' + App._professionalOptions() + '</select></div></div><div class="form-group"><label>Observa\u00e7\u00f5es</label><textarea id="orcAgNotes" rows="2">' + App._esc(o.observacoes || '') + '</textarea></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmAgendaFromOrc(\'' + orcId + '\')">Agendar</button></div>');
};

App._confirmAgendaFromOrc = function(orcId) {
  var o = DB.getOrcamento(orcId);
  if (!o) return;
  Repos.agenda.create({
    clientId: o.clientId,
    clientName: o.nomeCliente,
    date: document.getElementById('orcAgDate').value,
    time: document.getElementById('orcAgTime').value,
    service: document.getElementById('orcAgService').value.trim() || o.procedimentos,
    professional: document.getElementById('orcAgProf').value,
    notes: document.getElementById('orcAgNotes').value.trim() || o.observacoes
  });
  if (o.clientId) Events.emit('crm.agendamento_criado', { clientId: o.clientId, service: document.getElementById('orcAgService').value.trim() || o.procedimentos, refId: null });
  App._closeOverlay();
  App._toast('Agendamento criado a partir do or\u00e7amento.', 'success');
  this._renderOrcList();
  EventBus.emit('meudia.updated');
};
