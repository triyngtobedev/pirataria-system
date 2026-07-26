const EventBus = {
  _listeners: {},

  on: function(evento, callback) {
    if (!this._listeners[evento]) this._listeners[evento] = [];
    this._listeners[evento].push(callback);
    return function() { EventBus.off(evento, callback); };
  },

  off: function(evento, callback) {
    if (!this._listeners[evento]) return;
    this._listeners[evento] = this._listeners[evento].filter(function(h) { return h !== callback; });
  },

  emit: function(evento, payload) {
    var handlers = this._listeners[evento] || [];
    for (var i = 0; i < handlers.length; i++) {
      try { handlers[i](payload || {}); } catch (err) {
        try { Audit.action('event_error', 'eventbus', evento, 'Erro no handler: ' + err.message); } catch(e) {}
      }
    }
  },

  once: function(evento, callback) {
    var wrapper = function(payload) {
      EventBus.off(evento, wrapper);
      callback(payload);
    };
    this.on(evento, wrapper);
  }
};

// ─── Registro dos listeners padrão ───
(function() {
  // meudia.updated → refreshHoje
  EventBus.on('meudia.updated', function() {
    if (typeof App !== 'undefined' && App.refreshHoje) App.refreshHoje();
  });

  // copiloto.updated → refreshHoje
  EventBus.on('copiloto.updated', function() {
    if (typeof App !== 'undefined' && App.refreshHoje) App.refreshHoje();
  });

  // recommendation.updated → refreshHoje
  EventBus.on('recommendation.updated', function() {
    if (typeof App !== 'undefined' && App.refreshHoje) App.refreshHoje();
  });

  // agenda.created/updated/cancelled/confirmed → meudia.updated
  EventBus.on('agenda.created', function() { EventBus.emit('meudia.updated'); });
  EventBus.on('agenda.updated', function() { EventBus.emit('meudia.updated'); });
  EventBus.on('agenda.cancelled', function() { EventBus.emit('meudia.updated'); });
  EventBus.on('agenda.confirmed', function() { EventBus.emit('meudia.updated'); });

  // whatsapp.message.received/sent → meudia.updated
  EventBus.on('whatsapp.message.received', function() { EventBus.emit('meudia.updated'); });
  EventBus.on('whatsapp.message.sent', function() { EventBus.emit('meudia.updated'); });

  // crm.updated → meudia.updated
  EventBus.on('crm.updated', function() { EventBus.emit('meudia.updated'); });

  // finance.payment.received → meudia.updated
  EventBus.on('finance.payment.received', function() { EventBus.emit('meudia.updated'); });

  // marketing.post.completed → meudia.updated
  EventBus.on('marketing.post.completed', function() { EventBus.emit('meudia.updated'); });

  // notification.created → meudia.updated
  EventBus.on('notification.created', function() { EventBus.emit('meudia.updated'); });
})();
