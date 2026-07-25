const Inbox = {
  ORIGENS: ['whatsapp', 'instagram', 'indicacao', 'presencial', 'outro'],
  ORIGEM_LABELS: { whatsapp: 'WhatsApp', instagram: 'Instagram', indicacao: 'Indica\u00e7\u00e3o', presencial: 'Presencial', outro: 'Outro' },
  STATUS: ['aberta', 'aguardando_cliente', 'aguardando_estudio', 'encerrada'],
  STATUS_LABELS: { aberta: 'Aberta', aguardando_cliente: 'Aguardando Cliente', aguardando_estudio: 'Aguardando Est\u00fadio', encerrada: 'Encerrada' },

  create(data) {
    return DB.addConversa(data);
  },

  update(id, data) {
    return DB.updateConversa(id, data);
  },

  get(id) {
    return DB.getConversa(id);
  },

  list(filter) {
    var todas = DB.getConversas();
    if (!filter || filter === 'todas') return todas;
    return todas.filter(function(c) { return c.status === filter; });
  },

  search(query) {
    var q = query.toLowerCase().trim();
    if (!q) return DB.getConversas();
    return DB.getConversas().filter(function(c) {
      return c.clientName.toLowerCase().indexOf(q) >= 0
        || (c.phone && c.phone.indexOf(q)) >= 0
        || (c.origin && c.origin.indexOf(q)) >= 0;
    });
  },

  addMensagem(conversaId, type, content) {
    var msg = DB.addMensagem({ conversaId: conversaId, type: type, content: content });
    var c = DB.getConversa(conversaId);
    if (c && c.clientId) {
      CRM.addTimeline(c.clientId, 'conversa_' + type, (type === 'recebida' ? 'Mensagem recebida' : type === 'enviada' ? 'Mensagem enviada' : type === 'orcamento' ? 'Or\u00e7amento enviado' : 'Conversa: ' + content), conversaId);
      var statusMap = { recebida: 'aguardando_estudio', enviada: 'aguardando_cliente', orcamento: 'aguardando_cliente', resposta: 'aguardando_estudio', encerramento: 'encerrada' };
      var newStatus = statusMap[type];
      if (newStatus && c.status !== 'encerrada') {
        DB.updateConversa(conversaId, { status: newStatus });
      }
    }
    return msg;
  },

  getMensagens(conversaId) {
    return DB.getMensagens(conversaId);
  },

  close(conversaId) {
    var c = DB.getConversa(conversaId);
    if (!c) return;
    DB.updateConversa(conversaId, { status: 'encerrada' });
    Inbox.addMensagem(conversaId, 'encerramento', 'Conversa encerrada.');
    if (c.clientId) {
      CRM.addTimeline(c.clientId, 'conversa_encerrada', 'Conversa encerrada: ' + c.clientName, conversaId);
      CRM.clearNextAction(c.clientId);
      Events.emit('crm.conversa_encerrada', { clientId: c.clientId, refId: conversaId });
    }
  },

  linkClient(conversaId, clientId) {
    var c = DB.getConversa(conversaId);
    if (!c) return null;
    DB.updateConversa(conversaId, { clientId: clientId });
    var client = DB.getClient(clientId);
    if (client) {
      CRM.setStatus(clientId, 'novo_contato');
      CRM.addTimeline(clientId, 'conversa_vinculada', 'Conversa vinculada ao cliente', conversaId);
    }
    return client;
  },

  collectHoje() {
    var today = DB._today();
    var conversas = DB.getConversas();
    var results = [];

    for (var i = 0; i < conversas.length; i++) {
      var c = conversas[i];
      if (c.status === 'encerrada') continue;

      var hasAction = c.nextAction || c.nextDate;
      if (!hasAction && c.status !== 'aguardando_estudio') continue;

      var prioMap = { high: 0, medium: 1, low: 2 };
      var prio = prioMap[c.priority] !== undefined ? prioMap[c.priority] : 1;

      var isOverdue = c.nextDate && c.nextDate < today;
      var isToday = c.nextDate === today;
      var urgPrio = isOverdue ? -1 : isToday ? 0 : (c.status === 'aguardando_estudio' ? 1 : 2);

      results.push({
        clientName: c.clientName,
        clientId: c.clientId || null,
        conversaId: c.id,
        action: c.nextAction || (c.status === 'aguardando_estudio' ? 'Responder ' + c.clientName : 'Acompanhar'),
        date: c.nextDate || '',
        priority: c.priority || 'medium',
        note: c.note || '',
        status: c.status,
        origin: c.origin || '',
        _ordem: urgPrio * 100 + prio * 10 + (c.nextDate ? (today < c.nextDate ? 1 : 0) : 2)
      });
    }

    results.sort(function(a, b) { return a._ordem - b._ordem; });
    return results;
  }
};
