const OperacaoReal = {
  KEY: 'pirataria_operacao_real',
  SESSION_KEY: 'pirataria_op_session',

  _carregar: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || this._iniciar(); } catch(e) { return this._iniciar(); }
  },

  _salvar: function(d) {
    localStorage.setItem(this.KEY, JSON.stringify(d));
  },

  _iniciar: function() {
    return { atritos: [], metricas: { modulos: {}, tempos: {}, fluxos: {} }, sessoes: [], melhorias: [], contadorAtritos: {} };
  },

  _session: function() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)) || { inicio: DB._now(), modulosVisitados: [], acoes: 0, erros: 0 }; } catch(e) { return { inicio: DB._now(), modulosVisitados: [], acoes: 0, erros: 0 }; }
  },

  _saveSession: function(s) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(s));
  },

  _classificar: function(impacto) {
    if (impacto === 'critico' || impacto === 'bloqueante') return 'Cr\u00edtico';
    if (impacto === 'alto' || impacto === 'lento') return 'Alto';
    if (impacto === 'medio' || impacto === 'confuso') return 'M\u00e9dio';
    return 'Baixo';
  },

  _timestamp: function() {
    return Date.now();
  },

  // ─── Rastreamento de m\u00f3dulos ───
  _modulos: {},
  _moduloAtual: null,
  _moduloInicio: null,

  rastrearNavegacao: function(modulo) {
    var agora = this._timestamp();
    if (this._moduloAtual && this._moduloInicio) {
      var tempoGasto = agora - this._moduloInicio;
      this._registrarTempoModulo(this._moduloAtual, tempoGasto);
    }
    this._moduloAtual = modulo;
    this._moduloInicio = agora;

    var s = this._session();
    if (s.modulosVisitados.indexOf(modulo) === -1) s.modulosVisitados.push(modulo);
    s.acoes++;
    this._saveSession(s);
  },

  _registrarTempoModulo: function(modulo, ms) {
    var d = this._carregar();
    if (!d.metricas.modulos[modulo]) d.metricas.modulos[modulo] = { visitas: 0, tempoTotal: 0 };
    d.metricas.modulos[modulo].visitas++;
    d.metricas.modulos[modulo].tempoTotal += ms;
    this._salvar(d);
  },

  // ─── Rastreamento de fluxos ───
  _fluxos: {},

  iniciarFluxo: function(tipo, refId) {
    var key = tipo + '_' + refId;
    this._fluxos[key] = { tipo: tipo, refId: refId, inicio: this._timestamp() };
    return key;
  },

  finalizarFluxo: function(key) {
    if (!this._fluxos[key]) return;
    var fluxo = this._fluxos[key];
    var duracao = this._timestamp() - fluxo.inicio;
    var d = this._carregar();
    if (!d.metricas.fluxos[fluxo.tipo]) d.metricas.fluxos[fluxo.tipo] = { total: 0, count: 0, min: Infinity, max: 0 };
    var f = d.metricas.fluxos[fluxo.tipo];
    f.total += duracao;
    f.count++;
    if (duracao < f.min) f.min = duracao;
    if (duracao > f.max) f.max = duracao;
    this._salvar(d);
    delete this._fluxos[key];
    return duracao;
  },

  // ─── Registro de erro ───
  registrarErro: function(origem, mensagem, dados) {
    var d = this._carregar();
    d.atritos.push({
      id: 'err_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      tipo: 'erro',
      modulo: App.currentModule || origem,
      origem: origem,
      mensagem: mensagem,
      dados: dados || {},
      timestamp: DB._now(),
      gravidade: 'Alto',
      classificado: false,
      lido: false
    });
    this._salvar(d);
    EventTimeline.add('operacao_real.erro', { origem: origem, mensagem: mensagem }, 'operacao_real');
    EventBus.emit('operacao_real.updated');
    this._verificarRecorrencia();
  },

  // ─── Reportar atrito (bot\u00e3o permanente) ───
  reportarAtrito: function(observacao) {
    var d = this._carregar();
    var modulo = App.currentModule || 'desconhecido';
    var ultimosEventos = [];
    try { ultimosEventos = EventTimeline.last(5); } catch(e) {}

    var atrito = {
      id: 'atr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      tipo: 'atrito',
      modulo: modulo,
      moduloLabel: MODULE_TITLES[modulo] || modulo,
      observacao: observacao || '',
      timestamp: DB._now(),
      gravidade: 'M\u00e9dio',
      classificado: false,
      lido: false,
      ultimosEventos: ultimosEventos.map(function(e) { return e.evento + ' (' + (e.timestamp || '') + ')'; })
    };

    // Capturar \u00faltima a\u00e7\u00e3o do Executor se poss\u00edvel
    if (typeof App._ultimaAcao !== 'undefined') {
      atrito.ultimaAcao = App._ultimaAcao;
    }

    d.atritos.push(atrito);

    // Incrementar contador para gera\u00e7\u00e3o de pend\u00eancia
    var chave = (observacao || modulo).toLowerCase().trim();
    d.contadorAtritos[chave] = (d.contadorAtritos[chave] || 0) + 1;

    this._salvar(d);
    EventTimeline.add('operacao_real.atrito', { modulo: modulo, observacao: observacao }, 'operacao_real');
    EventBus.emit('operacao_real.updated');
    this._verificarRecorrencia();
    return atrito;
  },

  // ─── Criar pend\u00eancia automaticamente (3+ ocorr\u00eancias) ───
  _verificarRecorrencia: function() {
    var d = this._carregar();
    for (var chave in d.contadorAtritos) {
      if (d.contadorAtritos[chave] >= 3) {
        var ultimo = null;
        for (var i = d.atritos.length - 1; i >= 0; i--) {
          var a = d.atritos[i];
          var c = (a.observacao || a.modulo || '').toLowerCase().trim();
          if (c === chave) { ultimo = a; break; }
        }
        if (ultimo) {
          this._criarPendencia(ultimo);
          d.contadorAtritos[chave] = 0;
        }
      }
    }
  },

  _criarPendencia: function(atrito) {
    var d = this._carregar();
    var pendId = 'opreal_' + atrito.id;
    var jaExiste = d.melhorias.some(function(m) { return m.pendenciaId === pendId; });
    if (jaExiste) return;

    var score = atrito.gravidade === 'Cr\u00edtico' ? 90 : atrito.gravidade === 'Alto' ? 70 : atrito.gravidade === 'M\u00e9dio' ? 50 : 30;
    var prioridade = atrito.gravidade;

    d.melhorias.push({
      pendenciaId: pendId,
      titulo: 'Atrito recorrente: ' + (atrito.observacao || atrito.moduloLabel || atrito.modulo),
      descricao: 'O atrito "' + (atrito.observacao || '') + '" no m\u00f3dulo ' + (atrito.moduloLabel || atrito.modulo) + ' ocorreu 3 vezes ou mais.',
      modulo: atrito.modulo,
      score: score,
      prioridade: prioridade,
      origem: 'operacao_real',
      criadoEm: DB._now(),
      resolvido: false
    });
    this._salvar(d);

    EventTimeline.add('operacao_real.pendencia', { titulo: atrito.observacao, modulo: atrito.modulo, score: score }, 'operacao_real');
    EventBus.emit('operacao_real.updated');
  },

  // ─── M\u00e9tricas operacionais ───
  getMetricas: function() {
    var d = this._carregar();
    var s = this._session();

    var totalAtritos = d.atritos.length;
    var totalErros = d.atritos.filter(function(a) { return a.tipo === 'erro'; }).length;
    var totalMelhorias = d.melhorias.length;
    var atritosNaoLidos = d.atritos.filter(function(a) { return !a.lido; }).length;

    // M\u00f3dulos mais utilizados
    var modulosRanking = Object.keys(d.metricas.modulos).map(function(k) {
      return { modulo: k, label: MODULE_TITLES[k] || k, visitas: d.metricas.modulos[k].visitas, tempoTotal: d.metricas.modulos[k].tempoTotal, tempoMedio: Math.round(d.metricas.modulos[k].tempoTotal / d.metricas.modulos[k].visitas) };
    });
    modulosRanking.sort(function(a, b) { return b.visitas - a.visitas; });

    // Tempo m\u00e9dio por opera\u00e7\u00e3o (fluxos)
    var fluxos = Object.keys(d.metricas.fluxos).map(function(k) {
      var f = d.metricas.fluxos[k];
      return { tipo: k, media: Math.round(f.total / f.count), count: f.count, total: f.total, min: f.min, max: f.max };
    });
    fluxos.sort(function(a, b) { return b.count - a.count; });

    // Tempo economizado estimado (se o tempo m\u00e9dio for maior que o esperado)
    var tempoEconomizado = 0;
    var temposEsperados = { mensagem_resposta: 120000, agendamento_confirmacao: 300000, atendimento_pagamento: 60000, conclusao_pos: 180000 };
    fluxos.forEach(function(f) {
      var esperado = temposEsperados[f.tipo] || 300000;
      if (esperado > f.media) {
        tempoEconomizado += (esperado - f.media) * f.count;
      }
    });

    // Atritos por gravidade
    var porGravidade = {};
    d.atritos.forEach(function(a) {
      porGravidade[a.gravidade] = (porGravidade[a.gravidade] || 0) + 1;
    });

    return {
      totalAtritos: totalAtritos,
      totalErros: totalErros,
      totalMelhorias: totalMelhorias,
      atritosNaoLidos: atritosNaoLidos,
      sessoes: s.modulosVisitados.length,
      acoesSessao: s.acoes,
      modulosRanking: modulosRanking.slice(0, 10),
      fluxos: fluxos,
      tempoEconomizado: tempoEconomizado,
      porGravidade: porGravidade
    };
  },

  getAtritos: function(filtros) {
    var d = this._carregar();
    var atritos = d.atritos.slice();
    if (filtros) {
      if (filtros.tipo) atritos = atritos.filter(function(a) { return a.tipo === filtros.tipo; });
      if (filtros.modulo) atritos = atritos.filter(function(a) { return a.modulo === filtros.modulo; });
      if (filtros.gravidade) atritos = atritos.filter(function(a) { return a.gravidade === filtros.gravidade; });
    }
    atritos.sort(function(a, b) { return (b.timestamp || '') > (a.timestamp || '') ? 1 : -1; });
    return atritos;
  },

  getMelhorias: function() {
    var d = this._carregar();
    var mel = d.melhorias.slice();
    mel.sort(function(a, b) { return b.score - a.score || ((a.criadoEm || '') > (b.criadoEm || '') ? -1 : 1); });
    return mel;
  },

  marcarLido: function(atritoId) {
    var d = this._carregar();
    for (var i = 0; i < d.atritos.length; i++) {
      if (d.atritos[i].id === atritoId) { d.atritos[i].lido = true; break; }
    }
    this._salvar(d);
    EventBus.emit('operacao_real.updated');
  },

  marcarMelhoriaResolvida: function(pendenciaId) {
    var d = this._carregar();
    for (var i = 0; i < d.melhorias.length; i++) {
      if (d.melhorias[i].pendenciaId === pendenciaId) { d.melhorias[i].resolvido = true; break; }
    }
    this._salvar(d);
    EventBus.emit('operacao_real.updated');
  },

  classificarAtrito: function(atritoId, gravidade) {
    var d = this._carregar();
    for (var i = 0; i < d.atritos.length; i++) {
      if (d.atritos[i].id === atritoId) {
        d.atritos[i].gravidade = gravidade;
        d.atritos[i].classificado = true;
        break;
      }
    }
    this._salvar(d);
    EventBus.emit('operacao_real.updated');
  },

  // ─── Sugest\u00f5es autom\u00e1ticas para Copiloto/Operador ───
  getSugestoesOperacionais: function() {
    var metrics = this.getMetricas();
    var sugestoes = [];

    if (metrics.atritosNaoLidos > 0) {
      sugestoes.push({
        tipo: 'atrito',
        titulo: metrics.atritosNaoLidos + ' atrito(s) n\u00e3o lido(s) registrados',
        score: Math.min(100, metrics.atritosNaoLidos * 15),
        acao: 'operacao_real'
      });
    }

    var d = this._carregar();
    var criticosNaoResolvidos = d.melhorias.filter(function(m) { return !m.resolvido && m.prioridade === 'Cr\u00edtico'; });
    if (criticosNaoResolvidos.length > 0) {
      sugestoes.push({
        tipo: 'melhoria',
        titulo: criticosNaoResolvidos.length + ' melhoria(s) cr\u00edtica(s) aguardando corre\u00e7\u00e3o',
        score: 85,
        acao: 'operacao_real'
      });
    }

    sugestoes.sort(function(a, b) { return b.score - a.score; });
    return sugestoes;
  }
};

