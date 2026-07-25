const Reativacao = {
  KEY_ACOES: 'pirataria_reativacao_acoes',

  _carregarAcoes: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY_ACOES)) || {}; } catch(e) { return {}; }
  },

  _salvarAcoes: function(acoes) {
    localStorage.setItem(this.KEY_ACOES, JSON.stringify(acoes));
  },

  _getDiasDesde: function(dataStr) {
    if (!dataStr) return null;
    var diff = Date.now() - new Date(dataStr).getTime();
    return Math.floor(diff / 86400000);
  },

  _getMelhorCanal: function(client) {
    if (!client) return 'whatsapp';
    if (client.instagram && client.phone) return 'whatsapp';
    if (client.instagram) return 'instagram';
    return 'whatsapp';
  },

  _getMelhorHorario: function(client) {
    return '10:00 — 12:00';
  },

  collect: function() {
    var hoje = DB._today();
    var clientes = DB.getClients();
    var acoes = this._carregarAcoes();
    var resultados = [];
    var orcamentos = DB.getOrcamentos();
    var planosConcluidos = DB.getPlanos().filter(function(p) { return p.status === 'concluido'; });

    for (var i = 0; i < clientes.length; i++) {
      var c = clientes[i];

      // Pular se j\u00e1 foi ignorado
      if (acoes[c.id] && acoes[c.id].some(function(a) { return a.tipo === 'ignorar'; })) continue;

      var diasUltimaVisita = this._getDiasDesde(c.lastVisit);
      var diasUltimoContato = this._getDiasDesde(c.updatedAt || c.lastVisit || c.createdAt);
      var totalGasto = 0;
      var frequencia = c.totalVisits || 0;

      // Calcular valor total gasto (do hist\u00f3rico)
      var historico = c.id ? DB.getServiceHistory(c.id) : [];
      historico.forEach(function(h) { totalGasto += parseFloat(h.value) || 0; });

      // Or\u00e7amentos n\u00e3o convertidos
      var orcNaoConvertidos = orcamentos.filter(function(o) {
        return o.clientId === c.id && (o.status === 'enviado' || o.status === 'visualizado' || o.status === 'aprovado');
      });
      var temOrcNaoConvertido = orcNaoConvertidos.length > 0;

      // P\u00f3s-atendimento conclu\u00eddo
      var posConcluido = planosConcluidos.some(function(p) { return p.clientId === c.id; });

      // Cancelamentos anteriores
      var totalCancelamentos = 0;
      var appointments = DB.getAppointments().filter(function(a) { return a.clientId === c.id; });
      appointments.forEach(function(a) {
        if (a.status === 'cancelled') totalCancelamentos++;
      });

      // Perfil da Mem\u00f3ria Operacional
      var perfilMem = null;
      try { perfilMem = MemoriaOperacional.getPerfilCliente(c.id); } catch(e) {}

      // Probabilidade de convers\u00e3o
      var probConversao = perfilMem ? perfilMem.scoreRelacionamento : 50;
      var probLabel = perfilMem ? perfilMem.probabilidadeConversao : 'M\u00e9dia';

      // VIP
      var isVip = (c.totalVisits || 0) >= 3;

      // Crit\u00e9rios de reativa\u00e7\u00e3o
      var criterios = [];
      if (diasUltimaVisita !== null && diasUltimaVisita > 60) criterios.push('\u00daltima visita h\u00e1 ' + diasUltimaVisita + ' dias');
      if (diasUltimoContato !== null && diasUltimoContato > 30) criterios.push('Sem contato h\u00e1 ' + diasUltimoContato + ' dias');
      if (frequencia >= 3) criterios.push('Cliente frequente (' + frequencia + ' visitas)');
      if (frequencia >= 2 && diasUltimaVisita !== null && diasUltimaVisita > 90) criterios.push('Cliente recorrente ausente');
      if (totalGasto > 500) criterios.push('Alto valor gasto (R$ ' + totalGasto.toFixed(2).replace('.', ',') + ')');
      if (isVip) criterios.push('Cliente VIP (' + (c.totalVisits || 0) + ' atendimentos)');
      if (temOrcNaoConvertido) criterios.push(orcNaoConvertidos.length + ' or\u00e7amento(s) n\u00e3o convertido(s)');
      if (posConcluido) criterios.push('P\u00f3s-atendimento conclu\u00eddo');
      if (totalCancelamentos > 0) criterios.push(totalCancelamentos + ' cancelamento(s) anterior(es)');
      if (c.crmStatus === 'perdido') criterios.push('Cliente perdido — tentar reativa\u00e7\u00e3o');

      // Pular se n\u00e3o atende a nenhum crit\u00e9rio relevante
      if (criterios.length === 0 && diasUltimaVisita !== null && diasUltimaVisita <= 60) continue;
      if (criterios.length === 0 && diasUltimaVisita === null) continue;

      // Calcular score base
      var ctx = {
        ultimaInteracao: c.lastVisit || c.createdAt,
        clienteVip: isVip,
        followUpVencido: diasUltimaVisita !== null && diasUltimaVisita > 60
      };
      var prioBase = Prioritizacao.calcular('reativacao', ctx);
      var scoreFinal = prioBase.score;

      // Ajustes por valor gasto
      if (totalGasto > 1000) scoreFinal += 10;
      else if (totalGasto > 500) scoreFinal += 5;

      // Ajuste por or\u00e7amento pendente
      if (temOrcNaoConvertido) scoreFinal += 10;

      // Ajuste por p\u00f3s-atendimento conclu\u00eddo
      if (posConcluido) scoreFinal += 5;

      // Ajuste por probabilidade de convers\u00e3o da Mem\u00f3ria Operacional
      if (probConversao >= 80) scoreFinal += 10;
      else if (probConversao >= 60) scoreFinal += 5;

      scoreFinal = Math.max(0, Math.min(100, scoreFinal));

      // Classificar
      var classificacao = 'baixa_prioridade';
      if (scoreFinal >= 70) classificacao = 'contatar_hoje';
      else if (scoreFinal >= 45) classificacao = 'esta_semana';

      // Verificar se tem hor\u00e1rios ociosos (booster)
      var boosterOciosidade = 0;
      try {
        var capHoje = Capacidade.hoje();
        if (capHoje.horasDisponiveis >= 2 && scoreFinal >= 50) {
          boosterOciosidade = 10;
          scoreFinal = Math.min(100, scoreFinal + boosterOciosidade);
          if (scoreFinal >= 70) classificacao = 'contatar_hoje';
          else if (scoreFinal >= 45) classificacao = 'esta_semana';
          criterios.push('Janela livre na agenda (+' + boosterOciosidade + ' pts)');
        }
      } catch(e) {}

      var ultimoServico = '';
      if (historico.length > 0) {
        ultimoServico = historico[historico.length - 1].service || '';
      } else if (appointments.length > 0) {
        var lastApt = appointments.sort(function(a, b) { return (b.date || '') > (a.date || '') ? 1 : -1; })[0];
        ultimoServico = lastApt.service || '';
      }

      resultados.push({
        id: c.id,
        clientId: c.id,
        nome: c.name,
        phone: c.phone || '',
        instagram: c.instagram || '',
        ultimaVisita: c.lastVisit || '—',
        diasSemRetorno: diasUltimaVisita !== null ? diasUltimaVisita : diasUltimoContato || 0,
        ultimoServico: ultimoServico,
        totalGasto: totalGasto,
        totalVisitas: frequencia,
        score: scoreFinal,
        classificacao: classificacao,
        criterios: criterios,
        canalRecomendado: Reativacao._getMelhorCanal(c),
        melhorHorario: Reativacao._getMelhorHorario(c),
        isVip: isVip,
        probConversao: probConversao,
        probLabel: probLabel,
        boosterOciosidade: boosterOciosidade,
        statusCRM: c.crmStatus || 'novo_contato',
        temOrcamento: temOrcNaoConvertido
      });
    }

    resultados.sort(function(a, b) { return b.score - a.score; });
    return resultados;
  },

  getContadores: function() {
    var todos = this.collect();
    return {
      total: todos.length,
      contatarHoje: todos.filter(function(c) { return c.classificacao === 'contatar_hoje'; }).length,
      estaSemana: todos.filter(function(c) { return c.classificacao === 'esta_semana'; }).length,
      baixaPrioridade: todos.filter(function(c) { return c.classificacao === 'baixa_prioridade'; }).length,
      vips: todos.filter(function(c) { return c.isVip; }).length
    };
  },

  search: function(items, query) {
    if (!query || !query.trim()) return items;
    var q = query.toLowerCase().trim();
    return items.filter(function(c) {
      return (c.nome && c.nome.toLowerCase().indexOf(q) >= 0)
        || (c.ultimoServico && c.ultimoServico.toLowerCase().indexOf(q) >= 0)
        || (c.phone && c.phone.indexOf(q) >= 0);
    });
  },

  filtrar: function(items, filtros) {
    if (!filtros) return items;
    if (filtros.classificacao && filtros.classificacao !== 'todas') {
      items = items.filter(function(c) { return c.classificacao === filtros.classificacao; });
    }
    if (filtros.vip === true) {
      items = items.filter(function(c) { return c.isVip; });
    }
    if (filtros.canal) {
      items = items.filter(function(c) { return c.canalRecomendado === filtros.canal; });
    }
    if (filtros.diasMax !== undefined && filtros.diasMax !== null) {
      items = items.filter(function(c) { return c.diasSemRetorno <= filtros.diasMax; });
    }
    if (filtros.diasMin !== undefined && filtros.diasMin !== null) {
      items = items.filter(function(c) { return c.diasSemRetorno >= filtros.diasMin; });
    }
    if (filtros.scoreMin !== undefined && filtros.scoreMin !== null) {
      items = items.filter(function(c) { return c.score >= filtros.scoreMin; });
    }
    if (filtros.servico) {
      items = items.filter(function(c) { return c.ultimoServico && c.ultimoServico.indexOf(filtros.servico) >= 0; });
    }
    return items;
  },

  ordenar: function(items, campo, ordem) {
    var dir = ordem === 'asc' ? 1 : -1;
    var sorted = items.slice();
    sorted.sort(function(a, b) {
      var va, vb;
      if (campo === 'score') { va = a.score; vb = b.score; }
      else if (campo === 'nome') { va = a.nome; vb = b.nome; }
      else if (campo === 'dias') { va = a.diasSemRetorno; vb = b.diasSemRetorno; }
      else if (campo === 'gasto') { va = a.totalGasto; vb = b.totalGasto; }
      else { va = a.score; vb = b.score; }
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return 0;
    });
    return sorted;
  },

  _registrarAcao: function(clientId, tipoAcao, payload) {
    var acoes = this._carregarAcoes();
    if (!acoes[clientId]) acoes[clientId] = [];
    acoes[clientId].push({ tipo: tipoAcao, data: DB._now(), payload: payload || {} });
    this._salvarAcoes(acoes);
    EventTimeline.add('reativacao.' + tipoAcao, { clientId: clientId, tipo: tipoAcao }, 'reativacao', clientId);
    EventBus.emit('reativacao.updated');
  },

  registrarAcoesExecutor: function() {
    Executor.registrar('reativacao.abrir', function(p) {
      var ids = p && p.ids ? (Array.isArray(p.ids) ? p.ids : [p.ids]) : [];
      ids.forEach(function(id) {
        var client = DB.getClient(id);
        if (client) {
          if (typeof App.openClientPanel === 'function') App.openClientPanel(id);
          else App.navigate('clientes');
        }
      });
    });

    Executor.registrar('reativacao.followup', function(p) {
      var ids = p && p.ids ? (Array.isArray(p.ids) ? p.ids : [p.ids]) : [];
      var hoje = DB._today();
      ids.forEach(function(id) {
        var client = DB.getClient(id);
        if (client) {
          CRM.setNextAction(id, 'Reativar contato \u2014 retorno ap\u00f3s per\u00edodo sem visita', hoje, 'high', 'Sugerido pelo módulo de Reativação');
          Reativacao._registrarAcao(id, 'followup', { data: hoje });
        }
      });
      if (typeof App !== 'undefined' && App._toast) App._toast('Tarefa de follow-up criada para ' + ids.length + ' cliente(s)', 'success');
    });

    Executor.registrar('reativacao.adiar', function(p) {
      var ids = p && p.ids ? (Array.isArray(p.ids) ? p.ids : [p.ids]) : [];
      ids.forEach(function(id) { Reativacao._registrarAcao(id, 'adiar', { data: DB._today() }); });
      if (typeof App !== 'undefined' && App._toast) App._toast(ids.length + ' cliente(s) adiado(s)', 'info');
    });

    Executor.registrar('reativacao.ignorar', function(p) {
      var ids = p && p.ids ? (Array.isArray(p.ids) ? p.ids : [p.ids]) : [];
      ids.forEach(function(id) { Reativacao._registrarAcao(id, 'ignorar', {}); });
      if (typeof App !== 'undefined' && App._toast) App._toast(ids.length + ' cliente(s) ignorado(s)', 'info');
    });
  }
};

