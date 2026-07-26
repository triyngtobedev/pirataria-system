const Pendencias = {
  TIPOS: [
    { key: 'mensagem', label: 'WhatsApp', icon: '\uD83D\uDCE8' },
    { key: 'confirmacao', label: 'Confirma\u00e7\u00f5es', icon: '\u2705' },
    { key: 'pre_agendamento', label: 'Pr\u00e9-agendamentos', icon: '\uD83D\uDCC5' },
    { key: 'follow_up', label: 'Follow-ups', icon: '\uD83D\uDD04' },
    { key: 'pagamento', label: 'Pagamentos', icon: '\uD83D\uDCB0' },
    { key: 'pos_atendimento', label: 'P\u00f3s-atendimentos', icon: '\uD83C\uDFE5' },
    { key: 'oportunidade', label: 'Oportunidades', icon: '\uD83C\uDFAF' },
    { key: 'publicacao', label: 'Publica\u00e7\u00f5es', icon: '\uD83D\uDCF7' },
    { key: 'notificacao', label: 'Notifica\u00e7\u00f5es', icon: '\uD83D\uDD14' },
    { key: 'estoque', label: 'Estoque', icon: '\uD83D\uDCE6' }
  ],

  KEY_ACOES: 'pirataria_pendencias_acoes',

  _carregarAcoes: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY_ACOES)) || {}; } catch(e) { return {}; }
  },

  _salvarAcoes: function(acoes) {
    localStorage.setItem(this.KEY_ACOES, JSON.stringify(acoes));
  },

  _registrarAcao: function(pendenciaId, tipoAcao, payload) {
    var acoes = this._carregarAcoes();
    if (!acoes[pendenciaId]) acoes[pendenciaId] = [];
    acoes[pendenciaId].push({ tipo: tipoAcao, data: DB._now(), payload: payload || {} });
    this._salvarAcoes(acoes);
    EventTimeline.add('pendencias.' + tipoAcao, { pendenciaId: pendenciaId, tipo: tipoAcao }, 'pendencias', pendenciaId);
    EventBus.emit('pendencias.updated');
  },

  _getTempoAberto: function(dataRef) {
    if (!dataRef) return '—';
    var diff = Date.now() - new Date(dataRef).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return mins + 'min';
    var horas = Math.floor(mins / 60);
    if (horas < 24) return horas + 'h' + (mins % 60 > 0 ? (mins % 60) + 'min' : '');
    var dias = Math.floor(horas / 24);
    if (dias === 1) return '1 dia';
    if (dias < 30) return dias + ' dias';
    var meses = Math.floor(dias / 30);
    return meses + 'm\u00eas' + (meses > 1 ? 'es' : '');
  },

  collect: function() {
    var hoje = DB._today();
    var items = [];
    var acoes = this._carregarAcoes();

    // 1. Mensagens sem resposta
    try {
      var whatsApps = Inbox.collectWhatsApp();
      whatsApps.forEach(function(c) {
        if (c.status !== 'aguardando_estudio') return;
        var isResolvida = acoes[c.id] && acoes[c.id].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { ultimaInteracao: c.ultimaInteracao, aguardandoResposta: true, mensagemNaoRespondida: true, prioridade: c.priority };
        var prio = Prioritizacao.calcular('mensagem', ctx);
        items.push({
          id: 'msg_' + c.id, tipo: 'mensagem', tipoLabel: 'WhatsApp',
          cliente: c.clientName, clienteId: c.clientId || '',
          origem: c.origem || 'WhatsApp',
          prioridade: prio.prioridade, score: prio.score, motivos: prio.motivos,
          data: c.ultimaInteracao || hoje,
          tempoEmAberto: Pendencias._getTempoAberto(c.ultimaInteracao),
          responsavel: '', acaoTipo: 'whatsapp', acaoPayload: { conversaId: c.id },
          itemOriginal: c
        });
      });
    } catch(e) {}

    // 2. Confirma\u00e7\u00f5es pendentes
    try {
      var confirmacoes = Confirmacao.collect();
      confirmacoes.forEach(function(c) {
        if (c.statusConfirmacao !== 'pendente') return;
        var pendId = 'conf_' + c.appointmentId;
        var isResolvida = acoes[pendId] && acoes[pendId].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { data: c.date, horario: c.time, pendenteConfirmacao: true, isToday: c.isToday };
        var prio = Prioritizacao.calcular('confirmacao', ctx);
        items.push({
          id: pendId, tipo: 'confirmacao', tipoLabel: 'Confirma\u00e7\u00e3o',
          cliente: c.clientName, clienteId: c.clientId || '',
          origem: 'Confirma\u00e7\u00f5es',
          prioridade: prio.prioridade, score: prio.score, motivos: prio.motivos,
          data: c.date,
          tempoEmAberto: Pendencias._getTempoAberto(c.date + 'T' + (c.time || '12:00')),
          responsavel: c.professional || '', acaoTipo: 'confirmacao', acaoPayload: { appointmentId: c.appointmentId },
          itemOriginal: c
        });
      });
    } catch(e) {}

    // 3. Pr\u00e9-agendamentos
    try {
      var conversas = DB.getConversas();
      conversas.forEach(function(c) {
        var preAg = null;
        try { preAg = (typeof c.preAgendamento === 'string') ? JSON.parse(c.preAgendamento) : c.preAgendamento; } catch(e) { preAg = null; }
        if (!preAg || preAg.status !== 'rascunho') return;
        var pendId = 'pre_' + c.id;
        var isResolvida = acoes[pendId] && acoes[pendId].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { ultimaInteracao: c.ultimaInteracao, agendamentoHoje: preAg.data === hoje };
        var prio = Prioritizacao.calcular('pre_agendamento', ctx);
        items.push({
          id: pendId, tipo: 'pre_agendamento', tipoLabel: 'Pr\u00e9-agendamento',
          cliente: c.clientName, clienteId: c.clientId || '',
          origem: 'Conversas',
          prioridade: prio.prioridade, score: prio.score, motivos: prio.motivos,
          data: preAg.data || c.ultimaInteracao || hoje,
          tempoEmAberto: Pendencias._getTempoAberto(c.ultimaInteracao),
          responsavel: preAg.profissional || '', acaoTipo: 'pre_agendamento', acaoPayload: { conversaId: c.id },
          itemOriginal: c
        });
      });
    } catch(e) {}

    // 4. Follow-ups vencidos (CRM)
    try {
      var clientes = DB.getClients();
      clientes.forEach(function(c) {
        if (!c.crmNextDate || !c.crmNextAction || c.crmNextDate >= hoje) return;
        var pendId = 'fu_' + c.id;
        var isResolvida = acoes[pendId] && acoes[pendId].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { followUpVencido: true, ultimaInteracao: c.lastVisit, clienteVip: (c.totalVisits || 0) >= 3 };
        var prio = Prioritizacao.calcular('follow_up', ctx);
        items.push({
          id: pendId, tipo: 'follow_up', tipoLabel: 'Follow-up',
          cliente: c.name, clienteId: c.id,
          origem: 'CRM',
          prioridade: prio.prioridade, score: prio.score, motivos: prio.motivos,
          data: c.crmNextDate,
          tempoEmAberto: Pendencias._getTempoAberto(c.crmNextDate),
          responsavel: '', acaoTipo: 'crm', acaoPayload: { clientId: c.id },
          itemOriginal: c
        });
      });
    } catch(e) {}

    // 5. Pagamentos pendentes
    try {
      var appointments = DB.getAppointments();
      appointments.forEach(function(a) {
        if (a.status !== 'completed' || !a.value) return;
        var pagamentos = DB._get('pagamentos') || [];
        var temPagamento = pagamentos.some(function(p) { return p.appointmentId === a.id; });
        if (temPagamento) return;
        var pendId = 'pag_' + a.id;
        var isResolvida = acoes[pendId] && acoes[pendId].some(function(a2) { return a2.tipo === 'concluir' || a2.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { pagamentoPendente: true, data: a.date, horario: a.time };
        var prio = Prioritizacao.calcular('pagamento', ctx);
        items.push({
          id: pendId, tipo: 'pagamento', tipoLabel: 'Pagamento',
          cliente: a.clientName, clienteId: a.clientId || '',
          origem: 'Financeiro',
          prioridade: prio.prioridade, score: prio.score, motivos: prio.motivos,
          data: a.date,
          tempoEmAberto: Pendencias._getTempoAberto(a.date + 'T' + (a.time || '12:00')),
          responsavel: a.professional || '', acaoTipo: 'financeiro', acaoPayload: {},
          itemOriginal: a
        });
      });
    } catch(e) {}

    // 6. P\u00f3s-atendimentos
    try {
      var retornos = PosAtendimento.collectRetornos();
      retornos.forEach(function(r) {
        var pendId = 'pos_' + r.etapaId;
        var isResolvida = acoes[pendId] && acoes[pendId].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { data: r.dataPrevista, followUpVencido: r.prioridade === 0 };
        var prio = Prioritizacao.calcular('pos_atendimento', ctx);
        items.push({
          id: pendId, tipo: 'pos_atendimento', tipoLabel: 'P\u00f3s-atendimento',
          cliente: r.clientName, clienteId: r.clientId || '',
          origem: 'Acompanhamento',
          prioridade: prio.prioridade, score: prio.score, motivos: prio.motivos,
          data: r.dataPrevista,
          tempoEmAberto: Pendencias._getTempoAberto(r.dataPrevista),
          responsavel: '', acaoTipo: 'posatendimento', acaoPayload: { clientId: r.clientId },
          itemOriginal: r
        });
      });
    } catch(e) {}

    // 7. Oportunidades sem a\u00e7\u00e3o
    try {
      var ops = Oportunidade.collect();
      ops.forEach(function(o) {
        var pendId = 'op_' + o.id;
        var isResolvida = acoes[pendId] && acoes[pendId].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { oportunidadeAlta: o.score >= 80, oportunidadeScore: o.score };
        var prio = Prioritizacao.calcular('oportunidade', ctx);
        items.push({
          id: pendId, tipo: 'oportunidade', tipoLabel: 'Oportunidade',
          cliente: o.clientName, clienteId: o.clientId || '',
          origem: o.categoriaLabel || 'Oportunidades',
          prioridade: prio.prioridade, score: prio.score, motivos: prio.motivos,
          data: o.createdAt ? o.createdAt.slice(0, 10) : hoje,
          tempoEmAberto: Pendencias._getTempoAberto(o.createdAt),
          responsavel: '', acaoTipo: 'oportunidade', acaoPayload: { target: o.btnTarget },
          itemOriginal: o
        });
      });
    } catch(e) {}

    // 8. Publica\u00e7\u00f5es pendentes
    try {
      var igData = Marketing.collectInstagram();
      igData.items.forEach(function(i) {
        if (i.statusCalc === 'publicado') return;
        var pendId = 'pub_' + i.id;
        var isResolvida = acoes[pendId] && acoes[pendId].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { data: i.dataPrevista, agendamentoHoje: i.isToday };
        var prio = Prioritizacao.calcular('publicacao', ctx);
        items.push({
          id: pendId, tipo: 'publicacao', tipoLabel: 'Publica\u00e7\u00e3o',
          cliente: i.titulo || '', clienteId: '',
          origem: i.perfilDestino || 'Instagram',
          prioridade: prio.prioridade, score: prio.score, motivos: prio.motivos,
          data: i.dataPrevista || hoje,
          tempoEmAberto: Pendencias._getTempoAberto(i.dataPrevista),
          responsavel: '', acaoTipo: 'marketing', acaoPayload: {},
          itemOriginal: i
        });
      });
    } catch(e) {}

    // 9. Notifica\u00e7\u00f5es cr\u00edticas
    try {
      var notifs = Notificacao.list().filter(function(n) { return n.status === 'nao_lida' && n.prioridade === 'critica'; });
      notifs.forEach(function(n) {
        var pendId = 'notif_' + n.id;
        var isResolvida = acoes[pendId] && acoes[pendId].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { notificacaoCritica: true };
        var prio = Prioritizacao.calcular('notificacao', ctx);
        items.push({
          id: pendId, tipo: 'notificacao', tipoLabel: 'Notifica\u00e7\u00e3o',
          cliente: n.titulo || '', clienteId: n.clientId || '',
          origem: n.origemModulo || 'Sistema',
          prioridade: prio.prioridade, score: prio.score, motivos: prio.motivos,
          data: n.createdAt ? n.createdAt.slice(0, 10) : hoje,
          tempoEmAberto: Pendencias._getTempoAberto(n.createdAt),
          responsavel: '', acaoTipo: 'notificacao', acaoPayload: {},
          itemOriginal: n
        });
      });
    } catch(e) {}

    // 10. Estoque abaixo do m\u00ednimo
    try {
      var alerts = Inventory.alerts();
      var belowMin = alerts.belowMin.concat(alerts.outOfStock);
      belowMin.forEach(function(p) {
        var pendId = 'est_' + p.id;
        var isResolvida = acoes[pendId] && acoes[pendId].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = {};
        var prio = Prioritizacao.calcular('estoque', ctx);
        var isOut = p.stock <= 0;
        items.push({
          id: pendId, tipo: 'estoque', tipoLabel: isOut ? 'Estoque zerado' : 'Estoque baixo',
          cliente: p.name || p.productName || '', clienteId: p.id || '',
          origem: 'Estoque',
          prioridade: isOut ? 'Cr\u00edtica' : prio.prioridade,
          score: isOut ? 90 : prio.score,
          motivos: isOut ? ['Produto sem estoque'] : ['Abaixo do m\u00ednimo (' + p.stock + '/' + p.minStock + ')'],
          data: hoje,
          tempoEmAberto: '—',
          responsavel: '', acaoTipo: 'studio', acaoPayload: {},
          itemOriginal: p
        });
      });
    } catch(e) {}

    items.sort(function(a, b) { return b.score - a.score || (a.data > b.data ? -1 : 1); });
    return items;
  },

  getContadores: function() {
    var items = this.collect();
    var contadores = {};
    this.TIPOS.forEach(function(t) { contadores[t.key] = 0; });
    contadores.total = items.length;
    items.forEach(function(i) {
      if (contadores[i.tipo] !== undefined) contadores[i.tipo]++;
    });
    return contadores;
  },

  search: function(items, query) {
    if (!query || !query.trim()) return items;
    var q = query.toLowerCase().trim();
    return items.filter(function(i) {
      return (i.cliente && i.cliente.toLowerCase().indexOf(q) >= 0)
        || (i.tipoLabel && i.tipoLabel.toLowerCase().indexOf(q) >= 0)
        || (i.origem && i.origem.toLowerCase().indexOf(q) >= 0)
        || (i.responsavel && i.responsavel.toLowerCase().indexOf(q) >= 0)
        || (i.motivos && i.motivos.some(function(m) { return m.toLowerCase().indexOf(q) >= 0; }));
    });
  },

  filtrar: function(items, filtros) {
    if (!filtros) return items;
    if (filtros.tipo && filtros.tipo !== 'todas') {
      items = items.filter(function(i) { return i.tipo === filtros.tipo; });
    }
    if (filtros.prioridade && filtros.prioridade !== 'todas') {
      items = items.filter(function(i) { return i.prioridade === filtros.prioridade; });
    }
    if (filtros.origem) {
      items = items.filter(function(i) { return i.origem.indexOf(filtros.origem) >= 0; });
    }
    return items;
  },

  ordenar: function(items, campo, ordem) {
    var dir = ordem === 'asc' ? 1 : -1;
    var sorted = items.slice();
    sorted.sort(function(a, b) {
      var va, vb;
      if (campo === 'score') { va = a.score; vb = b.score; }
      else if (campo === 'data') { va = a.data; vb = b.data; }
      else if (campo === 'cliente') { va = a.cliente; vb = b.cliente; }
      else if (campo === 'prioridade') { va = Prioritizacao.nivel(a.score); vb = Prioritizacao.nivel(b.score); }
      else { va = a.score; vb = b.score; }
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return 0;
    });
    return sorted;
  },

  registrarAcoesExecutor: function() {
    Executor.registrar('pendencias.concluir', function(p) {
      var ids = p && p.ids ? (Array.isArray(p.ids) ? p.ids : [p.ids]) : [];
      ids.forEach(function(id) { Pendencias._registrarAcao(id, 'concluir', {}); });
      if (typeof App !== 'undefined' && App._toast) App._toast(ids.length + ' pend\u00eancia(s) conclu\u00edda(s)', 'success');
    });

    Executor.registrar('pendencias.adiar', function(p) {
      var ids = p && p.ids ? (Array.isArray(p.ids) ? p.ids : [p.ids]) : [];
      var data = (p && p.data) || DB._today();
      ids.forEach(function(id) { Pendencias._registrarAcao(id, 'adiar', { data: data }); });
      if (typeof App !== 'undefined' && App._toast) App._toast(ids.length + ' pend\u00eancia(s) adiada(s)', 'success');
    });

    Executor.registrar('pendencias.prioridade', function(p) {
      var ids = p && p.ids ? (Array.isArray(p.ids) ? p.ids : [p.ids]) : [];
      var prioridade = (p && p.prioridade) || 'media';
      ids.forEach(function(id) { Pendencias._registrarAcao(id, 'prioridade', { prioridade: prioridade }); });
      if (typeof App !== 'undefined' && App._toast) App._toast('Prioridade alterada para ' + ids.length + ' pend\u00eancia(s)', 'success');
    });

    Executor.registrar('pendencias.atribuir', function(p) {
      var ids = p && p.ids ? (Array.isArray(p.ids) ? p.ids : [p.ids]) : [];
      var responsavel = (p && p.responsavel) || '';
      ids.forEach(function(id) { Pendencias._registrarAcao(id, 'atribuir', { responsavel: responsavel }); });
      if (typeof App !== 'undefined' && App._toast) App._toast('Respons\u00e1vel atribu\u00eddo a ' + ids.length + ' pend\u00eancia(s)', 'success');
    });

    Executor.registrar('pendencias.abrir', function(p) {
      var ids = p && p.ids ? (Array.isArray(p.ids) ? p.ids : [p.ids]) : [];
      if (ids.length === 0 && p && p.navigate) {
        App.navigate(p.navigate);
        return;
      }
      var todos = Pendencias.collect();
      ids.forEach(function(id) {
        var item = todos.find(function(i) { return i.id === id; });
        if (item) {
          Executor.executar(item.acaoTipo, item.acaoPayload);
        }
      });
    });
  }
};

// Auto-registrar a\u00e7\u00f5es no Executor
Pendencias.registrarAcoesExecutor();

// Auto-registrar listener no EventBus para atualiza\u00e7\u00e3o em tempo real
(function() {
  if (typeof EventBus === 'undefined') return;
  var eventosRefresh = [
    'whatsapp.message.received', 'whatsapp.message.sent',
    'agenda.created', 'agenda.updated', 'agenda.cancelled', 'agenda.confirmed',
    'crm.updated', 'finance.payment.received',
    'marketing.post.completed', 'notification.created',
    'pendencias.updated'
  ];
  eventosRefresh.forEach(function(evt) {
    EventBus.on(evt, function() {
      EventBus.emit('pendencias.updated');
    });
  });
})();
