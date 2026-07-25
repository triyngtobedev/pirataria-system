const Orcamento = {
  STATUS: ['rascunho', 'enviado', 'visualizado', 'em_negociacao', 'aprovado', 'recusado', 'expirado'],
  STATUS_LABELS: { rascunho: 'Rascunho', enviado: 'Enviado', visualizado: 'Visualizado', em_negociacao: 'Em Negocia\u00e7\u00e3o', aprovado: 'Aprovado', recusado: 'Recusado', expirado: 'Expirado' },

  STATUS_ORDER: { rascunho: 0, enviado: 1, visualizado: 2, em_negociacao: 3, aprovado: 4, recusado: 5, expirado: 6 },

  create(data) { return DB.addOrcamento(data); },

  get(id) { return DB.getOrcamento(id); },

  list(filter) {
    var todos = DB.getOrcamentos();
    if (!filter || filter === 'todos') return todos;
    return todos.filter(function(o) { return o.status === filter; });
  },

  update(id, data) { return DB.updateOrcamento(id, data); },

  setStatus(id, status) {
    var o = DB.getOrcamento(id);
    if (!o) return null;
    if (o.status === status) return o;
    if (o.status === 'recusado' || o.status === 'expirado') return o;
    DB.updateOrcamento(id, { status: status });
    var updated = DB.getOrcamento(id);
    Orcamento._onStatusChange(updated, status);
    return updated;
  },

  _onStatusChange: function(o, newStatus) {
    var today = DB._today();

    if (o.clientId) {
      CRM.addTimeline(o.clientId, 'orcamento_' + newStatus, 'Or\u00e7amento #' + o.numero + ' ' + Orcamento.STATUS_LABELS[newStatus] + ' — ' + (o.procedimentos || ''), o.id);

      switch (newStatus) {
        case 'enviado':
          CRM.setNextAction(o.clientId, 'Aguardar resposta do or\u00e7amento', today, 'high', 'Or\u00e7amento #' + o.numero + ' enviado');
          break;
        case 'aprovado':
          CRM.setStatus(o.clientId, 'agendado');
          CRM.setNextAction(o.clientId, 'Criar agendamento', today, 'high', 'Or\u00e7amento #' + o.numero + ' aprovado');
          break;
        case 'recusado':
          CRM.setStatus(o.clientId, 'perdido');
          CRM.clearNextAction(o.clientId);
          break;
      }
    }

    if (o.conversationId) {
      var tipoMsg = { enviado: 'enviada', aprovado: 'enviada', recusado: 'recebida', expirado: 'recebida', visualizado: 'recebida', em_negociacao: 'recebida' };
      var msg = 'Or\u00e7amento #' + o.numero + ' ' + Orcamento.STATUS_LABELS[newStatus];
      Inbox.addMensagem(o.conversationId, tipoMsg[newStatus] || 'recebida', msg);

      if (newStatus === 'aprovado') {
        DB.updateConversa(o.conversationId, { status: 'aguardando_estudio' });
      }
    }

    Events.emit('orcamento.status_changed', { orcamentoId: o.id, clientId: o.clientId, status: newStatus, numero: o.numero });
  },

  getMetrics: function() {
    var todos = DB.getOrcamentos();
    var criados = todos.length;
    var enviados = todos.filter(function(o) { return o.status === 'enviado'; }).length;
    var aprovados = todos.filter(function(o) { return o.status === 'aprovado'; }).length;
    var recusados = todos.filter(function(o) { return o.status === 'recusado'; }).length;
    var conv = criados > 0 ? Math.round(aprovados / criados * 100) : 0;
    var valorPotencial = todos.reduce(function(s, o) { return s + (parseFloat(o.valorFinal) || 0); }, 0);
    var valorConvertido = todos.filter(function(o) { return o.status === 'aprovado'; }).reduce(function(s, o) { return s + (parseFloat(o.valorFinal) || 0); }, 0);
    return { criados: criados, enviados: enviados, aprovados: aprovados, recusados: recusados, conversao: conv, valorPotencial: valorPotencial, valorConvertido: valorConvertido };
  },

  collectHoje: function() {
    var today = DB._today();
    var todos = DB.getOrcamentos();
    var results = [];
    var seteDias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    for (var i = 0; i < todos.length; i++) {
      var o = todos[i];
      if (o.status === 'rascunho' || o.status === 'recusado' || o.status === 'expirado') continue;
      if (o.status === 'aprovado') {
        var hasAppointment = DB.getAppointments().some(function(a) { return a.clientId === o.clientId && a.date >= today; });
        if (hasAppointment) continue;
      }
      var isExpiring = o.validade && o.validade <= seteDias && o.validade >= today;
      var isExpired = o.validade && o.validade < today;
      var isWaiting = o.status === 'enviado' || o.status === 'visualizado' || o.status === 'em_negociacao';
      var icon = isExpired ? '\u26A0' : isExpiring ? '\u23F0' : '\u2605';
      var badge = isExpired ? 'Expirado' : isExpiring ? 'Vencendo' : null;
      var badgeType = isExpired ? 'danger' : isExpiring ? 'warning' : null;
      var prio = isExpired ? 0 : isExpiring ? 1 : (o.status === 'aprovado' ? 2 : 3);
      var desc = Orcamento.STATUS_LABELS[o.status] + ' — R$ ' + (o.valorFinal || '0');
      if (o.procedimentos) desc += ' (' + o.procedimentos + ')';

      results.push({
        clientName: o.nomeCliente,
        clientId: o.clientId || null,
        orcamentoId: o.id,
        numero: o.numero,
        action: isExpired ? 'Or\u00e7amento expirado' : isExpiring ? 'Or\u00e7amento vencendo' : isWaiting ? 'Aguardando resposta' : 'Criar agendamento',
        desc: desc,
        icon: icon,
        badge: badge,
        badgeType: badgeType,
        prioridade: prio,
        _ordem: prio * 100 + (isExpired || isExpiring ? 0 : (o.status === 'aprovado' ? 10 : 20))
      });
    }

    results.sort(function(a, b) { return a._ordem - b._ordem; });
    return results;
  }
};