// ─── Monkey-patch App._doNavigate para rastrear m\u00f3dulos ───
(function() {
  if (typeof App === 'undefined') return;
  var _origDoNavigate = App._doNavigate;
  App._doNavigate = function(module) {
    if (typeof OperacaoReal !== 'undefined') OperacaoReal.rastrearNavegacao(module);
    return _origDoNavigate.apply(this, arguments);
  };

  App._ultimaAcao = null;
  var _origExecutar = Executor.executar;
  if (typeof Executor !== 'undefined') {
    Executor.executar = function(tipo, payload) {
      App._ultimaAcao = { tipo: tipo, payload: payload, timestamp: DB._now() };
      return _origExecutar.apply(this, arguments);
    };
  }
})();

// ─── Rastrear fluxos via EventBus ───
(function() {
  if (typeof EventBus === 'undefined') return;

  // Tempo entre receber e responder mensagem
  EventBus.on('whatsapp.message.received', function(p) {
    if (p && p.conversaId) OperacaoReal.iniciarFluxo('mensagem_resposta', p.conversaId);
  });
  EventBus.on('whatsapp.message.sent', function(p) {
    if (p && p.conversaId) OperacaoReal.finalizarFluxo('mensagem_resposta_' + p.conversaId);
  });

  // Tempo entre inten\u00e7\u00e3o de agendamento e confirma\u00e7\u00e3o
  EventBus.on('agenda.created', function(p) {
    if (p && p.refId) OperacaoReal.iniciarFluxo('agendamento_confirmacao', p.refId);
  });
  EventBus.on('agenda.confirmed', function(p) {
    if (p && p.refId) OperacaoReal.finalizarFluxo('agendamento_confirmacao_' + p.refId);
  });

  // Tempo entre atendimento e pagamento
  EventBus.on('agenda.updated', function(p) {
    if (p && p.status === 'completed' && p.refId) OperacaoReal.iniciarFluxo('atendimento_pagamento', p.refId);
  });
  EventBus.on('finance.payment.received', function(p) {
    if (p && p.refId) OperacaoReal.finalizarFluxo('atendimento_pagamento_' + p.refId);
  });

  // Tempo entre conclus\u00e3o e p\u00f3s-atendimento
  EventBus.on('crm.updated', function(p) {
    if (p && p.clientId && p.status === 'pos_atendimento') {
      OperacaoReal.finalizarFluxo('conclusao_pos_' + p.clientId);
    }
  });

  // Capturar erros JS
  window.addEventListener('error', function(e) {
    OperacaoReal.registrarErro('javascript', e.message || 'Erro desconhecido', { filename: e.filename, lineno: e.lineno });
  });

  // Capturar promessas rejeitadas
  window.addEventListener('unhandledrejection', function(e) {
    OperacaoReal.registrarErro('promise', e.reason ? e.reason.message || String(e.reason) : 'Promise rejeitada', {});
  });

  // Atualizar operacao_real.updated → copiloto e meudia
  EventBus.on('operacao_real.updated', function() {
    EventBus.emit('copiloto.updated');
    EventBus.emit('meudia.updated');
  });
})();

