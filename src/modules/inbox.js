App._inboxFilter = 'todas';
App._inboxSearch = '';
App._selectedConversa = null;

App.renderInbox = function() {
  this._inboxFilter = 'todas';
  this._inboxSearch = '';
  this._selectedConversa = null;
  this._renderInboxLayout();
};

App._renderInboxLayout = function() {
  var conversas = this._inboxSearch ? Inbox.search(this._inboxSearch) : Inbox.list(this._inboxFilter);
  var selected = this._selectedConversa ? Inbox.get(this._selectedConversa) : null;

  document.getElementById('moduleContent').innerHTML =
    '<div class="inbox-wrap">' +
      '<div class="inbox-sidebar">' +
        '<div class="inbox-toolbar">' +
          '<input type="text" id="inboxSearch" class="inbox-search" placeholder="Buscar conversa..." value="' + this._esc(this._inboxSearch) + '" oninput="App._onInboxSearch()">' +
          '<button class="btn btn-primary btn-sm" onclick="App._showNewConversa()" style="width:100%;justify-content:center;margin-top:8px;">+ Nova conversa</button>' +
        '</div>' +
        '<div class="inbox-filtros">' +
          this._renderInboxFilterChips() +
        '</div>' +
        '<div class="inbox-lista">' +
          (conversas.length === 0
            ? '<div class="empty-state" style="padding:24px 12px;">Nenhuma conversa encontrada.</div>'
            : conversas.map(function(c) { return App._renderConversaItem(c, selected && selected.id === c.id); }).join('')) +
        '</div>' +
      '</div>' +
      '<div class="inbox-detail">' +
        (selected ? this._renderConversaDetail(selected) : '<div class="empty-state" style="padding:60px 20px;">Selecione uma conversa para visualizar.</div>') +
      '</div>' +
    '</div>';
};

App._renderInboxFilterChips = function() {
  var filtros = [
    { key: 'todas', label: 'Todas' },
    { key: 'aberta', label: 'Abertas' },
    { key: 'aguardando_cliente', label: 'Aguard. Cliente' },
    { key: 'aguardando_estudio', label: 'Aguard. Est\u00fadio' },
    { key: 'encerrada', label: 'Encerradas' }
  ];
  var html = '';
  for (var i = 0; i < filtros.length; i++) {
    var f = filtros[i];
    var ativo = f.key === this._inboxFilter ? ' inb-chip-active' : '';
    html += '<span class="inb-chip' + ativo + '" onclick="App._setInboxFilter(\'' + f.key + '\')">' + f.label + '</span>';
  }
  return html;
};

App._setInboxFilter = function(filtro) {
  this._inboxFilter = filtro;
  this._inboxSearch = '';
  this._selectedConversa = null;
  this._renderInboxLayout();
};

App._onInboxSearch = function() {
  this._inboxFilter = 'todas';
  this._inboxSearch = '';
  this._selectedConversa = null;
  this._renderInboxLayout();
};

App._usarRespostaRapida = function(conversaId, texto) {
  Inbox.addMensagem(conversaId, 'enviada', texto);
  App._toast('Resposta r\u00e1pida registrada.', 'success');
  this._renderInboxLayout();
  App.refreshHoje();
};

App._renderConversaItem = function(c, selected) {
  var selCls = selected ? ' inb-item-selected' : '';
  var prioMap = { high: 'inb-high', medium: 'inb-medium', low: 'inb-low' };
  var prioCls = prioMap[c.priority] || '';
  var statusLabel = Inbox.STATUS_LABELS[c.status] || c.status;
  var statusCls = c.status === 'encerrada' ? 'inb-closed' : c.status === 'aguardando_estudio' ? 'inb-waiting-studio' : '';
  var origemLabel = Inbox.ORIGEM_LABELS[c.origin] || c.origin;
  var ultima = c.ultimaInteracao ? c.ultimaInteracao.slice(11, 16) + ' ' + c.ultimaInteracao.slice(0, 10) : '—';
  var hasClient = c.clientId ? '\u2713' : '';

  return '<div class="inb-item' + selCls + ' ' + statusCls + '" onclick="App._selectConversa(\'' + c.id + '\')">' +
    '<div class="inb-item-top">' +
      '<span class="inb-item-name">' + this._esc(c.clientName) + '</span>' +
      '<span class="inb-item-time">' + ultima + '</span>' +
      hasClient ? '<span class="inb-item-linked" title="Vinculado a cliente">' + hasClient + '</span>' : '' +
    '</div>' +
    '<div class="inb-item-bottom">' +
      '<span class="inb-item-origin">' + origemLabel + '</span>' +
      '<span class="inb-item-priority ' + prioCls + '">' + (c.priority === 'high' ? 'Alta' : c.priority === 'low' ? 'Baixa' : 'M\u00e9dia') + '</span>' +
      '<span class="inb-item-status">' + statusLabel + '</span>' +
    '</div>' +
  '</div>';
};

