const EventTimeline = {
  KEY: 'pirataria_event_timeline',
  MAX: 1000,

  _load: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch(e) { return []; }
  },

  _save: function(events) {
    if (events.length > this.MAX) events = events.slice(events.length - this.MAX);
    localStorage.setItem(this.KEY, JSON.stringify(events));
  },

  add: function(evento, payload, modulo, entidade) {
    var events = this._load();
    events.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      timestamp: DB._now(),
      evento: evento,
      modulo: modulo || EventTimeline._detectModule(evento),
      entidade: entidade || '',
      payload: EventTimeline._resumir(payload),
      usuario: ''
    });
    this._save(events);
  },

  list: function(filtros) {
    var events = this._load();
    if (filtros) {
      if (filtros.modulo) events = events.filter(function(e) { return e.modulo === filtros.modulo; });
      if (filtros.evento) events = events.filter(function(e) { return e.evento === filtros.evento; });
      if (filtros.entidade) events = events.filter(function(e) { return e.entidade && e.entidade.indexOf(filtros.entidade) >= 0; });
      if (filtros.desde) events = events.filter(function(e) { return e.timestamp >= filtros.desde; });
      if (filtros.ate) events = events.filter(function(e) { return e.timestamp <= filtros.ate; });
    }
    return events.reverse();
  },

  last: function(n) {
    return this._load().reverse().slice(0, n || 10);
  },

  clear: function() {
    localStorage.removeItem(this.KEY);
  },

  export: function() {
    return JSON.stringify(this._load(), null, 2);
  },

  _detectModule: function(evento) {
    if (evento.indexOf('agenda') >= 0) return 'agenda';
    if (evento.indexOf('whatsapp') >= 0) return 'whatsapp';
    if (evento.indexOf('crm') >= 0) return 'crm';
    if (evento.indexOf('finance') >= 0) return 'financeiro';
    if (evento.indexOf('marketing') >= 0) return 'marketing';
    if (evento.indexOf('notification') >= 0) return 'notificacao';
    if (evento.indexOf('meudia') >= 0) return 'meudia';
    if (evento.indexOf('copiloto') >= 0) return 'copiloto';
    if (evento.indexOf('recommendation') >= 0) return 'ia';
    return 'sistema';
  },

  _resumir: function(payload) {
    if (!payload) return {};
    var p = {};
    try {
      if (payload.clientName) p.cliente = payload.clientName;
      if (payload.clientId) p.clientId = payload.clientId;
      if (payload.service) p.servico = payload.service;
      if (payload.value) p.valor = payload.value;
      if (payload.id) p.refId = payload.id;
      if (payload.status) p.status = payload.status;
    } catch(e) {}
    return p;
  }
};

// Auto-registrar listener para todos os eventos do EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  var eventos = [
    'meudia.updated', 'copiloto.updated', 'recommendation.updated',
    'agenda.created', 'agenda.updated', 'agenda.cancelled', 'agenda.confirmed',
    'whatsapp.message.received', 'whatsapp.message.sent',
    'crm.updated', 'finance.payment.received',
    'marketing.post.completed', 'notification.created'
  ];
  eventos.forEach(function(evt) {
    EventBus.on(evt, function(payload) {
      EventTimeline.add(evt, payload);
    });
  });
})();