// Auto-registrar a\u00e7\u00f5es no Executor
Reativacao.registrarAcoesExecutor();

// Integrar com Operador: adicionar reativa\u00e7\u00e3o \u00e0 fila operacional quando houver capacidade
(function() {
  var _opGerarFilaOriginal = null;
  if (typeof Operador !== 'undefined' && Operador._gerarFila) {
    _opGerarFilaOriginal = Operador._gerarFila;
    Operador._gerarFila = function() {
      var fila = _opGerarFilaOriginal ? _opGerarFilaOriginal() : [];
      try {
        var reativacoes = Reativacao.collect();
        var contatarHoje = reativacoes.filter(function(r) { return r.classificacao === 'contatar_hoje'; });
        contatarHoje.forEach(function(r) {
          fila.push({
            id: 'reat_' + r.id + '_' + Date.now().toString(36),
            categoria: 'Reativar',
            origem: 'Reativa\u00e7\u00e3o',
            score: r.score,
            impacto: r.criterios.slice(0, 2).join('; '),
            urgencia: 1,
            cliente: r.nome,
            acao: 'Abrir conversa',
            tipo: 'reativacao.abrir',
            payload: { ids: [r.clientId] },
            status: 'pendente',
            motivos: r.criterios.slice(0, 3),
            tempoEstimado: ''
          });
        });
      } catch(e) {}
      fila.sort(function(a, b) { return b.score - a.score; });
      return fila;
    };
  }
})();

