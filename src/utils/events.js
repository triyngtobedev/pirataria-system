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

  // Atendimento concluído → registrar lançamento financeiro
  this.on('atendimento.finished', function(data) {
    if (!data.value || data.value <= 0) return;
    const desc = data.type === 'agenda'
      ? 'Atendimento: ' + (data.clientName || '')
      : 'Avulso: ' + (data.clientName || '');
    Finance.autoRegister('entrada', 'atendimento', desc, data.value, '', data.id);
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
};

// Auto-init
Events._initListeners();
