const Executor = {
  // Registro de ações por tipo
  _actions: {},

  // Registrar uma nova ação
  registrar: function(tipo, fn) {
    this._actions[tipo] = fn;
  },

  // Executar uma ação pelo tipo + payload
  executar: function(tipo, payload) {
    if (this._actions[tipo]) {
      return this._actions[tipo](payload);
    }
    // Fallback: tentar navegação direta
    if (payload && payload.navigate) {
      App.navigate(payload.navigate);
    }
  },

  // Montar onclick handler para uso em templates HTML
  onClick: function(tipo, payload) {
    var json = JSON.stringify(payload || {}).replace(/'/g, "\\'");
    return "Executor.executar('" + tipo + "', " + json + ")";
  }
};

// ─── Registro das ações padrão ───
Executor.registrar('whatsapp', function(p) {
  if (p && p.conversaId) { App._selectConversa(p.conversaId); App.navigate('inbox'); }
  else { App.navigate('inbox'); }
});

Executor.registrar('confirmacao', function(p) {
  if (p && p.appointmentId) { App.navigate('confirmacao'); }
  else { App.navigate('confirmacao'); }
});

Executor.registrar('pre_agendamento', function(p) {
  if (p && p.conversaId) { App._selectConversa(p.conversaId); App.navigate('inbox'); }
  else { App.navigate('inbox'); }
});

Executor.registrar('crm', function(p) {
  if (p && p.clientId) { App.openClientPanel(p.clientId); }
  else { App.navigate('clientes'); }
});

Executor.registrar('agenda', function(p) {
  if (p && p.appointmentId) { App.navigate('agenda'); }
  else { App.navigate('agenda'); }
});

Executor.registrar('financeiro', function(p) {
  App.navigate('financeiro');
});

Executor.registrar('posatendimento', function(p) {
  if (p && p.clientId) { App.openClientPanel(p.clientId); }
  else { App.navigate('clientes'); }
});

Executor.registrar('notificacao', function(p) {
  App.openNotifPanel();
});

Executor.registrar('oportunidade', function(p) {
  if (p && p.target) { App.navigate(p.target); }
  else { App.navigate('oportunidades'); }
});

Executor.registrar('marketing', function(p) {
  App.navigate('marketing');
});

Executor.registrar('studio', function(p) {
  App.navigate('studio');
});

Executor.registrar('aihub', function(p) {
  App.navigate('aihub');
});