// Integrar com Copiloto
(function() {
  var _copCollectOriginal = null;
  if (typeof Copiloto !== 'undefined' && Copiloto.collect) {
    _copCollectOriginal = Copiloto.collect;
    Copiloto.collect = function() {
      var acoes = _copCollectOriginal ? _copCollectOriginal() : [];
      try {
        var reativacoes = Reativacao.collect();
        var contatarHoje = reativacoes.filter(function(r) { return r.classificacao === 'contatar_hoje'; });
        if (contatarHoje.length > 0) {
          acoes.push({
            categoria: 'Reativar',
            quantidade: contatarHoje.length,
            score: Math.max.apply(null, contatarHoje.map(function(r) { return r.score; })),
            prioridade: Priorizacao._label(Math.max.apply(null, contatarHoje.map(function(r) { return r.score; }))),
            motivo: contatarHoje.length + ' cliente(s) com alta probabilidade de retorno' + (contatarHoje[0].boosterOciosidade > 0 ? ' (hor\u00e1rios ociosos dispon\u00edveis)' : ''),
            tipo: 'reativacao',
            acoes: contatarHoje.map(function(r) { return { clientId: r.clientId, nome: r.nome, score: r.score }; })
          });
        }
      } catch(e) {}
      acoes.sort(function(a, b) { return b.score - a.score; });
      return acoes;
    };
  }
})();

// Auto-registrar atualiza\u00e7\u00e3o via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('capacidade.updated', function() { EventBus.emit('reativacao.updated'); });
  EventBus.on('crm.updated', function() { EventBus.emit('reativacao.updated'); });
  EventBus.on('finance.payment.received', function() { EventBus.emit('reativacao.updated'); });
  EventBus.on('reativacao.updated', function() {
    EventBus.emit('copiloto.updated');
    EventBus.emit('meudia.updated');
  });
})();
