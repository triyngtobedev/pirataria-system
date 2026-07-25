const AcoesPrioritarias = {
  KEY: 'pirataria_acoes_queue',
  _carregar: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch(e) { return []; }
  },
  _salvar: function(acoes) {
    localStorage.setItem(this.KEY, JSON.stringify(acoes));
  },

  _hoje: function() {
    return new Date().toISOString().slice(0, 10);
  },

  _id: function() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  },

  _classificar: function(score) {
    if (score >= 80) return 'Cr\u00edtico';
    if (score >= 60) return 'Alto';
    if (score >= 40) return 'M\u00e9dio';
    return 'Baixo';
  },

  _prazo: function(prioridade) {
    if (prioridade === 'Cr\u00edtico') return '24h';
    if (prioridade === 'Alto') return '48h';
    if (prioridade === 'M\u00e9dio') return '7 dias';
    return '14 dias';
  },

  _prioridadeNumerica: function(label) {
    var map = { 'Cr\u00edtico': 0, 'Alto': 1, 'M\u00e9dio': 2, 'Baixo': 3 };
    return map[label] !== undefined ? map[label] : 4;
  },

  // Gerar fila de a\u00e7\u00f5es consumindo dados dos m\u00f3dulos existentes
  gerar: function() {
    var acoes = [];
    var hoje = this._hoje();

    // 1. Gargalos operacionais → a\u00e7\u00f5es corretivas
    try {
      var gargalos = GargalosOperacionais.getSugestoes();
      gargalos.forEach(function(g) {
        acoes.push({
          id: AcoesPrioritarias._id(),
          titulo: 'Corrigir: ' + g.titulo,
          motivo: g.descricao,
          prioridade: g.prioridade,
          prioridadeNum: AcoesPrioritarias._prioridadeNumerica(g.prioridade),
          impacto: g.impacto,
          tempoEstimado: g.prioridade === 'Cr\u00edtico' ? '30min' : g.prioridade === 'Alto' ? '1h' : '2h',
          origem: 'Gargalos Operacionais',
          responsavel: g.responsavelSugerido || 'Administrador',
          prazoRecomendado: g.prazo,
          status: 'pendente',
          score: g.score,
          criadoEm: hoje,
          recomendacao: g.recomendacao
        });
      });
    } catch(e) {}

    // 2. Di\u00e1rio Operacional → gargalos do dia e conquistas pendentes
    try {
      var diario = DiarioOperacional.resumoDiario();
      diario.gargalos.forEach(function(g) {
        var score = 60;
        acoes.push({
          id: AcoesPrioritarias._id(),
          titulo: 'Resolver: ' + g,
          motivo: g,
          prioridade: 'Alto',
          prioridadeNum: 1,
          impacto: 'Gargalo identificado no resumo do dia',
          tempoEstimado: '1h',
          origem: 'Di\u00e1rio Operacional',
          responsavel: 'Administrador',
          prazoRecomendado: '48h',
          status: 'pendente',
          score: score,
          criadoEm: hoje,
          recomendacao: 'Revisar indicadores do dia e identificar causa raiz'
        });
      });
    } catch(e) {}

    // 3. EventTimeline → a\u00e7\u00f5es baseadas em eventos recentes
    try {
      var recentes = EventTimeline.last(50);
      var atritosRecentes = recentes.filter(function(e) { return e.evento.indexOf('operacao_real.atrito') >= 0; });
      if (atritosRecentes.length >= 2) {
        acoes.push({
          id: AcoesPrioritarias._id(),
          titulo: 'Revisar ' + atritosRecentes.length + ' atritos recentes',
          motivo: atritosRecentes.length + ' atritos registrados nas \u00faltimas opera\u00e7\u00f5es',
          prioridade: atritosRecentes.length >= 4 ? 'Cr\u00edtico' : 'Alto',
          prioridadeNum: atritosRecentes.length >= 4 ? 0 : 1,
          impacto: 'Fric\u00e7\u00e3o operacional pode estar afetando o atendimento',
          tempoEstimado: '30min',
          origem: 'Opera\u00e7\u00e3o Real',
          responsavel: 'Administrador',
          prazoRecomendado: atritosRecentes.length >= 4 ? '24h' : '48h',
          status: 'pendente',
          score: Math.min(90, 50 + atritosRecentes.length * 10),
          criadoEm: hoje,
          recomendacao: 'Abrir tela de Opera\u00e7\u00e3o Real e revisar atritos n\u00e3o lidos'
        });
      }

      var cancelamentosRecentes = recentes.filter(function(e) { return e.evento === 'agenda.cancelled'; });
      if (cancelamentosRecentes.length >= 3) {
        acoes.push({
          id: AcoesPrioritarias._id(),
          titulo: cancelamentosRecentes.length + ' cancelamentos recentes — revisar padr\u00e3o',
          motivo: 'Volume elevado de cancelamentos nas \u00faltimas transa\u00e7\u00f5es',
          prioridade: 'Alto',
          prioridadeNum: 1,
          impacto: 'Perda de faturamento e ociosidade na agenda',
          tempoEstimado: '1h',
          origem: 'Agenda',
          responsavel: 'Administrador',
          prazoRecomendado: '48h',
          status: 'pendente',
          score: 65,
          criadoEm: hoje,
          recomendacao: 'Refor\u00e7ar confirma\u00e7\u00e3o pr\u00e9via e criar lista de espera'
        });
      }
    } catch(e) {}

    // 4. Mem\u00f3ria Operacional → insights que viram a\u00e7\u00f5es
    try {
      var insights = MemoriaOperacional.getInsights();
      insights.forEach(function(i) {
        if (i.tipo === 'alerta') {
          acoes.push({
            id: AcoesPrioritarias._id(),
            titulo: 'Aten\u00e7\u00e3o: ' + i.label,
            motivo: i.valor + ' — ' + (i.tendencia || 'requer aten\u00e7\u00e3o'),
            prioridade: 'M\u00e9dio',
            prioridadeNum: 2,
            impacto: i.label,
            tempoEstimado: '30min',
            origem: 'Mem\u00f3ria Operacional',
            responsavel: 'Administrador',
            prazoRecomendado: '7 dias',
            status: 'pendente',
            score: 50,
            criadoEm: hoje,
            recomendacao: 'Revisar dados e tomar a\u00e7\u00e3o corretiva'
          });
        }
      });
    } catch(e) {}

    // 5. Di\u00e1rio do per\u00edodo → tend\u00eancias de 7 dias
    try {
      var periodo = DiarioOperacional.indicadoresPeriodo(7);
      var agendCriados = 0;
      periodo.indicadores.forEach(function(ind) {
        if (ind.chave === 'agendamentos_criados') agendCriados = ind.quantidade;
      });
      if (agendCriados === 0 && periodo.totalEventos > 10) {
        acoes.push({
          id: AcoesPrioritarias._id(),
          titulo: 'Nenhum agendamento criado nos \u00faltimos 7 dias',
          motivo: 'Zero agendamentos apesar de ' + periodo.totalEventos + ' eventos no per\u00edodo',
          prioridade: 'Alto',
          prioridadeNum: 1,
          impacto: 'Queda na capta\u00e7\u00e3o de novos clientes',
          tempoEstimado: '2h',
          origem: 'Di\u00e1rio Operacional',
          responsavel: 'Administrador',
          prazoRecomendado: '48h',
          status: 'pendente',
          score: 70,
          criadoEm: hoje,
          recomendacao: 'Avaliar fluxo de capta\u00e7\u00e3o e campanhas ativas'
        });
      }

      var pendsNaoResolvidas = 0;
      periodo.indicadores.forEach(function(ind) {
        if (ind.chave === 'pendencias_resolvidas') pendsNaoResolvidas = ind.quantidade;
      });
      var atritos = 0;
      periodo.indicadores.forEach(function(ind) {
        if (ind.chave === 'atritos') atritos = ind.quantidade;
      });
      if (atritos > pendsNaoResolvidas && atritos > 3) {
        acoes.push({
          id: AcoesPrioritarias._id(),
          titulo: 'Atritos (' + atritos + ') superam melhorias aplicadas (' + pendsNaoResolvidas + ')',
          motivo: 'Mais problemas sendo registrados do que resolvidos',
          prioridade: 'Cr\u00edtico',
          prioridadeNum: 0,
          impacto: 'Acumulo de problemas operacionais',
          tempoEstimado: '1h',
          origem: 'Di\u00e1rio Operacional',
          responsavel: 'Administrador',
          prazoRecomendado: '24h',
          status: 'pendente',
          score: 80,
          criadoEm: hoje,
          recomendacao: 'Priorizar resolu\u00e7\u00e3o dos atritos mais recentes'
        });
      }
    } catch(e) {}

    // 6. Opera\u00e7\u00f5es pendentes do Operador (se ativo)
    try {
      if (typeof Operador !== 'undefined' && Operador._ativo) {
        var fila = Operador.getQueue();
        var pendentesOp = fila.filter(function(f) { return f.status === 'pendente'; });
        if (pendentesOp.length > 5) {
          acoes.push({
            id: AcoesPrioritarias._id(),
            titulo: pendentesOp.length + ' tarefas na fila do Operador',
            motivo: 'Fila operacional acumulada com tarefas pendentes',
            prioridade: 'M\u00e9dio',
            prioridadeNum: 2,
            impacto: 'Sobrecarga do Operador Aut\u00f4nomo',
            tempoEstimado: '30min',
            origem: 'Operador',
            responsavel: 'Administrador',
            prazoRecomendado: '7 dias',
            status: 'pendente',
            score: 45,
            criadoEm: hoje,
            recomendacao: 'Revisar fila e delegar tarefas por prioridade'
          });
        }
      }
    } catch(e) {}

    // Ordenar por prioridade (score decrescente)
    acoes.sort(function(a, b) {
      if (a.prioridadeNum !== b.prioridadeNum) return a.prioridadeNum - b.prioridadeNum;
      return (b.score || 0) - (a.score || 0);
    });

    return acoes;
  },

  // Obter fila consolidada (gera + carrega estado persistido)
  getFila: function() {
    var geradas = this.gerar();
    var persistidas = this._carregar();

    // Mesclar: a\u00e7\u00f5es persistidas mant\u00eam status; novas a\u00e7\u00f5es s\u00e3o adicionadas
    var mapaPersistidas = {};
    persistidas.forEach(function(a) { mapaPersistidas[a.id] = a; });

    geradas.forEach(function(g) {
      if (mapaPersistidas[g.id]) {
        g.status = mapaPersistidas[g.id].status;
      }
    });

    // Manter a\u00e7\u00f5es ignoradas que ainda s\u00e3o relevantes
    var ignoradasValidas = persistidas.filter(function(p) {
      return p.status === 'ignorada' || p.status === 'concluida';
    });

    var fila = geradas.concat(ignoradasValidas);
    fila.sort(function(a, b) {
      var ordemStatus = { pendente: 0, em_execucao: 1, concluida: 2, ignorada: 3 };
      var sa = ordemStatus[a.status] !== undefined ? ordemStatus[a.status] : 0;
      var sb = ordemStatus[b.status] !== undefined ? ordemStatus[b.status] : 0;
      if (sa !== sb) return sa - sb;
      if (a.prioridadeNum !== b.prioridadeNum) return a.prioridadeNum - b.prioridadeNum;
      return (b.score || 0) - (a.score || 0);
    });

    return fila;
  },

  // Persistir a\u00e7\u00f5es (para manter estado entre sess\u00f5es)
  persistir: function(acoes) {
    this._salvar(acoes);
  },

  // Marcar a\u00e7\u00e3o como conclu\u00edda
  concluir: function(acaoId) {
    var acoes = this._carregar();
    var acao = null;
    for (var i = 0; i < acoes.length; i++) {
      if (acoes[i].id === acaoId) { acoes[i].status = 'concluida'; acao = acoes[i]; break; }
    }
    if (!acao) {
      var geradas = this.gerar();
      for (var j = 0; j < geradas.length; j++) {
        if (geradas[j].id === acaoId) { geradas[j].status = 'concluida'; acoes.push(geradas[j]); break; }
      }
    }
    this._salvar(acoes);
    EventTimeline.add('acoes_prioritarias.completed', { acaoId: acaoId }, 'acoes_prioritarias');
    EventBus.emit('acoes_prioritarias.completed', { acaoId: acaoId });
    EventBus.emit('acoes_prioritarias.updated');
  },

  // Adiar a\u00e7\u00e3o
  adiar: function(acaoId) {
    var acoes = this._carregar();
    var encontrou = false;
    for (var i = 0; i < acoes.length; i++) {
      if (acoes[i].id === acaoId) { acoes[i].status = 'pendente'; encontrou = true; break; }
    }
    if (!encontrou) {
      var geradas = this.gerar();
      for (var j = 0; j < geradas.length; j++) {
        if (geradas[j].id === acaoId) { geradas[j].status = 'pendente'; acoes.push(geradas[j]); break; }
      }
    }
    this._salvar(acoes);
    EventTimeline.add('acoes_prioritarias.updated', { acaoId: acaoId, acao: 'adiar' }, 'acoes_prioritarias');
    EventBus.emit('acoes_prioritarias.updated');
  },

  // Ignorar a\u00e7\u00e3o
  ignorar: function(acaoId) {
    var acoes = this._carregar();
    var encontrou = false;
    for (var i = 0; i < acoes.length; i++) {
      if (acoes[i].id === acaoId) { acoes[i].status = 'ignorada'; encontrou = true; break; }
    }
    if (!encontrou) {
      var geradas = this.gerar();
      for (var j = 0; j < geradas.length; j++) {
        if (geradas[j].id === acaoId) { geradas[j].status = 'ignorada'; acoes.push(geradas[j]); break; }
      }
    }
    this._salvar(acoes);
    EventTimeline.add('acoes_prioritarias.dismissed', { acaoId: acaoId }, 'acoes_prioritarias');
    EventBus.emit('acoes_prioritarias.dismissed', { acaoId: acaoId });
    EventBus.emit('acoes_prioritarias.updated');
  },

  // Filtrar
  filtrar: function(items, filtros) {
    if (!filtros) return items;
    if (filtros.prioridade && filtros.prioridade !== 'todas') {
      items = items.filter(function(a) { return a.prioridade === filtros.prioridade; });
    }
    if (filtros.origem) {
      items = items.filter(function(a) { return a.origem.indexOf(filtros.origem) >= 0; });
    }
    if (filtros.status && filtros.status !== 'todas') {
      items = items.filter(function(a) { return a.status === filtros.status; });
    }
    if (filtros.responsavel) {
      items = items.filter(function(a) { return a.responsavel && a.responsavel.indexOf(filtros.responsavel) >= 0; });
    }
    return items;
  },

  // Buscar
  buscar: function(items, query) {
    if (!query || !query.trim()) return items;
    var q = query.toLowerCase().trim();
    return items.filter(function(a) {
      return (a.titulo && a.titulo.toLowerCase().indexOf(q) >= 0)
        || (a.motivo && a.motivo.toLowerCase().indexOf(q) >= 0)
        || (a.origem && a.origem.toLowerCase().indexOf(q) >= 0)
        || (a.recomendacao && a.recomendacao.toLowerCase().indexOf(q) >= 0);
    });
  },

  // Sugest\u00f5es para Copiloto/Operador
  getSugestoes: function() {
    var fila = this.getFila();
    var pendentes = fila.filter(function(a) { return a.status === 'pendente'; });
    var criticos = pendentes.filter(function(a) { return a.prioridade === 'Cr\u00edtico'; });
    if (criticos.length > 0) {
      return [{
        tipo: 'acoes',
        titulo: criticos.length + ' a\u00e7\u00f5es cr\u00edticas pendentes',
        score: 90,
        acao: 'acoes_prioritarias'
      }];
    }
    if (pendentes.length > 5) {
      return [{
        tipo: 'acoes',
        titulo: pendentes.length + ' a\u00e7\u00f5es priorit\u00e1rias aguardando',
        score: 60,
        acao: 'acoes_prioritarias'
      }];
    }
    return [];
  }
};

