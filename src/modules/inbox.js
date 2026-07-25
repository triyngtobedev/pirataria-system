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
  // Enviar via WhatsApp se configurado
  var wppStatus = WhatsApp.getStatus();
  if (wppStatus.configured && wppStatus.connected) {
    WhatsApp.sendFromInbox(conversaId, texto).then(function() {
      App._toast('Resposta enviada pelo WhatsApp.', 'success');
      App._renderInboxLayout();
      App.refreshHoje();
    }).catch(function(err) {
      App._toast('Resposta registrada, mas falha ao enviar WhatsApp: ' + (err.message || ''), 'warning');
      App._renderInboxLayout();
    });
  } else {
    App._toast('Resposta r\u00e1pida registrada.', 'success');
    this._renderInboxLayout();
    App.refreshHoje();
  }
};

App._renderConversaItem = function(c, selected) {
  // Usar WhatsApp collect se disponível para dados mais ricos
  var w = null;
  if (typeof Inbox.collectWhatsApp === 'function') {
    var wList = Inbox.collectWhatsApp();
    for (var i = 0; i < wList.length; i++) { if (wList[i].id === c.id) { w = wList[i]; break; } }
  }

  var selCls = selected ? ' inb-item-selected' : '';
  var prioMap = { high: 'inb-high', medium: 'inb-medium', low: 'inb-low' };
  var prioCls = prioMap[c.priority] || '';

  var motivo = w ? w.motivoLabel : '';
  var tempoLabel = w ? w.tempoLabel : (c.ultimaInteracao ? c.ultimaInteracao.slice(11, 16) + ' ' + c.ultimaInteracao.slice(0, 10) : '—');
  var quemEnviou = w ? (w.ultimaMsgTipo === 'cliente' ? '\u2190 Cliente' : '\u2192 Est\u00fadio') : '';
  var urgCls = w && w.prioridade <= 1 ? ' inb-waiting-studio' : (c.status === 'encerrada' ? ' inb-closed' : '');
  var statusLabel = Inbox.STATUS_LABELS[c.status] || c.status;

  return '<div class="inb-item' + selCls + urgCls + '" onclick="App._selectConversa(\'' + c.id + '\')">' +
    '<div class="inb-item-top">' +
      '<span class="inb-item-name">' + this._esc(c.clientName) + '</span>' +
      (c.clientId ? '<span class="inb-item-linked" title="Vinculado">\u2713</span>' : '') +
      '<span class="inb-item-time">' + tempoLabel + '</span>' +
    '</div>' +
    '<div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:2px;">' +
      (motivo ? '<span class="badge badge-scheduled" style="font-size:0.55rem;">' + motivo + '</span> ' : '') +
      quemEnviou +
    '</div>' +
    '<div class="inb-item-bottom">' +
      '<span class="inb-item-origin">' + (Inbox.ORIGEM_LABELS[c.origin] || c.origin) + '</span>' +
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

  // WhatsApp connection status
  var wppStatus = WhatsApp.getStatus();
  var wppInfo = '';
  if (c.origin === 'whatsapp' || (c.phone && wppStatus.configured)) {
    wppInfo = '<div class="inb-crm-info" style="margin-top:4px;">' +
      (wppStatus.connected ? '<span style="color:var(--green);">\u2713 WhatsApp conectado</span>' : '<span style="color:var(--accent-hover);">\u26A0 WhatsApp desconectado</span>') +
      (wppStatus.ultimaSincronizacao ? ' \u2022 Sinc: ' + new Date(wppStatus.ultimaSincronizacao).toLocaleString('pt-BR') : '') +
    '</div>';
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

    // Assistente de Agendamento (quando detecta intenção)
    if (assistente.intencaoAgendamento) {
      var hoje = DB._today();
      var horariosHtml = assistente.sugestaoHorarios.length > 0
        ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">' +
          assistente.sugestaoHorarios.slice(0, 8).map(function(h) {
            return '<button class="btn btn-sm" style="font-size:0.72rem;" onclick="App._agendarPeloAssistente(\'' + c.id + '\',\'' + h.hora + '\',\'' + hoje + '\')">' + h.hora + '</button>';
          }).join('') +
        '</div>'
        : '<div style="color:var(--accent-hover);font-size:0.78rem;margin-top:4px;">Nenhum hor\u00e1rio dispon\u00edvel hoje.</div>';

      assistenteHtml += '<div class="inb-section" style="background:var(--surface);border:2px solid var(--gold-dim);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;margin-top:-8px;">' +
        '<div style="font-size:0.82rem;font-weight:500;margin-bottom:6px;">\uD83D\uDCC5 Assistente de Agendamento</div>' +
        '<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px;">Cliente demonstrou interesse em agendar. Hor\u00e1rios dispon\u00edveis hoje:</div>' +
        horariosHtml +
        (assistente.sugestaoMelhorHorario ? '<div style="font-size:0.72rem;color:var(--gold);margin-top:6px;">Melhor hor\u00e1rio: <strong>' + assistente.sugestaoMelhorHorario.hora + '</strong></div>' : '') +
        '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-light);display:flex;flex-wrap:wrap;gap:4px;">' +
          '<button class="btn btn-sm" onclick="App._agendarPeloAssistente(\'' + c.id + '\',\'\',\'' + hoje + '\')" style="color:var(--green);">Criar agendamento</button>' +
          '<button class="btn btn-sm" onclick="App.navigate(\'agenda\')">Ver agenda completa</button>' +
        '</div>' +
      '</div>';
    }
  }

  return '<div class="inb-detail-wrap">' +
    '<div class="inb-detail-header">' +
      '<div class="inb-detail-title">' + this._esc(c.clientName) + '</div>' +
      '<div class="inb-detail-meta">' + origemLabel + ' \u2022 ' + statusLabel + (c.phone ? ' \u2022 ' + this._esc(c.phone) : '') + '</div>' +
      (clientLink ? '<div style="margin-top:4px;">' + clientLink + '</div>' : '') +
      crmInfo +
      wppInfo +
    '</div>' +

    assistenteHtml +

    // Modo Operação Assistida
    (function() {
      if (isEncerrada) return '';
      var draftAtual = Inbox.getDraft(c.id);
      var sugestao = Inbox.sugerirResposta(c.id);
      var temDraft = !!draftAtual;
      var temSugestao = !!sugestao && !temDraft;

      // Se tem sugestão e não tem draft, criar draft automaticamente
      if (temSugestao) {
        Inbox.setDraft(c.id, sugestao);
        Inbox.logSugestao(c.id, 'sugerida', sugestao);
        draftAtual = sugestao;
        temDraft = true;
      }

      if (!temDraft) return '';

      var statusLabel = c.draftStatus === 'enviada' ? 'Enviada' : c.draftStatus === 'descartada' ? 'Descartada' : 'Rascunho';
      var statusCls = c.draftStatus === 'enviada' ? 'badge-completed' : c.draftStatus === 'descartada' ? 'badge-cancelled' : 'badge-progress';

      return '<div class="inb-section" style="background:var(--surface);border:2px solid var(--color-accent);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
          '<span style="font-size:0.82rem;font-weight:500;">\uD83E\uDD16 Assistente \u2014 Resposta sugerida</span>' +
          '<span class="badge ' + statusCls + '" style="font-size:0.6rem;">' + statusLabel + '</span>' +
        '</div>' +
        '<textarea id="assistedDraftText" rows="3" style="width:100%;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:8px 10px;color:var(--color-text);font-size:var(--font-size-md);font-family:var(--font);resize:vertical;">' + App._esc(draftAtual) + '</textarea>' +
        '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">' +
          '<button class="btn btn-primary btn-sm" onclick="App._sendAssistedDraft(\'' + c.id + '\')">Enviar</button>' +
          '<button class="btn btn-sm" onclick="App._editAssistedDraft(\'' + c.id + '\')">Editar</button>' +
          '<button class="btn btn-sm" onclick="App._discardAssistedDraft(\'' + c.id + '\')">Descartar</button>' +
        '</div>' +
      '</div>';
    })() +

    // Timeline do fluxo de agendamento
    (AgendamentoAssistente.getEstadoFluxo(c.id) > 0
      ? '<div class="inb-section" style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:16px;">' +
        '<div class="inb-section-title" style="border:none;padding:0;margin-bottom:6px;">\uD83D\uDCC5 Fluxo de Agendamento</div>' +
        '<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;">Etapa atual: <strong>' + AgendamentoAssistente.getEstadoLabel(AgendamentoAssistente.getEstadoFluxo(c.id)) + '</strong></div>' +
        AgendamentoAssistente.getTimelineHtml(c.id) +
        '<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border-light);display:flex;flex-wrap:wrap;gap:4px;">' +
          '<button class="btn btn-sm" style="font-size:0.68rem;" onclick="App.navigate(\'agenda\')">Ver na agenda</button>' +
        '</div>' +
      '</div>'
      : '') +

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

// ─── Modo Operação Assistida ───
App._sendAssistedDraft = function(conversaId) {
  var texto = document.getElementById('assistedDraftText');
  if (!texto || !texto.value.trim()) { App._toast('Texto vazio.', 'warning'); return; }
  var msg = texto.value.trim();
  Inbox.addMensagem(conversaId, 'enviada', msg);
  Inbox.clearDraft(conversaId);
  Inbox.logSugestao(conversaId, 'enviada', msg);
  // Enviar via WhatsApp se configurado
  var wppStatus = WhatsApp.getStatus();
  if (wppStatus.configured && wppStatus.connected) {
    WhatsApp.sendFromInbox(conversaId, msg).then(function() {
      App._toast('Resposta enviada pelo WhatsApp.', 'success');
      App._renderInboxLayout();
      App.refreshHoje();
    }).catch(function(err) {
      App._toast('Registrada, mas falha ao enviar WhatsApp.', 'warning');
      App._renderInboxLayout();
    });
  } else {
    App._toast('Resposta registrada.', 'success');
    this._renderInboxLayout();
    App.refreshHoje();
  }
};

App._editAssistedDraft = function(conversaId) {
  var texto = document.getElementById('assistedDraftText');
  if (!texto) return;
  Inbox.setDraft(conversaId, texto.value);
  Inbox.logSugestao(conversaId, 'editada', texto.value);
  App._toast('Rascunho atualizado.', 'success');
};

App._discardAssistedDraft = function(conversaId) {
  Inbox.clearDraft(conversaId);
  Inbox.logSugestao(conversaId, 'descartada', '');
  App._toast('Sugest\u00e3o descartada.', 'info');
  this._renderInboxLayout();
  App.refreshHoje();
};

App._agendarPeloAssistente = function(conversaId, horario, data) {
  var c = Inbox.get(conversaId);
  if (!c) return;
  if (!horario) {
    var horarios = AgendamentoAssistente.getHorariosDisponiveis(data, c.professional || '');
    if (horarios.length === 0) { App._toast('Nenhum hor\u00e1rio dispon\u00edvel.', 'warning'); return; }
    horario = horarios[0].hora;
  }
  var a = AgendamentoAssistente.criarAgendamento(data, horario, c.clientName, c.clientId, '', c.professional || '', conversaId);
  if (a) {
    App._toast('Agendamento criado: ' + data + ' \u00e0s ' + horario, 'success');
    this._renderInboxLayout();
    App.refreshHoje();
  }
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
