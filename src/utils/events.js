const Events = {
  _listeners: {},

  on(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
    return () => this.off(event, handler);
  },

  off(event, handler) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(h => h !== handler);
  },

  emit(event, data) {
    const handlers = this._listeners[event] || [];
    for (const handler of handlers) {
      try { handler(data); }
      catch (err) {
        try { Audit.action('event_error', 'system', event, 'Erro no handler: ' + err.message); } catch {}
      }
    }
  },

  clear(event) {
    if (event) delete this._listeners[event];
    else this._listeners = {};
  },
};

// ─── Inicialização dos listeners do sistema ───
Events._initListeners = function() {

  // Atendimento concluído → registrar lançamento financeiro + CRM
  this.on('atendimento.finished', function(data) {
    if (!data.value || data.value <= 0) return;
    const desc = data.type === 'agenda'
      ? 'Atendimento: ' + (data.clientName || '')
      : 'Avulso: ' + (data.clientName || '');
    var entry = Finance.autoRegister('entrada', 'atendimento', desc, data.value, '', data.id);
    if (entry && data.clientId) Events.emit('crm.pagamento', { clientId: data.clientId, value: data.value, refId: entry.id });
  });

  // Venda concluída → registrar lançamento financeiro
  this.on('venda.completed', function(data) {
    if (!data.total || data.total <= 0) return;
    Finance.autoRegister('entrada', 'venda', 'Venda de produtos', data.total, '', data.id);
  });

  // Backup restaurado → forçar recarga geral (via toast, a UI recarrega no callback)
  this.on('backup.restored', function() {
    App._toast('Backup restaurado. Recarregando dados...', 'info');
  });

  // ─── CRM: Automações do pipeline ───
  this.on('crm.cliente_criado', function(data) {
    if (data.clientId) CRM.autoUpdate(data.clientId, 'cliente_criado');
  });
  this.on('crm.atendimento_iniciado', function(data) {
    if (data.clientId) CRM.autoUpdate(data.clientId, 'atendimento_iniciado');
  });
  this.on('crm.atendimento_concluido', function(data) {
    if (data.clientId) CRM.autoUpdate(data.clientId, 'atendimento_concluido');
    if (data.clientId) CRM.addTimeline(data.clientId, 'atendimento_concluido', 'Atendimento conclu\u00eddo', data.refId);
  });
  this.on('crm.agendamento_criado', function(data) {
    if (data.clientId) CRM.autoUpdate(data.clientId, 'agendamento_criado');
    if (data.clientId) CRM.addTimeline(data.clientId, 'agendamento', 'Agendamento criado para ' + (data.service || ''), data.refId);
  });
  this.on('crm.os_criada', function(data) {
    if (data.clientId) CRM.autoUpdate(data.clientId, 'os_criada');
    if (data.clientId) CRM.addTimeline(data.clientId, 'os_criada', 'Ordem de Servi\u00e7o gerada', data.refId);
  });
  this.on('crm.termo_assinado', function(data) {
    if (data.clientId) CRM.addTimeline(data.clientId, 'termo_assinado', 'Termo de consentimento assinado', data.refId);
  });
  this.on('crm.pagamento', function(data) {
    if (data.clientId) CRM.autoUpdate(data.clientId, 'pagamento');
    if (data.clientId) CRM.addTimeline(data.clientId, 'pagamento', 'Pagamento registrado: R$ ' + (data.value || '0'), data.refId);
  });
};

// Auto-init
Events._initListeners();
