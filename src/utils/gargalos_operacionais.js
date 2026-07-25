const GargalosOperacionais = {
  KEY: 'pirataria_gargalos_cache',
  _carregar: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || { historico: [], ultimaAnalise: null }; } catch(e) { return { historico: [], ultimaAnalise: null }; }
  },
  _salvar: function(d) {
    localStorage.setItem(this.KEY, JSON.stringify(d));
  },

  _hoje: function() {
    return new Date().toISOString().slice(0, 10);
  },

  _diasAtras: function(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  },

  _eventosDoPeriodo: function(dias, filtroEvento) {
    var desde = this._diasAtras(dias) + 'T00:00:00';
    var ate = this._hoje() + 'T23:59:59';
    var eventos = EventTimeline.list({ desde: desde, ate: ate });
    if (filtroEvento) eventos = eventos.filter(function(e) { return e.evento.indexOf(filtroEvento) >= 0; });
    return eventos;
  },

  _diasComEvento: function(evento, dias) {
    var eventos = this._eventosDoPeriodo(dias, evento);
    var diasSet = {};
    eventos.forEach(function(e) {
      if (e.timestamp) diasSet[e.timestamp.slice(0, 10)] = true;
    });
    return Object.keys(diasSet).length;
  },

  // ─── 9 regras de detec\u00e7\u00e3o ───
  _regras: [
    {
      id: 'excesso_cancelamentos',
      label: 'Excesso de cancelamentos',
      detectar: function(dados) {
        var cancel = dados.consolidado.cancelamentos || 0;
        var confirm = dados.consolidado.confirmacoes || 0;
        var total = cancel + confirm;
        if (total === 0) return null;
        var taxaCancel = Math.round(cancel / total * 100);
        if (taxaCancel >= 40) {
          return { score: Math.min(90, 50 + taxaCancel), taxa: taxaCancel, cancel: cancel, confirm: confirm };
        }
        return null;
      }
    },
    {
      id: 'baixa_taxa_confirmacao',
      label: 'Baixa taxa de confirma\u00e7\u00e3o',
      detectar: function(dados) {
        var criados = dados.consolidado.agendamentos_criados || 0;
        var confirm = dados.consolidado.confirmacoes || 0;
        if (criados === 0) return null;
        var taxaConf = Math.round(confirm / criados * 100);
        if (taxaConf < 50 && criados >= 3) {
          return { score: Math.min(85, 70 - taxaConf), criados: criados, confirm: confirm, taxa: taxaConf };
        }
        return null;
      }
    },
    {
      id: 'demora_primeiro_atendimento',
      label: 'Demora no primeiro atendimento',
      detectar: function(dados) {
        var recebidas = dados.consolidado.mensagens_recebidas || 0;
        var enviadas = dados.consolidado.mensagens_enviadas || 0;
        if (recebidas === 0) return null;
        var taxaResp = Math.round(enviadas / recebidas * 100);
        if (taxaResp < 40 && recebidas >= 5) {
          return { score: Math.min(80, 60 - taxaResp), recebidas: recebidas, enviadas: enviadas, taxa: taxaResp };
        }
        return null;
      }
    },
    {
      id: 'clientes_sem_retorno',
      label: 'Clientes sem retorno',
      detectar: function(dados) {
        var pagamentos = dados.consolidado.pagamentos || 0;
        var reativacoes = dados.consolidado.reativacoes || 0;
        var crmAlt = dados.consolidado.crm_alteracoes || 0;
        if (pagamentos > 10 && reativacoes < 2 && crmAlt < 3) {
          return { score: 70, pagamentos: pagamentos, reativacoes: reativacoes, crmAlt: crmAlt };
        }
        if (pagamentos > 0 && reativacoes === 0) {
          return { score: 50, pagamentos: pagamentos, reativacoes: 0, crmAlt: crmAlt };
        }
        return null;
      }
    },
    {
      id: 'excesso_pendencias',
      label: 'Excesso de pend\u00eancias',
      detectar: function(dados) {
        var pends = dados.consolidado.pendencias_resolvidas || 0;
        var atritos = dados.consolidado.atritos || 0;
        var pendAbertas = dados.eventosAbertos || 0;
        var totalPend = pends + atritos + pendAbertas;
        if (totalPend > 15) {
          return { score: Math.min(85, 50 + totalPend), resolvidas: pends, abertas: pendAbertas, total: totalPend };
        }
        return null;
      }
    },
    {
      id: 'reativacoes_sem_resposta',
      label: 'Reativa\u00e7\u00f5es sem resposta',
      detectar: function(dados) {
        var reativacoes = dados.consolidado.reativacoes || 0;
        var crmAlt = dados.consolidado.crm_alteracoes || 0;
        if (reativacoes > 3 && crmAlt < reativacoes * 0.3) {
          return { score: 65, reativacoes: reativacoes, crmAlt: crmAlt, taxa: Math.round(crmAlt / reativacoes * 100) };
        }
        return null;
      }
    },
    {
      id: 'dias_baixa_conversao',
      label: 'Dias com baixa convers\u00e3o',
      detectar: function(dados) {
        var diasBaixa = 0;
        dados.resumos.forEach(function(r) {
          var criados = r.indicadores.agendamentos_criados || 0;
          var pagamentos = r.indicadores.pagamentos || 0;
          if (criados === 0 && pagamentos === 0) diasBaixa++;
        });
        var totalDias = dados.resumos.length;
        if (totalDias >= 3 && diasBaixa >= Math.ceil(totalDias * 0.4)) {
          return { score: Math.min(80, 40 + diasBaixa * 10), diasBaixa: diasBaixa, totalDias: totalDias };
        }
        return null;
      }
    },
    {
      id: 'problemas_repetitivos',
      label: 'Problemas repetitivos',
      detectar: function(dados) {
        var problemas = dados.consolidado.problemas || 0;
        if (problemas >= 3) {
          return { score: Math.min(85, 50 + problemas * 10), problemas: problemas };
        }
        return null;
      }
    },
    {
      id: 'atritos_recorrentes',
      label: 'Atritos recorrentes',
      detectar: function(dados) {
        var atritos = dados.consolidado.atritos || 0;
        var diasComAtrito = GargalosOperacionais._diasComEvento('operacao_real.atrito', 7);
        if (atritos >= 5 && diasComAtrito >= 3) {
          return { score: Math.min(90, 50 + atritos * 5), atritos: atritos, dias: diasComAtrito };
        }
        return null;
      }
    }
  ],

  // ─── An\u00e1lise completa ───
  analisar: function() {
    var diario = typeof DiarioOperacional !== 'undefined' ? DiarioOperacional : null;
    if (!diario) return { gargalos: [], dataAnalise: this._hoje() };

    var indicadoresPeriodo = diario.indicadoresPeriodo(7);
    var diasParaComparacao = 14;
    var periodoAnterior = diario.indicadoresPeriodo(diasParaComparacao);

    var eventosAbertos = 0;
    try {
      if (typeof Pendencias !== 'undefined') {
        eventosAbertos = Pendencias.collect().length;
      }
    } catch(e) {}

    var dados = {
      consolidado: indicadoresPeriodo.indicadores.reduce(function(acc, ind) {
        acc[ind.chave] = ind.quantidade;
        return acc;
      }, {}),
      resumos: indicadoresPeriodo.resumos,
      eventosAbertos: eventosAbertos
    };

    var gargalos = [];
    this._regras.forEach(function(regra) {
      try {
        var resultado = regra.detectar(dados);
        if (resultado) {
          gargalos.push(GargalosOperacionais._montarGargalo(regra, resultado, dados));
        }
      } catch(e) {}
    });

    gargalos.sort(function(a, b) { return b.score - a.score; });

    var analise = {
      dataAnalise: this._hoje(),
      gargalos: gargalos,
      metricas: dados.consolidado,
      totalGargalos: gargalos.length,
      criticos: gargalos.filter(function(g) { return g.prioridade === 'Cr\u00edtico'; }).length,
      altos: gargalos.filter(function(g) { return g.prioridade === 'Alto'; }).length
    };

    var cache = this._carregar();
    cache.ultimaAnalise = analise;
    cache.historico.push({ data: this._hoje(), quantidade: gargalos.length, criticos: analise.criticos });
    if (cache.historico.length > 90) cache.historico = cache.historico.slice(-90);
    this._salvar(cache);

    EventTimeline.add('gargalos.analisados', { total: gargalos.length, criticos: analise.criticos }, 'gargalos_operacionais');
    return analise;
  },

  _montarGargalo: function(regra, resultado, dados) {
    var score = resultado.score;
    var prioridade = score >= 80 ? 'Cr\u00edtico' : score >= 60 ? 'Alto' : score >= 40 ? 'M\u00e9dio' : 'Baixo';

    var impactos = {
      excesso_cancelamentos: 'Perda de faturamento e ociosidade na agenda',
      baixa_taxa_confirmacao: 'Incerteza na programa\u00e7\u00e3o do dia',
      demora_primeiro_atendimento: 'Risco de perda de leads',
      clientes_sem_retorno: 'Base de clientes estagnada',
      excesso_pendencias: 'Sobrecarga operacional',
      reativacoes_sem_resposta: 'Esfor\u00e7o de reativa\u00e7\u00e3o desperdi\u00e7ado',
      dias_baixa_conversao: 'Ociosidade na agenda por per\u00edodos prolongados',
      problemas_repetitivos: 'Instabilidade no sistema',
      atritos_recorrentes: 'Fric\u00e7\u00e3o operacional cont\u00ednua'
    };

    var causas = {
      excesso_cancelamentos: 'Poss\u00edvel falta de confirma\u00e7\u00e3o pr\u00e9via ou conflito de hor\u00e1rios',
      baixa_taxa_confirmacao: 'Clientes n\u00e3o est\u00e3o sendo contatados para confirmar',
      demora_primeiro_atendimento: 'Ac\u00famulo de mensagens no inbox sem triagem',
      clientes_sem_retorno: 'Aus\u00eancia de follow-up p\u00f3s-atendimento',
      excesso_pendencias: 'Tarefas acumuladas sem prioriza\u00e7\u00e3o',
      reativacoes_sem_resposta: 'Contato ineficaz ou canal inadequado',
      dias_baixa_conversao: 'Falta de promo\u00e7\u00f5es ou contato proativo',
      problemas_repetitivos: 'Corre\u00e7\u00f5es n\u00e3o aplicadas ou reincidentes',
      atritos_recorrentes: 'Fluxos n\u00e3o ajustados ap\u00f3s reporte inicial'
    };

    var recomendacoes = {
      excesso_cancelamentos: 'Refor\u00e7ar confirma\u00e7\u00e3o 24h antes e criar lista de espera',
      baixa_taxa_confirmacao: 'Ativar confirma\u00e7\u00e3o autom\u00e1tica via WhatsApp para agendamentos pendentes',
      demora_primeiro_atendimento: 'Implementar triagem r\u00e1pida no inbox e respostas autom\u00e1ticas para d\u00favidas comuns',
      clientes_sem_retorno: 'Criar rotina de follow-up para clientes com mais de 60 dias sem visita',
      excesso_pendencias: 'Revisar pend\u00eancias diariamente no in\u00edcio do expediente e delegar por prioridade',
      reativacoes_sem_resposta: 'Testar canal alternativo (Instagram) e personalizar abordagem',
      dias_baixa_conversao: 'Programar a\u00e7\u00f5es de marketing para dias de baixa ocupa\u00e7\u00e3o',
      problemas_repetitivos: 'Priorizar corre\u00e7\u00e3o definitiva dos problemas com maior recorr\u00eancia',
      atritos_recorrentes: 'Revisar fluxos reportados e implementar melhorias nos m\u00f3dulos afetados'
    };

    return {
      id: regra.id + '_' + Date.now().toString(36),
      regraId: regra.id,
      titulo: regra.label,
      descricao: GargalosOperacionais._formatarDescricao(regra.id, resultado),
      prioridade: prioridade,
      score: score,
      impacto: impactos[regra.id] || 'Impacto operacional',
      causaProvavel: causas[regra.id] || 'N\u00e3o identificada',
      recomendacao: recomendacoes[regra.id] || 'Revisar processo',
      responsavelSugerido: 'Administrador',
      prazoRecomendado: prioridade === 'Cr\u00edtico' ? '24h' : prioridade === 'Alto' ? '48h' : '7 dias',
      detectadoEm: this._hoje(),
      resolvido: false,
      resultado: resultado
    };
  },

  _formatarDescricao: function(regraId, r) {
    var descs = {
      excesso_cancelamentos: r.taxa + '% de cancelamento (' + r.cancel + ' cancelados / ' + (r.cancel + r.confirm) + ' total)',
      baixa_taxa_confirmacao: 'Apenas ' + r.taxa + '% de confirma\u00e7\u00e3o (' + r.confirm + ' confirmados de ' + r.criados + ' criados)',
      demora_primeiro_atendimento: 'Apenas ' + r.taxa + '% das mensagens foram respondidas (' + r.enviadas + ' enviadas de ' + r.recebidas + ' recebidas)',
      clientes_sem_retorno: r.pagamentos + ' pagamentos registrados, mas apenas ' + r.reativacoes + ' reativa\u00e7\u00f5es',
      excesso_pendencias: r.total + ' pend\u00eancias em aberto no per\u00edodo',
      reativacoes_sem_resposta: r.reativacoes + ' reativa\u00e7\u00f5es com apenas ' + r.taxa + '% de retorno',
      dias_baixa_conversao: r.diasBaixa + ' dias sem atividade em ' + r.totalDias + ' dias analisados',
      problemas_repetitivos: r.problemas + ' problemas registrados no per\u00edodo',
      atritos_recorrentes: r.atritos + ' atritos em ' + r.dias + ' dias diferentes'
    };
    return descs[regraId] || '';
  },

  // ─── An\u00e1lise r\u00e1pida para Copiloto/Operador ───
  getSugestoes: function() {
    var analise = this.analisar();
    return analise.gargalos.map(function(g) {
      return {
        tipo: 'gargalo',
        id: g.id,
        titulo: g.titulo,
        descricao: g.descricao,
        prioridade: g.prioridade,
        score: g.score,
        impacto: g.impacto,
        causa: g.causaProvavel,
        recomendacao: g.recomendacao,
        prazo: g.prazoRecomendado
      };
    });
  },

  marcarResolvido: function(gargaloId) {
    var cache = this._carregar();
    if (cache.ultimaAnalise) {
      for (var i = 0; i < cache.ultimaAnalise.gargalos.length; i++) {
        if (cache.ultimaAnalise.gargalos[i].id === gargaloId) {
          cache.ultimaAnalise.gargalos[i].resolvido = true;
          break;
        }
      }
    }
    this._salvar(cache);
    EventTimeline.add('gargalos.resolvido', { gargaloId: gargaloId }, 'gargalos_operacionais');
    EventBus.emit('gargalos_operacionais.updated');
  },

  getHistorico: function() {
    var cache = this._carregar();
    return cache.historico || [];
  }
};

// ─── Auto-registrar no EventBus ───
(function() {
  if (typeof EventBus === 'undefined') return;
  var eventosRefresh = [
    'diario_operacional.updated', 'operacao_real.atrito', 'operacao_real.erro',
    'agenda.cancelled', 'agenda.confirmed', 'agenda.created',
    'whatsapp.message.received', 'whatsapp.message.sent',
    'finance.payment.received', 'pendencias.concluir'
  ];
  eventosRefresh.forEach(function(evt) {
    EventBus.on(evt, function() {
      EventBus.emit('gargalos_operacionais.updated');
    });
  });
})();