// ─── Integrar com Pendencias (adicionar tipo atrito) ───
(function() {
  if (typeof Pendencias === 'undefined') return;

  // Adicionar tipo 'atrito' ao Pendencias.TIPOS
  Pendencias.TIPOS.push({ key: 'atrito', label: 'Atritos', icon: '\u26A0' });

  var _origPendenciasCollect = Pendencias.collect;
  Pendencias.collect = function() {
    var items = _origPendenciasCollect ? _origPendenciasCollect() : [];
    try {
      var melhorias = OperacaoReal.getMelhorias().filter(function(m) { return !m.resolvido; });
      melhorias.forEach(function(m) {
        var acoes = Pendencias._carregarAcoes();
        var isResolvida = acoes[m.pendenciaId] && acoes[m.pendenciaId].some(function(a) { return a.tipo === 'concluir' || a.tipo === 'adiar'; });
        if (isResolvida) return;
        var ctx = { notificacaoCritica: m.prioridade === 'Cr\u00edtico' };
        var prio = Prioritizacao.calcular('atrito', ctx);
        items.push({
          id: m.pendenciaId,
          tipo: 'atrito',
          tipoLabel: m.prioridade === 'Cr\u00edtico' ? 'Atrito Cr\u00edtico' : 'Atrito',
          cliente: m.modulo || '',
          clienteId: '',
          origem: 'Opera\u00e7\u00e3o Real',
          prioridade: m.prioridade === 'Cr\u00edtico' ? 'Cr\u00edtica' : m.prioridade === 'Alto' ? 'Alta' : m.prioridade === 'M\u00e9dio' ? 'M\u00e9dia' : 'Baixa',
          score: m.score,
          motivos: [m.titulo, m.descricao],
          data: m.criadoEm ? m.criadoEm.slice(0, 10) : DB._today(),
          tempoEmAberto: Pendencias._getTempoAberto(m.criadoEm),
          responsavel: '',
          acaoTipo: 'operacao_real',
          acaoPayload: {},
          itemOriginal: m
        });
      });
    } catch(e) {}
    items.sort(function(a, b) { return b.score - a.score || (a.data > b.data ? -1 : 1); });
    return items;
  };
})();

// ─── Integrar com Copiloto ───
(function() {
  if (typeof Copiloto === 'undefined') return;
  var _origCopCollect = Copiloto.collect;
  Copiloto.collect = function() {
    var acoes = _origCopCollect ? _origCopCollect() : [];
    try {
      var sugs = OperacaoReal.getSugestoesOperacionais();
      sugs.forEach(function(s) {
        acoes.push({
          categoria: s.tipo === 'atrito' ? 'Atritos' : 'Melhorias',
          quantidade: 1,
          score: s.score,
          prioridade: Priorizacao._label(s.score),
          motivo: s.titulo,
          tipo: 'relatorios',
          acoes: [{ acao: 'Ver', destino: s.acao }]
        });
      });
    } catch(e) {}
    acoes.sort(function(a, b) { return b.score - a.score; });
    return acoes;
  };
})();
