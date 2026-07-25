const Operador = {
  _ativo: false,
  _foco: false,
  _queue: [],
  _indiceFoco: 0,

  // Iniciar operação
  iniciar: function() {
    this._ativo = true;
    this._foco = false;
    this._indiceFoco = 0;
    this.ciclo();
    return true;
  },

  // Parar operação
  parar: function() {
    this._ativo = false;
    this._foco = false;
  },

  // Ciclo principal: recalcula tudo
  ciclo: function() {
    if (!this._ativo) return;
    this._queue = this._gerarFila();
    EventBus.emit('copiloto.updated');
    EventBus.emit('meudia.updated');
  },

  // Gerar fila operacional consolidada
  _gerarFila: function() {
    var hoje = DB._today();
    var fila = [];

    var push = function(categoria, origem, score, impacto, urgencia, cliente, acao, tipo, payload, motivos) {
      fila.push({
        id: 'op_' + Date.now().toString(36) + '_' + fila.length, categoria: categoria, origem: origem,
        score: Math.max(0, Math.min(100, score)), impacto: impacto || '', urgencia: urgencia || 3,
        cliente: cliente || '', acao: acao || '', tipo: tipo || '', payload: payload || {},
        status: 'pendente', motivos: motivos || [], tempoEstimado: ''
      });
    };

    // WhatsApp
    Inbox.collectWhatsApp().forEach(function(w) {
      if (w.status === 'aguardando_estudio') {
        var ctx = { mensagemNaoRespondida: true, ultimaInteracao: w.ultimaInteracao, aguardandoResposta: true };
        var r = Prioritizacao.calcular('whatsapp', ctx);
        push('Responder', 'WhatsApp', r.score, 'Cliente aguarda resposta', 1, w.clientName, 'Abrir conversa', 'whatsapp', {}, r.motivos);
      }
    });

    // Confirmações
    Confirmacao.collect().forEach(function(c) {
      if (c.statusConfirmacao === 'pendente') {
        var ctx = { pendenteConfirmacao: true, horario: c.time, data: c.date, isToday: c.isToday };
        var r = Prioritizacao.calcular('confirmacao', ctx);
        push('Confirmar', 'Agenda', r.score, 'Confirmar agendamento', c.isToday ? 1 : 2, c.clientName, 'Confirmar', 'confirmacao', {}, r.motivos);
      }
    });

    // Pré-agendamentos
    DB.getConversas().forEach(function(c) {
      if (c.preAgendamento) { try { var pre = JSON.parse(c.preAgendamento); if (pre && pre.status === 'rascunho') {
        push('Agendar', 'Inbox', 85, 'Pr\u00e9-agendamento pendente', 1, c.clientName, 'Abrir', 'pre_agendamento', { conversaId: c.id }, ['Aguardando confirma\u00e7\u00e3o']);
      }} catch(e) {} }
    });

    // CRM follow-ups vencidos
    DB.getClients().forEach(function(cl) {
      if (cl.crmNextDate && cl.crmNextDate < hoje && cl.crmNextAction) {
        var ctx = { followUpVencido: true, clienteVip: (cl.totalVisits || 0) >= 3 };
        var r = Prioritizacao.calcular('crm', ctx);
        push('Acompanhar', 'CRM', r.score, cl.crmNextAction, 2, cl.name, 'Ver cliente', 'crm', { clientId: cl.id }, r.motivos);
      }
    });

    // Oportunidades
    (typeof Oportunidade.collect === 'function' ? Oportunidade.collect() : []).forEach(function(o) {
      if (o.score >= 60) push('Oportunidade', 'Vendas', o.score, o.descricao, o.score >= 80 ? 1 : 2, o.clientName, o.btnLabel || 'Abrir', 'oportunidade', { target: o.btnTarget }, ['Alta chance']);
    });

    // Pagamentos
    var agendaHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status !== 'cancelled'; });
    agendaHoje.filter(function(a) { return a.status === 'completed' && a.value; }).forEach(function(a) {
      var r = Prioritizacao.calcular('financeiro', { pagamentoPendente: true });
      push('Cobrar', 'Financeiro', r.score, 'Pagamento pendente: R$ ' + a.value, 1, a.clientName, 'Registrar', 'financeiro', {}, ['Pagamento em aberto']);
    });

    // Pós-atendimento
    (typeof PosAtendimento.collectRetornos === 'function' ? PosAtendimento.collectRetornos() : []).forEach(function(r) {
      if (r.prioridade <= 1) {
        var ctx = { followUpVencido: true, ultimaInteracao: r.dataPrevista };
        var s = Prioritizacao.calcular('posatendimento', ctx);
        push('Acompanhar', 'P\u00f3s-atendimento', s.score, r.desc, 1, r.clientName, 'Concluir etapa', 'posatendimento', { clientId: r.clientId }, ['Retorno vencido']);
      }
    });

    // Agenda de hoje
    agendaHoje.forEach(function(a) {
      var label = a.status === 'pending' ? 'Confirmar' : a.status === 'in_progress' ? 'Atender' : 'OK';
      var prio = a.status === 'pending' ? 70 : a.status === 'in_progress' ? 90 : 30;
      push('Agenda', 'Hoje', prio, a.service + ' \u00e0s ' + a.time, a.status === 'in_progress' ? 0 : 1, a.clientName, label, 'agenda', {}, [a.status === 'pending' ? 'N\u00e3o confirmado' : a.status === 'in_progress' ? 'Em atendimento' : 'Confirmado']);
    });

    // Instagram
    var ig = Marketing.collectInstagram();
    ig.items.filter(function(i) { return i.isOverdue; }).forEach(function(i) {
      push('Publicar', 'Marketing', 75, i.titulo + ' atrasado', 1, '', 'Publicar', 'marketing', {}, ['Atrasado']);
    });

    // Notificações críticas
    var notif = Notificacao.collectHojeResumo();
    if (notif.criticas > 0) push('Alerta', 'Sistema', 90, notif.criticas + ' notifica\u00e7\u00e3o cr\u00edtica', 0, '', 'Ver', 'notificacao', {}, ['Cr\u00edtico']);

    // Ordenar por score decrescente
    fila.sort(function(a, b) { return b.score - a.score; });
    return fila;
  },

  // Retornar fila atual
  getQueue: function() { return this._queue; },

  // Próxima tarefa do Modo Foco
  getProximaTarefa: function() {
    if (this._queue.length === 0) return null;
    if (this._indiceFoco >= this._queue.length) this._indiceFoco = 0;
    return this._queue[this._indiceFoco];
  },

  // Pular tarefa no Modo Foco
  pularTarefa: function() {
    this._indiceFoco++;
    if (this._indiceFoco >= this._queue.length) this._indiceFoco = 0;
    EventBus.emit('copiloto.updated');
  },

  // Adiar tarefa (mover para o final)
  adiarTarefa: function() {
    if (this._queue.length === 0) return;
    var item = this._queue.splice(this._indiceFoco, 1)[0];
    this._queue.push(item);
    EventBus.emit('copiloto.updated');
  },

  // Resolver tarefa
  resolverTarefa: function() {
    if (this._queue.length === 0) return;
    var item = this._queue[this._indiceFoco];
    if (item && item.tipo) {
      Executor.executar(item.tipo, item.payload);
      this._queue.splice(this._indiceFoco, 1);
      EventBus.emit('copiloto.updated');
      EventBus.emit('meudia.updated');
    }
  },

  // Métricas
  getMetricas: function() {
    var fila = this._queue;
    var criticos = fila.filter(function(i) { return i.score >= 80; }).length;
    var urgentes = fila.filter(function(i) { return i.urgencia <= 1; }).length;
    var porOrigem = {};
    fila.forEach(function(i) { porOrigem[i.origem] = (porOrigem[i.origem] || 0) + 1; });
    return { total: fila.length, criticos: criticos, urgentes: urgentes, porOrigem: porOrigem };
  }
};

// Auto-registrar no EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('whatsapp.message.received', function() { if (Operador._ativo) Operador.ciclo(); });
  EventBus.on('whatsapp.message.sent', function() { if (Operador._ativo) Operador.ciclo(); });
  EventBus.on('agenda.created', function() { if (Operador._ativo) Operador.ciclo(); });
  EventBus.on('agenda.cancelled', function() { if (Operador._ativo) Operador.ciclo(); });
  EventBus.on('crm.updated', function() { if (Operador._ativo) Operador.ciclo(); });
  EventBus.on('finance.payment.received', function() { if (Operador._ativo) Operador.ciclo(); });
})();