// Auto-registrar atualiza\u00e7\u00e3o via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  var eventos = [
    'gargalos_operacionais.updated', 'diario_operacional.updated',
    'operacao_real.atrito', 'operacao_real.erro', 'operacao_real.pendencia',
    'agenda.created', 'agenda.cancelled', 'agenda.confirmed',
    'whatsapp.message.received', 'whatsapp.message.sent',
    'finance.payment.received', 'crm.updated',
    'pendencias.concluir'
  ];
  eventos.forEach(function(evt) {
    EventBus.on(evt, function() {
      EventBus.emit('acoes_prioritarias.updated');
    });
  });
})();

// Integrar com Copiloto
(function() {
  if (typeof Copiloto === 'undefined') return;
  var _origCopCollect = Copiloto.collect;
  Copiloto.collect = function() {
    var acoes = _origCopCollect ? _origCopCollect() : [];
    try {
      var sugs = AcoesPrioritarias.getSugestoes();
      sugs.forEach(function(s) {
        acoes.push({
          categoria: 'A\u00e7\u00f5es Priorit\u00e1rias',
          quantidade: 1,
          score: s.score,
          prioridade: s.score >= 80 ? 'Cr\u00edtica' : s.score >= 60 ? 'Alta' : 'M\u00e9dia',
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
