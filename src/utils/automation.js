const Automation = {
  _rules: [],
  _log: [],
  _maxLog: 200,
  _lastRefresh: 0,
  _refreshInterval: 800,

  rule: function(id, nome, evento, callback, ativo) {
    if (this._rules.some(function(r) { return r.id === id; })) return;
    this._rules.push({ id: id, nome: nome, evento: evento, callback: callback, ativo: ativo !== false });
  },

  setActive: function(id, ativo) {
    var r = this._rules.find(function(r) { return r.id === id; });
    if (r) r.ativo = ativo;
  },

  _exec: function(ruleId, data) {
    var rules = this._rules.filter(function(r) { return r.id === ruleId || r.evento === ruleId; });
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (!r.ativo) continue;
      var refId = (data && data.refId) || (data && data.id) || (data && data.clientId) || null;
      try {
        r.callback(data);
        this._logPush(r.id, r.evento, true, refId);
      } catch (e) {
        this._logPush(r.id, r.evento, false, refId);
        try { Audit.action('automation_error', r.evento, refId || '', r.id + ': ' + (e.message || '')); } catch (ex) {}
      }
    }
    this._autoRefresh();
  },

  _logPush: function(ruleId, evento, success, refId) {
    this._log.push({ date: new Date().toISOString(), ruleId: ruleId, evento: evento, success: success, refId: refId || null });
    if (this._log.length > this._maxLog) this._log.splice(0, this._log.length - this._maxLog);
  },

  getHistory: function() {
    return this._log.slice().reverse();
  },

  _autoRefresh: function() {
    var now = Date.now();
    if (now - this._lastRefresh < this._refreshInterval) return;
    this._lastRefresh = now;
    if (typeof App !== 'undefined' && App.refreshHoje) App.refreshHoje();
  },

  _init: function() {
    if (this._initialized) return;
    this._initialized = true;

    // ─── Regras ───

    // Atendimento iniciado → vincular conversas, atualizar CRM
    this.rule('atendimento.started', 'Vincular conversas ao atendimento', 'crm.atendimento_iniciado', function(data) {
      if (!data.clientId) return;
      var conversas = DB.getConversasByClient(data.clientId);
      conversas.forEach(function(c) {
        if (c.status === 'encerrada') return;
        if (c.status === 'aguardando_cliente' || c.status === 'aberta') {
          DB.updateConversa(c.id, { status: 'aguardando_estudio', note: (c.note || '') + ' [atendimento iniciado]' });
          CRM.addTimeline(data.clientId, 'automacao', 'Conversa atualizada: atendimento iniciado', c.id);
        }
      });
      Notificacao.create({ tipo: 'info', categoria: 'atendimento', titulo: 'Atendimento iniciado', prioridade: 'media', origemModulo: 'atendimento', origemId: data.refId, clientId: data.clientId, actionLabel: 'Abrir', actionTarget: 'navigate', actionParams: 'atendimento' });
    });

    // Atendimento concluído → criar próxima ação de pós-atendimento
    this.rule('atendimento.finished', 'Criar ação de pós-atendimento', 'crm.atendimento_concluido', function(data) {
      if (!data.clientId) return;
      var hoje = DB._today();
      CRM.setNextAction(data.clientId, 'Retorno p\u00f3s-procedimento', hoje, 'medium', 'Avaliar resultado e agendar retorno se necess\u00e1rio');
      CRM.addTimeline(data.clientId, 'automacao', 'A\u00e7\u00e3o de p\u00f3s-atendimento criada automaticamente', data.refId);
      Notificacao.create({ tipo: 'success', categoria: 'atendimento', titulo: 'Atendimento conclu\u00eddo', descricao: 'A\u00e7\u00e3o de p\u00f3s-atendimento criada', prioridade: 'media', origemModulo: 'atendimento', origemId: data.refId, clientId: data.clientId, actionLabel: 'Abrir', actionTarget: 'navigate', actionParams: 'atendimento' });
    });

    // OS criada → registrar no CRM e Inbox
    this.rule('os.created', 'Registrar OS no CRM e Inbox', 'crm.os_criada', function(data) {
      if (!data.clientId) return;
      CRM.addTimeline(data.clientId, 'os_criada', 'Ordem de Servi\u00e7o gerada automaticamente', data.refId);
      var conversas = DB.getConversasByClient(data.clientId);
      conversas.forEach(function(c) {
        if (c.status !== 'encerrada') {
          DB.addMensagem({ conversaId: c.id, type: 'orcamento', content: 'OS gerada', createdAt: DB._now() });
          DB.updateConversa(c.id, { status: 'aguardando_cliente' });
        }
      });
      Notificacao.create({ tipo: 'info', categoria: 'os', titulo: 'Ordem de Servi\u00e7o gerada', prioridade: 'media', origemModulo: 'os', origemId: data.refId, clientId: data.clientId, actionLabel: 'Abrir', actionTarget: 'navigate', actionParams: 'os' });
    });

    // Termo assinado → atualizar CRM timeline
    this.rule('termo.signed', 'Registrar assinatura no pipeline', 'crm.termo_assinado', function(data) {
      if (!data.clientId) return;
      CRM.setStatus(data.clientId, 'atendimento_realizado');
      CRM.addTimeline(data.clientId, 'termo_assinado', 'Termo de consentimento assinado', data.refId);
      Notificacao.create({ tipo: 'success', categoria: 'termo', titulo: 'Termo de consentimento assinado', prioridade: 'baixa', origemModulo: 'termos', origemId: data.refId, clientId: data.clientId, actionLabel: 'Ver', actionTarget: 'navigate', actionParams: 'termos' });
    });

    // Pagamento registrado → fechar pendências financeiras da conversa
    this.rule('payment.created', 'Fechar pendências financeiras da conversa', 'crm.pagamento', function(data) {
      if (!data.clientId) return;
      CRM.addTimeline(data.clientId, 'pagamento', 'Pagamento registrado: R$ ' + (data.value || '0'), data.refId);
      var conversas = DB.getConversasByClient(data.clientId);
      conversas.forEach(function(c) {
        if (c.status !== 'encerrada' && c.nextAction) {
          DB.updateConversa(c.id, { nextAction: '', nextDate: '', note: (c.note || '') + ' [pagamento realizado]' });
        }
      });
      Notificacao.create({ tipo: 'success', categoria: 'financeiro', titulo: 'Pagamento registrado', descricao: 'R$ ' + (data.value || '0'), prioridade: 'media', origemModulo: 'financeiro', origemId: data.refId, clientId: data.clientId, actionLabel: 'Abrir', actionTarget: 'navigate', actionParams: 'financeiro' });
    });

    // Agendamento criado → atualizar CRM e Inbox
    this.rule('agenda.created', 'Atualizar CRM e Inbox com novo agendamento', 'crm.agendamento_criado', function(data) {
      if (!data.clientId) return;
      CRM.setStatus(data.clientId, 'agendado');
      var hoje = DB._today();
      CRM.setNextAction(data.clientId, 'Agendamento confirmado', hoje, 'high', 'Cliente possui agendamento');
      CRM.addTimeline(data.clientId, 'agendamento', 'Agendamento criado para ' + (data.service || ''), data.refId);
      var conversas = DB.getConversasByClient(data.clientId);
      conversas.forEach(function(c) {
        if (c.status !== 'encerrada') {
          DB.addMensagem({ conversaId: c.id, type: 'enviada', content: 'Agendamento confirmado', createdAt: DB._now() });
          DB.updateConversa(c.id, { status: 'aguardando_cliente' });
        }
      });
      Notificacao.create({ tipo: 'info', categoria: 'agenda', titulo: 'Agendamento criado', descricao: data.service || '', prioridade: 'baixa', origemModulo: 'agenda', origemId: data.refId, clientId: data.clientId, actionLabel: 'Abrir', actionTarget: 'navigate', actionParams: 'agenda' });
    });

    // Conversa encerrada → limpar próximas ações pendentes
    this.rule('inbox.closed', 'Limpar a\u00e7\u00f5es pendentes da conversa', 'crm.conversa_encerrada', function(data) {
      if (!data.clientId) return;
      CRM.clearNextAction(data.clientId);
      CRM.addTimeline(data.clientId, 'conversa_encerrada', 'Conversa encerrada', data.refId);
      Notificacao.create({ tipo: 'info', categoria: 'inbox', titulo: 'Conversa encerrada', prioridade: 'baixa', origemModulo: 'inbox', origemId: data.refId, clientId: data.clientId, actionLabel: 'Abrir', actionTarget: 'navigate', actionParams: 'inbox' });
    });

    // Orçamento aprovado → próxima ação
    this.rule('orcamento.aprovado', 'Criar ação para orçamento aprovado', 'orcamento.status_changed', function(data) {
      if (!data.clientId || data.status !== 'aprovado') return;
      CRM.setStatus(data.clientId, 'agendado');
      CRM.setNextAction(data.clientId, 'Criar agendamento para or\u00e7amento #' + (data.numero || ''), DB._today(), 'high', 'Or\u00e7amento aprovado, aguardando agendamento');
      Notificacao.create({ tipo: 'success', categoria: 'orcamento', titulo: 'Or\u00e7amento #' + (data.numero || '') + ' aprovado', prioridade: 'alta', origemModulo: 'orcamentos', origemId: data.orcamentoId, clientId: data.clientId, actionLabel: 'Abrir', actionTarget: 'navigate', actionParams: 'orcamentos' });
    });

    // Orçamento recusado → pipeline
    this.rule('orcamento.recusado', 'Atualizar pipeline para orçamento recusado', 'orcamento.status_changed', function(data) {
      if (!data.clientId || data.status !== 'recusado') return;
      CRM.setStatus(data.clientId, 'perdido');
      CRM.clearNextAction(data.clientId);
      Notificacao.create({ tipo: 'warning', categoria: 'orcamento', titulo: 'Or\u00e7amento #' + (data.numero || '') + ' recusado', prioridade: 'alta', origemModulo: 'orcamentos', origemId: data.orcamentoId, clientId: data.clientId, actionLabel: 'Ver', actionTarget: 'navigate', actionParams: 'orcamentos' });
    });

    // Pós-Atendimento: criar plano quando atendimento de piercing for concluído
    this.rule('posatendimento.criar_plano', 'Criar plano de acompanhamento', 'crm.atendimento_concluido', function(data) {
      if (!data.clientId) return;
      var a = data.refId ? Repos.agenda.get(data.refId) : null;
      var procedimento = (a && a.service) || data.procedimento || '';
      var profissional = (a && a.professional) || '';
      var dataProc = (a && a.date) || DB._today();
      PosAtendimento.criarPlano(data.clientId, data.refId, procedimento, profissional, dataProc);
    });

    // Registrar listeners no sistema de eventos
    var eventos = [
      'crm.atendimento_iniciado',
      'crm.atendimento_concluido',
      'crm.agendamento_criado',
      'crm.os_criada',
      'crm.termo_assinado',
      'crm.pagamento',
      'crm.conversa_encerrada',
      'orcamento.status_changed'
    ];

    for (var i = 0; i < eventos.length; i++) {
      (function(evt) {
        Events.on(evt, function(data) {
          Automation._exec(evt, data);
        });
      })(eventos[i]);
    }
  },

  _sugestoesIA: function() {
    return [];
  }
};

Automation._init();
