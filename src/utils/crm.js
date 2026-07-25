const CRM = {
  STATUS: {
    NOVO_CONTATO: 'novo_contato',
    EM_ATENDIMENTO: 'em_atendimento',
    ORCAMENTO_ENVIADO: 'orcamento_enviado',
    AGUARDANDO_RESPOSTA: 'aguardando_resposta',
    AGENDADO: 'agendado',
    ATENDIMENTO_REALIZADO: 'atendimento_realizado',
    POS_ATENDIMENTO: 'pos_atendimento',
    PERDIDO: 'perdido'
  },

  STATUS_LABELS: {
    novo_contato: 'Novo Contato',
    em_atendimento: 'Em Atendimento',
    orcamento_enviado: 'Or\u00e7amento Enviado',
    aguardando_resposta: 'Aguardando Resposta',
    agendado: 'Agendado',
    atendimento_realizado: 'Atendimento Realizado',
    pos_atendimento: 'P\u00f3s-atendimento',
    perdido: 'Perdido'
  },

  STATUS_ORDER: ['novo_contato', 'em_atendimento', 'orcamento_enviado', 'aguardando_resposta', 'agendado', 'atendimento_realizado', 'pos_atendimento', 'perdido'],

  setStatus(clientId, status) {
    const client = DB.getClient(clientId);
    if (!client) return null;
    if (client.crmStatus === 'perdido' && status !== 'perdido') return null;
    var oldStatus = client.crmStatus;
    DB.updateClient(clientId, { crmStatus: status });
    if (oldStatus !== status) {
      DB.addTimeline({ clientId: clientId, type: 'status_alterado', description: 'Status alterado de ' + (CRM.STATUS_LABELS[oldStatus] || oldStatus) + ' para ' + (CRM.STATUS_LABELS[status] || status), refId: null });
    }
    return client;
  },

  setNextAction(clientId, action, date, priority, note) {
    var client = DB.getClient(clientId);
    if (!client) return null;
    DB.updateClient(clientId, { crmNextAction: action || '', crmNextDate: date || '', crmPriority: priority || 'medium', crmNote: note || '' });
    return client;
  },

  clearNextAction(clientId) {
    return CRM.setNextAction(clientId, '', '', 'medium', '');
  },

  getClientCRM(client) {
    if (!client) return null;
    return {
      status: client.crmStatus || 'novo_contato',
      statusLabel: CRM.STATUS_LABELS[client.crmStatus] || 'Novo Contato',
      nextAction: client.crmNextAction || '',
      nextDate: client.crmNextDate || '',
      priority: client.crmPriority || 'medium',
      note: client.crmNote || ''
    };
  },

  addTimeline(clientId, type, description, refId) {
    if (!clientId) return null;
    return DB.addTimeline({ clientId: clientId, type: type, description: description, refId: refId || null });
  },

  getTimeline(clientId) {
    return DB.getTimelineByClient(clientId);
  },

  autoUpdate(clientId, eventType) {
    var client = DB.getClient(clientId);
    if (!client) return;
    if (client.crmStatus === 'perdido') return;

    var newStatus = null;
    switch (eventType) {
      case 'cliente_criado':
        if (!client.crmStatus || client.crmStatus === 'novo_contato') newStatus = 'novo_contato';
        break;
      case 'orcamento':
        newStatus = 'orcamento_enviado';
        break;
      case 'agendamento_criado':
        newStatus = 'agendado';
        break;
      case 'atendimento_iniciado':
        newStatus = 'em_atendimento';
        break;
      case 'atendimento_concluido':
        newStatus = 'atendimento_realizado';
        break;
      case 'os_criada':
        if (client.crmStatus !== 'atendimento_realizado') newStatus = 'agendado';
        break;
      case 'termo_assinado':
        break;
      case 'pagamento':
        newStatus = 'pos_atendimento';
        break;
    }

    if (newStatus && newStatus !== client.crmStatus) {
      CRM.setStatus(clientId, newStatus);
    }
  },

  collectNegociacoes() {
    var today = DB._today();
    var clientes = DB.getClients();
    var results = [];

    for (var i = 0; i < clientes.length; i++) {
      var c = clientes[i];
      if (!c.crmNextAction) continue;

      var prioMap = { high: 0, medium: 1, low: 2 };
      var prio = prioMap[c.crmPriority] !== undefined ? prioMap[c.crmPriority] : 1;

      var isOverdue = c.crmNextDate && c.crmNextDate < today;
      var isToday = c.crmNextDate === today;

      var urgPrio = isOverdue ? -1 : isToday ? 0 : 1;

      results.push({
        clientName: c.name,
        clientId: c.id,
        action: c.crmNextAction || '',
        date: c.crmNextDate || '',
        priority: c.crmPriority || 'medium',
        note: c.crmNote || '',
        status: c.crmStatus || 'novo_contato',
        statusLabel: CRM.STATUS_LABELS[c.crmStatus] || 'Novo Contato',
        phone: c.phone || '',
        _ordem: urgPrio * 100 + prio * 10 + (c.crmNextDate ? (today < c.crmNextDate ? 1 : 0) : 2)
      });
    }

    results.sort(function(a, b) { return a._ordem - b._ordem; });
    return results;
  }
};