App._selectConversa = function(id) {
  this._selectedConversa = id;
  this._renderInboxLayout();
};

App._renderConversaDetail = function(c) {
  var msgs = Inbox.getMensagens(c.id);
  var origemLabel = Inbox.ORIGEM_LABELS[c.origin] || c.origin;
  var statusLabel = Inbox.STATUS_LABELS[c.status] || c.status;
  var isEncerrada = c.status === 'encerrada';
  var clientLink = '';
  var crmInfo = '';
  if (c.clientId) {
    var cl = DB.getClient(c.clientId);
    if (cl) {
      clientLink = '<button class="btn btn-sm" onclick="App.openClientPanel(\'' + c.clientId + '\')" style="color:var(--gold);">' + this._esc(cl.name) + '</button>';
      var crm = CRM.getClientCRM(cl);
      crmInfo = '<div class="inb-crm-info"><strong>Pipeline:</strong> ' + crm.statusLabel + (crm.nextAction ? ' \u2022 <strong>Pr\u00f3ximo:</strong> ' + this._esc(crm.nextAction) : '') + '</div>';
    }
  }

  var msgHtml = msgs.length === 0
    ? '<div class="empty-state" style="padding:20px;">Nenhum registro ainda.</div>'
    : msgs.map(function(m) {
        var typeLabels = { recebida: 'Recebida', enviada: 'Enviada', orcamento: 'Or\u00e7amento', resposta: 'Cliente respondeu', visualizou: 'Cliente visualizou', lembrete: 'Lembrete', encerramento: 'Encerramento' };
        var typeLabel = typeLabels[m.type] || m.type;
        var typeCls = m.type === 'recebida' || m.type === 'resposta' ? 'inb-msg-in' : m.type === 'enviada' || m.type === 'orcamento' ? 'inb-msg-out' : 'inb-msg-sys';
        return '<div class="inb-msg ' + typeCls + '">' +
          '<span class="inb-msg-type">' + typeLabel + '</span>' +
          (m.content ? '<span class="inb-msg-content">' + App._esc(m.content) + '</span>' : '') +
          '<span class="inb-msg-time">' + m.createdAt.slice(11, 16) + ' ' + m.createdAt.slice(0, 10) + '</span>' +
        '</div>';
      }).join('');

  var today = DB._today();

  // Assistente de Atendimento
  var assistente = Inbox.gerarAssistente(c.id);
  var assistenteHtml = '';
  if (assistente) {
    var alertasHtml = assistente.alertas.length > 0
      ? '<div style="margin-top:6px;">' + assistente.alertas.map(function(a) { return '<div class="inb-crm-info" style="margin-top:3px;padding:4px 8px;font-size:0.72rem;"><span style="color:var(--accent-hover);">\u26A0</span> ' + App._esc(a) + '</div>'; }).join('') + '</div>'
      : '';
    var chanceCls = assistente.chanceAgendamento === 'Alta' ? 'color:var(--green);' : assistente.chanceAgendamento === 'Baixa' ? 'color:var(--text-dim);' : 'color:var(--gold);';

    assistenteHtml = '<div class="inb-section" style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:16px;">' +
      '<div class="inb-section-title" style="border:none;padding:0;margin-bottom:8px;">\uD83E\uDD16 Assistente de Atendimento</div>' +
      '<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;">' + App._esc(assistente.resumo) + '</div>' +
      '<div class="form-row" style="gap:8px;flex-wrap:wrap;margin-bottom:4px;">' +
        '<div style="flex:1;min-width:140px;"><span style="font-size:0.65rem;text-transform:uppercase;color:var(--text-dim);">\u00daltima pergunta</span><div style="font-size:0.78rem;">' + App._esc(assistente.ultimaPergunta) + '</div></div>' +
        '<div style="flex:1;min-width:140px;"><span style="font-size:0.65rem;text-transform:uppercase;color:var(--text-dim);">\u00daltima resposta</span><div style="font-size:0.78rem;">' + App._esc(assistente.ultimaResposta) + '</div></div>' +
      '</div>' +
      '<div class="form-row" style="gap:8px;flex-wrap:wrap;margin-bottom:4px;">' +
        '<div><span style="font-size:0.65rem;text-transform:uppercase;color:var(--text-dim);">Espera</span><div style="font-size:0.78rem;">' + assistente.tempoSemResposta + '</div></div>' +
        '<div><span style="font-size:0.65rem;text-transform:uppercase;color:var(--text-dim);">Status</span><div style="font-size:0.78rem;">' + assistente.status + '</div></div>' +
        '<div><span style="font-size:0.65rem;text-transform:uppercase;color:var(--text-dim);">Pr\u00f3xima a\u00e7\u00e3o</span><div style="font-size:0.78rem;font-weight:500;">' + assistente.proximaAcao + '</div></div>' +
        '<div><span style="font-size:0.65rem;text-transform:uppercase;color:var(--text-dim);">Chance agenda.</span><div style="font-size:0.78rem;' + chanceCls + '">' + assistente.chanceAgendamento + '</div></div>' +
      '</div>' +
      alertasHtml +
      '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-light);">' +
        '<div style="font-size:0.68rem;text-transform:uppercase;color:var(--text-dim);margin-bottom:6px;">Respostas r\u00e1pidas</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;">' +
          assistente.respostasRapidas.map(function(r) {
            return '<button class="btn btn-sm" style="font-size:0.68rem;padding:3px 8px;" onclick="App._usarRespostaRapida(\'' + c.id + '\',\'' + App._esc(r.texto) + '\')" title="' + App._esc(r.texto) + '">' + App._esc(r.label) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  return '<div class="inb-detail-wrap">' +
    '<div class="inb-detail-header">' +
      '<div class="inb-detail-title">' + this._esc(c.clientName) + '</div>' +
      '<div class="inb-detail-meta">' + origemLabel + ' \u2022 ' + statusLabel + (c.phone ? ' \u2022 ' + this._esc(c.phone) : '') + '</div>' +
      (clientLink ? '<div style="margin-top:4px;">' + clientLink + '</div>' : '') +
      crmInfo +
    '</div>' +

    assistenteHtml +

    '<div class="inb-section"><div class="inb-section-title">Pr\u00f3xima a\u00e7\u00e3o</div>' +
      '<div class="inb-nextaction">' +
        '<div class="form-group" style="margin-bottom:6px;"><input type="text" id="inbDetailAction" value="' + this._esc(c.nextAction || '') + '" placeholder="Ex: Enviar or\u00e7amento"></div>' +
        '<div class="form-row" style="gap:6px;">' +
          '<div class="form-group" style="margin-bottom:6px;"><input type="date" id="inbDetailDate" value="' + (c.nextDate || '') + '"></div>' +
          '<div class="form-group" style="margin-bottom:6px;"><select id="inbDetailPriority">' +
            '<option value="high"' + (c.priority === 'high' ? ' selected' : '') + '>Alta</option>' +
            '<option value="medium"' + (c.priority === 'medium' || !c.priority ? ' selected' : '') + '>M\u00e9dia</option>' +
            '<option value="low"' + (c.priority === 'low' ? ' selected' : '') + '>Baixa</option>' +
          '</select></div>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:6px;"><input type="text" id="inbDetailNote" value="' + this._esc(c.note || '') + '" placeholder="Observa\u00e7\u00e3o r\u00e1pida"></div>' +
        '<div class="flex gap-8" style="flex-wrap:wrap;">' +
          '<button class="btn btn-primary btn-sm" onclick="App._saveInboxNextAction()">Salvar</button>' +
          '<button class="btn btn-sm" onclick="App._addMensagemRapida(\'enviada\')">Enviar msgs</button>' +
          '<button class="btn btn-sm" onclick="App._addMensagemRapida(\'recebida\')">Recebi resposta</button>' +
          '<button class="btn btn-sm" onclick="App._addMensagemRapida(\'orcamento\')">Or\u00e7amento</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="inb-section"><div class="inb-section-title">Timeline</div>' +
      '<div class="inb-msg-list">' + msgHtml + '</div>' +
    '</div>' +

    '<div class="inb-section"><div class="inb-section-title">A\u00e7\u00f5es</div>' +
      '<div class="flex gap-8" style="flex-wrap:wrap;">' +
        (c.clientId
          ? '<button class="btn btn-sm" onclick="App.openClientPanel(\'' + c.clientId + '\')">Ver cliente</button>'
          : '<button class="btn btn-sm" onclick="App._linkInboxClient(\'' + c.id + '\')">Vincular cliente</button>') +
        (!c.clientId ? '<button class="btn btn-sm" onclick="App._createClientFromInbox(\'' + c.id + '\')">Criar cliente</button>' : '') +
        '<button class="btn btn-sm" onclick="App.navigate(\'agenda\')">Abrir agenda</button>' +
        '<button class="btn btn-sm" onclick="App._createLembreteFromInbox(\'' + c.id + '\')">Criar lembrete</button>' +
        (!isEncerrada ? '<button class="btn btn-sm btn-danger" onclick="App._closeInboxConversa(\'' + c.id + '\')">Encerrar</button>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
};

App._showNewConversa = function() {
  var self = this;
  this._showOverlay('Nova conversa', '<div class="form-group"><label>Nome</label><input type="text" id="inboxNewName" placeholder="Nome do cliente"></div><div class="form-row"><div class="form-group"><label>Telefone</label><input type="text" id="inboxNewPhone" placeholder="(71) 9..."></div><div class="form-group"><label>Origem</label><select id="inboxNewOrigin">' + Inbox.ORIGENS.map(function(o) { return '<option value="' + o + '">' + Inbox.ORIGEM_LABELS[o] + '</option>'; }).join('') + '</select></div></div><div class="form-group"><label>Observa\u00e7\u00e3o</label><textarea id="inboxNewNote" rows="2"></textarea></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmNewConversa()">Criar</button></div>');
};

App._confirmNewConversa = function() {
  var name = document.getElementById('inboxNewName').value.trim();
  if (!name) { App._toast('Nome \u00e9 obrigat\u00f3rio.', 'warning'); return; }
  Inbox.create({
    clientName: name,
    phone: document.getElementById('inboxNewPhone').value.trim(),
    origin: document.getElementById('inboxNewOrigin').value,
    note: document.getElementById('inboxNewNote').value.trim()
  });
  App._closeOverlay();
  App._toast('Conversa criada.', 'success');
  this._inboxFilter = 'todas';
  this._inboxSearch = '';
  this._selectedConversa = null;
  this._renderInboxLayout();
};

App._saveInboxNextAction = function() {
  var id = this._selectedConversa;
  if (!id) return;
  var action = document.getElementById('inbDetailAction').value.trim();
  var date = document.getElementById('inbDetailDate').value;
  var priority = document.getElementById('inbDetailPriority').value;
  var note = document.getElementById('inbDetailNote').value.trim();
  Inbox.update(id, { nextAction: action, nextDate: date, priority: priority, note: note });
  var c = Inbox.get(id);
  if (c && c.clientId) {
    CRM.setNextAction(c.clientId, action, date, priority, note);
  }
  App._toast('Pr\u00f3xima a\u00e7\u00e3o salva.', 'success');
  this._renderInboxLayout();
  App.refreshHoje();
};

App._addMensagemRapida = function(type) {
  var id = this._selectedConversa;
  if (!id) return;
  var content = prompt(type === 'orcamento' ? 'Valor do or\u00e7amento:' : type === 'enviada' ? 'Mensagem enviada:' : 'Resposta recebida:');
  if (content === null) return;
  Inbox.addMensagem(id, type, content);
  App._toast('Registrado.', 'success');
  this._renderInboxLayout();
  App.refreshHoje();
};

App._linkInboxClient = function(conversaId) {
  var c = Inbox.get(conversaId);
  if (!c) return;
  var clientes = DB.getClients();
  var html = '<div class="form-group"><label>Selecionar cliente</label><select id="inboxLinkClient">';
  clientes.forEach(function(cl) {
    html += '<option value="' + cl.id + '">' + App._esc(cl.name) + (cl.phone ? ' (' + App._esc(cl.phone) + ')' : '') + '</option>';
  });
  html += '</select></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmLinkInboxClient(\'' + conversaId + '\')">Vincular</button></div>';
  this._showOverlay('Vincular cliente', html);
};

App._confirmLinkInboxClient = function(conversaId) {
  var clientId = document.getElementById('inboxLinkClient').value;
  if (!clientId) return;
  Inbox.linkClient(conversaId, clientId);
  App._closeOverlay();
  App._toast('Cliente vinculado.', 'success');
  this._renderInboxLayout();
  App.refreshHoje();
};

App._createClientFromInbox = function(conversaId) {
  var c = Inbox.get(conversaId);
  if (!c) return;
  this._showOverlay('Criar cliente', '<div class="form-group"><label>Nome</label><input type="text" id="inboxCreateName" value="' + this._esc(c.clientName) + '"></div><div class="form-group"><label>Telefone</label><input type="text" id="inboxCreatePhone" value="' + this._esc(c.phone || '') + '"></div><div class="form-group"><label>Instagram</label><input type="text" id="inboxCreateInsta" placeholder="@cliente"></div><div class="form-group"><label>Interesse</label><select id="inboxCreateInterest">' + this._serviceOptions() + '</select></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmCreateClientFromInbox(\'' + conversaId + '\')">Criar</button></div>');
};

App._confirmCreateClientFromInbox = function(conversaId) {
  var name = document.getElementById('inboxCreateName').value.trim();
  if (!name) return;
  var cl = Repos.clientes.create({
    name: name,
    phone: document.getElementById('inboxCreatePhone').value.trim(),
    instagram: document.getElementById('inboxCreateInsta').value.trim(),
    interest: document.getElementById('inboxCreateInterest').value
  });
  Events.emit('crm.cliente_criado', { clientId: cl.id });
  Inbox.linkClient(conversaId, cl.id);
  App._closeOverlay();
  App._toast('Cliente criado e vinculado.', 'success');
  this._renderInboxLayout();
  App.refreshHoje();
};

App._createLembreteFromInbox = function(conversaId) {
  var c = Inbox.get(conversaId);
  if (!c) return;
  this._showOverlay('Criar lembrete', '<div class="form-group"><label>T\u00edtulo</label><input type="text" id="inboxLemTitle" value="' + this._esc(c.clientName) + '"></div><div class="form-group"><label>Descri\u00e7\u00e3o</label><textarea id="inboxLemDesc" rows="2">' + (c.nextAction ? 'Pr\u00f3xima a\u00e7\u00e3o: ' + this._esc(c.nextAction) : '') + '</textarea></div><div class="form-row"><div class="form-group"><label>Data</label><input type="date" id="inboxLemDate" value="' + (c.nextDate || DB._today()) + '"></div><div class="form-group"><label>Prioridade</label><select id="inboxLemPriority"><option value="high"' + (c.priority === 'high' ? ' selected' : '') + '>Alta</option><option value="medium"' + (c.priority !== 'high' ? ' selected' : '') + '>M\u00e9dia</option><option value="low">Baixa</option></select></div></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmLembreteFromInbox(\'' + conversaId + '\')">Criar</button></div>');
};

App._confirmLembreteFromInbox = function(conversaId) {
  var c = Inbox.get(conversaId);
  DB.addLembrete({
    title: document.getElementById('inboxLemTitle').value.trim() || (c ? c.clientName : 'Lembrete'),
    description: document.getElementById('inboxLemDesc').value.trim(),
    date: document.getElementById('inboxLemDate').value || DB._today(),
    priority: document.getElementById('inboxLemPriority').value,
    clientId: c ? c.clientId : null,
    clientName: c ? c.clientName : ''
  });
  Inbox.addMensagem(conversaId, 'lembrete', 'Lembrete criado.');
  App._closeOverlay();
  App._toast('Lembrete criado.', 'success');
  this._renderInboxLayout();
  App.refreshHoje();
};

App._closeInboxConversa = function(conversaId) {
  App._confirm('Encerrar esta conversa?', function() {
    Inbox.close(conversaId);
    App._toast('Conversa encerrada.', 'info');
    App._selectedConversa = null;
    App._renderInboxLayout();
    App.refreshHoje();
  });
};
