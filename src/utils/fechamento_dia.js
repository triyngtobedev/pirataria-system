const FechamentoDia = {
  KEY: 'pirataria_fechamento',
  KEY_PLANO: 'pirataria_plano_proximo_dia',
  KEY_ULTIMO_DIA: 'pirataria_ultimo_dia_processado',

  // Executa a auditoria do dia
  auditar: function() {
    var hoje = DB._today();
    var ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    var dados = this._coletarDados(hoje);

    var resumo = {
      data: hoje,
      geradoEm: DB._now(),
      pendencias: {
        mensagensSemResposta: dados.responder,
        confirmacoesPendentes: dados.confirmar,
        preAgendamentosNaoConcluidos: dados.preAgendamentos,
        followUpsVencidos: dados.followUps,
        pagamentosPendentes: dados.pagamentos,
        posAtendimentosPendentes: dados.posAtendimentos,
        oportunidadesSemAcao: dados.oportunidades,
        publicacoesNaoRealizadas: dados.publicacoes,
        notificacoesCriticasAbertas: dados.notificacoes
      },
      realizacoes: {
        atendimentosRealizados: dados.atendimentos,
        agendamentosCriados: dados.agendamentosCriados,
        vendasConvertidas: dados.vendas,
        cancelamentos: dados.cancelamentos,
        totalRecebido: dados.totalRecebido
      },
      tarefas: {
        concluidas: dados.tarefasConcluidas,
        transferidas: dados.transferidas
      }
    };

    // Salvar relatório
    dados.pendenciasArray.forEach(function(p) { p.transferido = true; });
    localStorage.setItem(this.KEY, JSON.stringify(resumo));
    localStorage.setItem(this.KEY_ULTIMO_DIA, hoje);

    // Gerar Plano do Dia Seguinte
    this._gerarPlanoProximoDia(dados);

    return resumo;
  },

  _coletarDados: function(hoje) {
    var responder = typeof Inbox.collectWhatsApp === 'function' ? Inbox.collectWhatsApp().filter(function(w) { return w.status === 'aguardando_estudio'; }).length : 0;
    var confirmacoes = Confirmacao.collect ? Confirmacao.collect() : [];
    var confirmar = confirmacoes.filter(function(c) { return c.statusConfirmacao === 'pendente'; }).length;

    var preAgendamentos = 0;
    DB.getConversas().forEach(function(c) { if (c.preAgendamento) { try { var pre = JSON.parse(c.preAgendamento); if (pre && pre.status === 'rascunho') preAgendamentos++; } catch(e) {} } });

    var hojeData = hoje;
    var followUps = 0;
    DB.getClients().forEach(function(cl) { if (cl.crmNextDate && cl.crmNextDate < hojeData && cl.crmNextAction) followUps++; });

    var agendaHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status !== 'cancelled'; });
    var pagamentos = agendaHoje.filter(function(a) { return a.status === 'completed' && a.value; }).length;
    var atendimentos = agendaHoje.filter(function(a) { return a.status === 'completed'; }).length;
    var cancelamentos = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status === 'cancelled'; }).length;
    var agendamentosCriados = agendaHoje.filter(function(a) { return a.createdAt && a.createdAt.slice(0, 10) === hoje; }).length;

    var planosRetornos = typeof PosAtendimento.collectRetornos === 'function' ? PosAtendimento.collectRetornos() : [];
    var posAtendimentos = planosRetornos.filter(function(r) { return r.prioridade <= 1; }).length;

    var ops = typeof Oportunidade.collect === 'function' ? Oportunidade.collect() : [];
    var oportunidades = ops.filter(function(o) { return o.score >= 60; }).length;

    var igData = Marketing.collectInstagram();
    var publicacoes = igData.items.filter(function(i) { return i.isOverdue || (i.isToday && i.statusCalc !== 'publicado'); }).length;

    var notifResumo = typeof Notificacao.collectHojeResumo === 'function' ? Notificacao.collectHojeResumo() : { criticas: 0 };
    var notificacoes = notifResumo.criticas;

    var totalRecebido = 0;
    var ledger = DB.getLedger(hoje);
    ledger.forEach(function(l) { if (l.type === 'entrada') totalRecebido += l.value; });

    var tarefasConcluidas = atendimentos + pagamentos;
    var transferidas = responder + confirmar + preAgendamentos + followUps + pagamentos + posAtendimentos + oportunidades + publicacoes;

    var pendenciasArray = [];
    if (responder > 0) pendenciasArray.push({ origem: 'whatsapp', quantidade: responder, tipo: 'whatsapp', label: 'Mensagens sem resposta' });
    if (confirmar > 0) pendenciasArray.push({ origem: 'confirmacao', quantidade: confirmar, tipo: 'confirmacao', label: 'Confirma\u00e7\u00f5es pendentes' });
    if (preAgendamentos > 0) pendenciasArray.push({ origem: 'agendamento', quantidade: preAgendamentos, tipo: 'pre_agendamento', label: 'Pr\u00e9-agendamentos' });
    if (followUps > 0) pendenciasArray.push({ origem: 'crm', quantidade: followUps, tipo: 'crm', label: 'Follow-ups vencidos' });
    if (pagamentos > 0) pendenciasArray.push({ origem: 'financeiro', quantidade: pagamentos, tipo: 'financeiro', label: 'Pagamentos pendentes' });
    if (posAtendimentos > 0) pendenciasArray.push({ origem: 'posatendimento', quantidade: posAtendimentos, tipo: 'posatendimento', label: 'P\u00f3s-atendimentos' });
    if (oportunidades > 0) pendenciasArray.push({ origem: 'oportunidade', quantidade: oportunidades, tipo: 'oportunidade', label: 'Oportunidades' });
    if (publicacoes > 0) pendenciasArray.push({ origem: 'marketing', quantidade: publicacoes, tipo: 'marketing', label: 'Publica\u00e7\u00f5es' });
    if (notificacoes > 0) pendenciasArray.push({ origem: 'notificacao', quantidade: notificacoes, tipo: 'notificacao', label: 'Notifica\u00e7\u00f5es cr\u00edticas' });

    return {
      responder: responder, confirmar: confirmar, preAgendamentos: preAgendamentos, followUps: followUps,
      pagamentos: pagamentos, posAtendimentos: posAtendimentos, oportunidades: oportunidades,
      publicacoes: publicacoes, notificacoes: notificacoes, atendimentos: atendimentos,
      agendamentosCriados: agendamentosCriados, vendas: 0, cancelamentos: cancelamentos,
      totalRecebido: totalRecebido, tarefasConcluidas: tarefasConcluidas, transferidas: transferidas,
      pendenciasArray: pendenciasArray
    };
  },

  _gerarPlanoProximoDia: function(dados) {
    var transferidas = dados.pendenciasArray.filter(function(p) { return p.quantidade > 0; });
    localStorage.setItem(this.KEY_PLANO, JSON.stringify({
      data: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      geradoEm: DB._now(),
      pendenciasTransferidas: transferidas,
      totalPendencias: dados.transferidas
    }));
  },

  // Recupera o resumo do último fechamento
  getUltimoResumo: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY)); } catch(e) { return null; }
  },

  // Recupera o plano para o próximo dia
  getPlanoProximoDia: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY_PLANO)); } catch(e) { return null; }
  },

  // Verifica se o dia atual já foi processado
  diaJaProcessado: function() {
    var ultimo = localStorage.getItem(this.KEY_ULTIMO_DIA);
    return ultimo === DB._today();
  },

  // Verifica se o sistema foi aberto em um novo dia (precisa de auditoria)
  precisaAuditar: function() {
    if (this.diaJaProcessado()) return false;
    var ultimo = localStorage.getItem(this.KEY_ULTIMO_DIA);
    return ultimo !== null && ultimo !== DB._today();
  },

  // Marcar início de novo dia (chamado no boot)
  iniciarNovoDia: function() {
    if (!this.precisaAuditar()) return null;
    return this.auditar();
  }
};
