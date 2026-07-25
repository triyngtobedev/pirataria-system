const DiarioOperacional = {
  KEY: 'pirataria_diario_cache',
  KEY_ANOTACOES: 'pirataria_diario_anotacoes',

  _carregarCache: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch(e) { return {}; }
  },

  _salvarCache: function(cache) {
    localStorage.setItem(this.KEY, JSON.stringify(cache));
  },

  _carregarAnotacoes: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY_ANOTACOES)) || []; } catch(e) { return []; }
  },

  _salvarAnotacoes: function(anotacoes) {
    localStorage.setItem(this.KEY_ANOTACOES, JSON.stringify(anotacoes));
  },

  _hoje: function() {
    return new Date().toISOString().slice(0, 10);
  },

  _diaAnterior: function(data) {
    var d = new Date(data + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  },

  _diasAtras: function(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  },

  _formatarData: function(dataStr) {
    var d = new Date(dataStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, function(c) { return c.toUpperCase(); });
  },

  _diffDias: function(a, b) {
    return Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000);
  },

  _eventoParaIndicador: function(evento) {
    var mapa = {
      'agenda.created': 'agendamentos_criados',
      'agenda.cancelled': 'cancelamentos',
      'agenda.confirmed': 'confirmacoes',
      'agenda.updated': 'agendamentos_atualizados',
      'whatsapp.message.received': 'mensagens_recebidas',
      'whatsapp.message.sent': 'mensagens_enviadas',
      'finance.payment.received': 'pagamentos',
      'crm.updated': 'crm_alteracoes',
      'marketing.post.completed': 'publicacoes',
      'notification.created': 'notificacoes',
      'reativacao.followup': 'reativacoes',
      'operacao_real.atrito': 'atritos',
      'operacao_real.erro': 'problemas',
      'operacao_real.pendencia': 'melhorias_aplicadas',
      'pendencias.concluir': 'pendencias_resolvidas'
    };
    return mapa[evento] || 'outros';
  },

  _indicadorLabel: function(key) {
    var labels = {
      agendamentos_criados: 'Agendamentos criados',
      cancelamentos: 'Cancelamentos',
      confirmacoes: 'Confirma\u00e7\u00f5es',
      agendamentos_atualizados: 'Agendamentos atualizados',
      mensagens_recebidas: 'Mensagens recebidas',
      mensagens_enviadas: 'Mensagens enviadas',
      pagamentos: 'Pagamentos',
      crm_alteracoes: 'Altera\u00e7\u00f5es no CRM',
      publicacoes: 'Publica\u00e7\u00f5es',
      notificacoes: 'Notifica\u00e7\u00f5es',
      reativacoes: 'Reativa\u00e7\u00f5es',
      atritos: 'Atritos registrados',
      problemas: 'Problemas encontrados',
      melhorias_aplicadas: 'Melhorias aplicadas',
      pendencias_resolvidas: 'Pend\u00eancias resolvidas',
      outros: 'Outros eventos'
    };
    return labels[key] || key;
  },

  _indicadorIcon: function(key) {
    var icons = {
      agendamentos_criados: '\uD83D\uDCC5',
      cancelamentos: '\u274C',
      confirmacoes: '\u2705',
      mensagens_recebidas: '\uD83D\uDCE8',
      mensagens_enviadas: '\uD83D\uDCE4',
      pagamentos: '\uD83D\uDCB0',
      reativacoes: '\uD83D\uDD04',
      publicacoes: '\uD83D\uDCF7',
      atritos: '\u26A0',
      problemas: '\u274C',
      melhorias_aplicadas: '\u2728',
      notificacoes: '\uD83D\uDD14',
      pendencias_resolvidas: '\u2705',
      crm_alteracoes: '\uD83D\uDCCB',
      outros: '\uD83D\uDCCA'
    };
    return icons[key] || '\u2022';
  },

  // Agregar eventos da Timeline por dia - \u00fanica fonte de dados
  _agregarPorDia: function(data) {
    var inicio = data + 'T00:00:00';
    var fim = data + 'T23:59:59';

    var eventos = EventTimeline.list({ desde: inicio, ate: fim });
    var indicadores = {};
    var detalhes = [];

    eventos.forEach(function(e) {
      var chave = DiarioOperacional._eventoParaIndicador(e.evento);
      indicadores[chave] = (indicadores[chave] || 0) + 1;
      detalhes.push({
        horario: e.timestamp ? e.timestamp.slice(11, 19) : '--:--:--',
        evento: e.evento,
        modulo: e.modulo || '',
        entidade: e.entidade || '',
        payload: e.payload || {}
      });
    });

    detalhes.sort(function(a, b) { return (a.horario > b.horario ? 1 : -1); });

    return { data: data, indicadores: indicadores, detalhes: detalhes, total: eventos.length };
  },

  // Resumo de um dia espec\u00edfico
  resumoDiario: function(data) {
    data = data || this._hoje();
    var agregado = this._agregarPorDia(data);
    var dataAnterior = this._diaAnterior(data);
    var agregadoAnterior = this._agregarPorDia(dataAnterior);

    // Compara\u00e7\u00e3o com dia anterior
    var comparacao = {};
    Object.keys(agregado.indicadores).forEach(function(k) {
      var atual = agregado.indicadores[k] || 0;
      var anterior = agregadoAnterior.indicadores[k] || 0;
      var diff = atual - anterior;
      var pct = anterior > 0 ? Math.round(diff / anterior * 100) : (atual > 0 ? 100 : 0);
      comparacao[k] = { atual: atual, anterior: anterior, diff: diff, pct: pct };
    });

    // Gargalos detectados
    var gargalos = [];
    if (agregado.indicadores.atritos > 2) gargalos.push(agregado.indicadores.atritos + ' atritos registrados — revisar fluxos afetados');
    if (agregado.indicadores.problemas > 0) gargalos.push(agregado.indicadores.problemas + ' erro(s) no sistema');
    if (agregado.indicadores.cancelamentos > agregado.indicadores.confirmacoes) gargalos.push('Cancelamentos (' + agregado.indicadores.cancelamentos + ') superaram confirma\u00e7\u00f5es (' + (agregado.indicadores.confirmacoes || 0) + ')');
    if (agregado.indicadores.mensagens_recebidas > 0 && (agregado.indicadores.mensagens_enviadas || 0) < (agregado.indicadores.mensagens_recebidas || 0) * 0.5) {
      gargalos.push('Menos da metade das mensagens recebidas foram respondidas');
    }

    // Conquistas
    var conquistas = [];
    if (agregado.indicadores.agendamentos_criados > 0) conquistas.push(agregado.indicadores.agendamentos_criados + ' agendamento(s) criado(s)');
    if (agregado.indicadores.confirmacoes > 0) conquistas.push(agregado.indicadores.confirmacoes + ' confirma\u00e7\u00e3o(o\u00f5es) realizada(s)');
    if (agregado.indicadores.pagamentos > 0) conquistas.push(agregado.indicadores.pagamentos + ' pagamento(s) registrado(s)');
    if (agregado.indicadores.reativacoes > 0) conquistas.push(agregado.indicadores.reativacoes + ' reativa\u00e7\u00e3o(\u00f5es) de cliente');
    if (agregado.indicadores.melhorias_aplicadas > 0) conquistas.push(agregado.indicadores.melhorias_aplicadas + ' melhoria(s) aplicada(s)');
    if (agregado.indicadores.publicacoes > 0) conquistas.push(agregado.indicadores.publicacoes + ' publica\u00e7\u00e3o(\u00f5es) realizada(s)');
    if (agregado.indicadores.mensagens_enviadas > 10) conquistas.push('Alto volume de atendimento: ' + agregado.indicadores.mensagens_enviadas + ' mensagens enviadas');

    // M\u00f3dulos mais acionados
    var modulos = {};
    agregado.detalhes.forEach(function(d) {
      if (d.modulo) modulos[d.modulo] = (modulos[d.modulo] || 0) + 1;
    });
    var modulosRanking = Object.keys(modulos).map(function(k) { return { modulo: k, quantidade: modulos[k] }; });
    modulosRanking.sort(function(a, b) { return b.quantidade - a.quantidade; });

    return {
      data: data,
      dataLabel: this._formatarData(data),
      totalEventos: agregado.total,
      indicadores: agregado.indicadores,
      comparacao: comparacao,
      detalhes: agregado.detalhes,
      gargalos: gargalos,
      conquistas: conquistas,
      modulosRanking: modulosRanking
    };
  },

  // Resumo de per\u00edodo
  resumoPeriodo: function(dias) {
    dias = dias || 7;
    var resultados = [];
    for (var i = dias - 1; i >= 0; i--) {
      var data = this._diasAtras(i);
      resultados.push(this.resumoDiario(data));
    }
    return resultados;
  },

  // Indicadores consolidados do per\u00edodo
  indicadoresPeriodo: function(dias) {
    dias = dias || 7;
    var resumos = this.resumoPeriodo(dias);
    var consolidado = {};
    var totalEventos = 0;

    resumos.forEach(function(r) {
      totalEventos += r.totalEventos;
      Object.keys(r.indicadores).forEach(function(k) {
        consolidado[k] = (consolidado[k] || 0) + r.indicadores[k];
      });
    });

    var indicadoresArray = Object.keys(consolidado).map(function(k) {
      return {
        chave: k,
        label: DiarioOperacional._indicadorLabel(k),
        icon: DiarioOperacional._indicadorIcon(k),
        quantidade: consolidado[k],
        mediaDiaria: Math.round(consolidado[k] / dias)
      };
    });
    indicadoresArray.sort(function(a, b) { return b.quantidade - a.quantidade; });

    return { dias: dias, totalEventos: totalEventos, indicadores: indicadoresArray, resumos: resumos };
  },

  // Busca textual nos detalhes
  buscar: function(query, dias) {
    dias = dias || 30;
    var resumos = this.resumoPeriodo(dias);
    var q = query.toLowerCase().trim();
    if (!q) return resumos;

    var resultados = [];
    resumos.forEach(function(r) {
      var detalhesFiltrados = r.detalhes.filter(function(d) {
        return (d.evento && d.evento.toLowerCase().indexOf(q) >= 0)
          || (d.modulo && d.modulo.toLowerCase().indexOf(q) >= 0)
          || (d.entidade && d.entidade.toLowerCase().indexOf(q) >= 0)
          || (d.payload && JSON.stringify(d.payload).toLowerCase().indexOf(q) >= 0);
      });
      if (detalhesFiltrados.length > 0) {
        resultados.push({
          data: r.data,
          dataLabel: r.dataLabel,
          totalEventos: detalhesFiltrados.length,
          detalhes: detalhesFiltrados
        });
      }
    });
    return resultados;
  },

  // Exporta\u00e7\u00e3o JSON
  exportarJSON: function(dias) {
    var resumos = this.resumoPeriodo(dias || 7);
    var dados = resumos.map(function(r) {
      return { data: r.data, indicadores: r.indicadores, totalEventos: r.totalEventos, gargalos: r.gargalos, conquistas: r.conquistas };
    });
    return JSON.stringify(dados, null, 2);
  },

  // Exporta\u00e7\u00e3o CSV
  exportarCSV: function(dias) {
    var resumos = this.resumoPeriodo(dias || 7);
    var cabecalho = 'data,indicador,quantidade';
    var linhas = [];
    resumos.forEach(function(r) {
      Object.keys(r.indicadores).forEach(function(k) {
        linhas.push(r.data + ',' + k + ',' + (r.indicadores[k] || 0));
      });
    });
    return cabecalho + '\n' + linhas.join('\n');
  },

  // Anota\u00e7\u00f5es do operador no di\u00e1rio
  adicionarAnotacao: function(data, texto) {
    var anotacoes = this._carregarAnotacoes();
    anotacoes.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), data: data || this._hoje(), texto: texto, criadoEm: DB._now() });
    this._salvarAnotacoes(anotacoes);
    EventTimeline.add('diario.anotacao', { data: data, texto: texto }, 'diario_operacional');
    EventBus.emit('diario_operacional.updated');
  },

  getAnotacoes: function(data) {
    var anotacoes = this._carregarAnotacoes();
    if (data) return anotacoes.filter(function(a) { return a.data === data; });
    return anotacoes;
  }
};

// Atualizar em tempo real conforme novos eventos forem publicados
(function() {
  if (typeof EventBus === 'undefined') return;
  var eventosParaAtualizar = [
    'agenda.created', 'agenda.updated', 'agenda.cancelled', 'agenda.confirmed',
    'whatsapp.message.received', 'whatsapp.message.sent',
    'crm.updated', 'finance.payment.received',
    'marketing.post.completed', 'notification.created',
    'operacao_real.atrito', 'operacao_real.erro', 'operacao_real.pendencia',
    'reativacao.followup', 'pendencias.concluir'
  ];
  eventosParaAtualizar.forEach(function(evt) {
    EventBus.on(evt, function() {
      EventBus.emit('diario_operacional.updated');
    });
  });
})();
