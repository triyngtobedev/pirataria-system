const PosAtendimento = {
  ETAPAS_PADRAO: [
    { label: '7 dias', dias: 7 },
    { label: '15 dias', dias: 15 },
    { label: '30 dias', dias: 30 },
    { label: '60 dias', dias: 60 },
    { label: '90 dias', dias: 90 }
  ],

  SERVICOS_COM_ACOMPANHAMENTO: ['Piercing'],

  criarPlano: function(clientId, atendimentoId, procedimento, profissional, dataProcedimento) {
    if (!clientId || !procedimento) return null;
    var precisaAcompanhamento = this.SERVICOS_COM_ACOMPANHAMENTO.some(function(s) {
      return procedimento.toLowerCase().indexOf(s.toLowerCase()) >= 0;
    });
    if (!precisaAcompanhamento) return null;

    var planosExistentes = DB.getPlanosByClient(clientId);
    var temAtivo = planosExistentes.some(function(p) { return p.status === 'ativo'; });
    if (temAtivo) return null;

    var plano = DB.addPlano({ clientId: clientId, atendimentoId: atendimentoId, procedimento: procedimento, profissional: profissional, dataProcedimento: dataProcedimento || DB._today() });

    var hoje = new Date(plano.dataProcedimento);
    this.ETAPAS_PADRAO.forEach(function(etapa) {
      var dataPrevista = new Date(hoje.getTime() + etapa.dias * 86400000);
      DB.addEtapa({ planoId: plano.id, label: etapa.label, dias: etapa.dias, dataPrevista: dataPrevista.toISOString().slice(0, 10), status: 'pendente' });
    });

    CRM.addTimeline(clientId, 'plano_criado', 'Plano de acompanhamento criado para ' + procedimento, plano.id);
    return plano;
  },

  concluirEtapa: function(etapaId, observacao) {
    var etapa = DB._get('etapasAcompanhamento').find(function(e) { return e.id === etapaId; });
    if (!etapa || etapa.status !== 'pendente') return null;
    DB.updateEtapa(etapaId, { status: 'concluida', dataConclusao: DB._now(), observacao: observacao || '' });

    var plano = DB.getPlano(etapa.planoId);
    if (plano) {
      var etapas = DB.getEtapas(plano.id);
      var indiceAtual = etapas.findIndex(function(e) { return e.id === etapaId; });
      DB.updatePlano(plano.id, { etapaAtual: indiceAtual + 1 });
      CRM.addTimeline(plano.clientId, 'etapa_concluida', 'Etapa ' + etapa.label + ' conclu\u00edda: ' + (observacao || ''), plano.id);

      var todasConcluidas = etapas.every(function(e) { return e.status === 'concluida' || e.id === etapaId; });
      var agoraConcluidas = etapas.filter(function(e) { return e.status === 'concluida' || e.id === etapaId; }).length === etapas.length;
      if (agoraConcluidas) {
        DB.updatePlano(plano.id, { status: 'concluido' });
        CRM.addTimeline(plano.clientId, 'plano_concluido', 'Plano de acompanhamento conclu\u00eddo', plano.id);
      }
    }
    return etapa;
  },

  ignorarEtapa: function(etapaId) {
    DB.updateEtapa(etapaId, { status: 'ignorada' });
  },

  getPlanosAtivos: function() {
    return DB.getPlanosAtivos();
  },

  getEtapasPendentes: function(planoId) {
    return DB.getEtapas(planoId).filter(function(e) { return e.status === 'pendente'; });
  },

  collectRetornos: function() {
    var today = DB._today();
    var tresDias = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    var resultados = [];

    var planos = DB.getPlanosAtivos();
    for (var i = 0; i < planos.length; i++) {
      var p = planos[i];
      var etapas = DB.getEtapas(p.id);
      for (var j = 0; j < etapas.length; j++) {
        var e = etapas[j];
        if (e.status !== 'pendente') continue;
        if (!e.dataPrevista) continue;

        var isOverdue = e.dataPrevista < today;
        var isToday = e.dataPrevista === today;
        var isSoon = e.dataPrevista <= tresDias;
        if (!isOverdue && !isToday && !isSoon) continue;

        var client = DB.getClient(p.clientId);
        var prio = isOverdue ? 0 : isToday ? 1 : 2;
        var badge = isOverdue ? 'Atrasada' : isToday ? 'Hoje' : 'Pr\u00f3ximos dias';
        var badgeType = isOverdue ? 'danger' : isToday ? 'warning' : 'info';
        var icon = isOverdue ? '\u26A0' : '\u23F0';

        resultados.push({
          id: 'pos_' + e.id,
          clientName: client ? client.name : '—',
          clientId: p.clientId,
          planoId: p.id,
          etapaId: e.id,
          procedimento: p.procedimento || '',
          etapa: e.label,
          dataPrevista: e.dataPrevista,
          prioridade: prio,
          icon: icon,
          badge: badge,
          badgeType: badgeType,
          desc: (p.procedimento || '') + ' \u2014 ' + e.label + ' (' + e.dataPrevista + ')'
        });
      }
    }

    resultados.sort(function(a, b) { return a.prioridade - b.prioridade || (a.dataPrevista > b.dataPrevista ? 1 : -1); });
    return resultados;
  },

  getMetrics: function() {
    var planos = DB.getPlanos();
    var ativos = planos.filter(function(p) { return p.status === 'ativo'; }).length;
    var concluidos = planos.filter(function(p) { return p.status === 'concluido'; }).length;
    var etapasVencidas = DB.getEtapasVencidas().length;
    var allEtapas = DB._get('etapasAcompanhamento');
    var concluidas = allEtapas.filter(function(e) { return e.status === 'concluida'; }).length;
    var totalEtapas = allEtapas.length;
    var taxa = totalEtapas > 0 ? Math.round(concluidas / totalEtapas * 100) : 0;
    return { ativos: ativos, concluidos: concluidos, etapasVencidas: etapasVencidas, retornosRealizados: concluidas, taxaAcompanhamento: taxa, clientesFidelizados: concluidos };
  }
};
