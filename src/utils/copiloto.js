const Copiloto = {
  // Retorna ações operacionais agrupadas por categoria
  collect: function() {
    var hoje = DB._today();
    var acoes = [];

    // 1. Responder (WhatsApp sem resposta)
    var wpp = typeof Inbox.collectWhatsApp === 'function' ? Inbox.collectWhatsApp() : [];
    var responder = wpp.filter(function(w) { return w.status === 'aguardando_estudio'; });
    if (responder.length > 0) {
      var score = 0;
      responder.forEach(function(w) {
        var ctx = { mensagemNaoRespondida: true, ultimaInteracao: w.ultimaInteracao, aguardandoResposta: true };
        var s = Prioritizacao.calcular('whatsapp', ctx).score;
        if (s > score) score = s;
      });
      var maisAntigo = responder.reduce(function(a, b) { return (a.tempoDesdeUltima || 0) > (b.tempoDesdeUltima || 0) ? a : b; });
      acoes.push({
        id: 'cop_responder', categoria: 'Responder', quantidade: responder.length,
        score: score, prioridade: Prioritizacao._label(score),
        motivo: maisAntigo.clientName + ' aguarda h\u00e1 ' + maisAntigo.tempoLabel,
        tipo: 'whatsapp', payload: {}
      });
    }

    // 2. Confirmar (confirmações pendentes)
    var confirmacoes = Confirmacao.collect();
    var pendentes = confirmacoes.filter(function(c) { return c.statusConfirmacao === 'pendente'; });
    if (pendentes.length > 0) {
      var score = 0;
      pendentes.forEach(function(c) {
        var ctx = { pendenteConfirmacao: true, horario: c.time, data: c.date, isToday: c.isToday };
        var s = Prioritizacao.calcular('confirmacao', ctx).score;
        if (s > score) score = s;
      });
      var maisUrgente = pendentes.reduce(function(a, b) { return (a.diffHours || 999) < (b.diffHours || 999) ? a : b; });
      acoes.push({
        id: 'cop_confirmar', categoria: 'Confirmar', quantidade: pendentes.length,
        score: score, prioridade: Prioritizacao._label(score),
        motivo: (maisUrgente.isToday ? 'Hoje: ' : '') + maisUrgente.clientName + ' \u00e0s ' + maisUrgente.time,
        tipo: 'confirmacao', payload: {}
      });
    }

    // 3. Agendar (pré-agendamentos e intenções)
    var preAgendamentos = 0;
    DB.getConversas().forEach(function(c) {
      if (c.preAgendamento) { try { var pre = JSON.parse(c.preAgendamento); if (pre && pre.status === 'rascunho') preAgendamentos++; } catch(e) {} }
    });
    var intencoes = 0;
    var conversasAtivas = DB.getConversas().filter(function(c2) { return c2.status !== 'encerrada'; });
    conversasAtivas.forEach(function(c) {
      var msgs = DB.getMensagens(c.id);
      for (var i = 0; i < msgs.length; i++) {
        if (msgs[i].type === 'recebida' && AgendamentoAssistente.detectarIntencao(msgs[i].content)) { intencoes++; break; }
      }
    });
    var totalAgendar = preAgendamentos + intencoes;
    if (totalAgendar > 0) {
      var ctx = { pendenteConfirmacao: true };
      var score = Prioritizacao.calcular('agendamento', ctx).score;
      acoes.push({
        id: 'cop_agendar', categoria: 'Agendar', quantidade: totalAgendar,
        score: score, prioridade: Prioritizacao._label(score),
        motivo: (preAgendamentos > 0 ? preAgendamentos + ' pr\u00e9-agendamento' + (preAgendamentos !== 1 ? 's' : '') : '') + (preAgendamentos > 0 && intencoes > 0 ? ' + ' : '') + (intencoes > 0 ? intencoes + ' inten\u00e7\u00f5es' : ''),
        tipo: 'pre_agendamento', payload: {}
      });
    }

    // 4. Cobrar (pagamentos pendentes)
    var agendaHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status !== 'cancelled'; });
    var doneToday = agendaHoje.filter(function(a) { return a.status === 'completed' && a.value; });
    if (doneToday.length > 0) {
      var ctx = { pagamentoPendente: true };
      var score = Prioritizacao.calcular('financeiro', ctx).score;
      acoes.push({
        id: 'cop_cobrar', categoria: 'Cobrar', quantidade: doneToday.length,
        score: score, prioridade: Prioritizacao._label(score),
        motivo: doneToday[0].clientName + ' — R$ ' + (doneToday[0].value || '0'),
        tipo: 'financeiro', payload: {}
      });
    }

    // 5. Reagendar (etapas vencidas + CRM follow-up)
    var planosRetornos = typeof PosAtendimento.collectRetornos === 'function' ? PosAtendimento.collectRetornos() : [];
    var vencidos = planosRetornos.filter(function(r) { return r.prioridade <= 1; });
    var crmVencidos = 0;
    DB.getClients().forEach(function(cl) {
      if (cl.crmNextDate && cl.crmNextDate < hoje && cl.crmNextAction) crmVencidos++;
    });
    var totalReagendar = vencidos.length + crmVencidos;
    if (totalReagendar > 0) {
      var score = 0;
      vencidos.forEach(function(r) {
        var ctx = { followUpVencido: true, ultimaInteracao: r.dataPrevista };
        var s = Prioritizacao.calcular('posatendimento', ctx).score;
        if (s > score) score = s;
      });
      if (crmVencidos > 0) { var ctx2 = { followUpVencido: true }; var s2 = Prioritizacao.calcular('crm', ctx2).score; if (s2 > score) score = s2; }
      acoes.push({
        id: 'cop_reagendar', categoria: 'Reagendar', quantidade: totalReagendar,
        score: score, prioridade: Prioritizacao._label(score),
        motivo: (vencidos.length > 0 ? vencidos.length + ' retorno' + (vencidos.length !== 1 ? 's' : '') : '') + (vencidos.length > 0 && crmVencidos > 0 ? ' + ' : '') + (crmVencidos > 0 ? crmVencidos + ' follow-up' : ''),
        tipo: 'crm', payload: {}
      });
    }

    // 6. Acompanhar (oportunidades)
    var ops = typeof Oportunidade.collect === 'function' ? Oportunidade.collect() : [];
    var opsAltas = ops.filter(function(o) { return o.score >= 60; });
    if (opsAltas.length > 0) {
      var score = opsAltas[0].score;
      acoes.push({
        id: 'cop_acompanhar', categoria: 'Oportunidades', quantidade: opsAltas.length,
        score: score, prioridade: Prioritizacao._label(score),
        motivo: opsAltas[0].clientName + ' — ' + opsAltas[0].categoriaLabel,
        tipo: 'oportunidade', payload: {}
      });
    }

    // 7. Publicações pendentes (Instagram/Marketing)
    var igData = Marketing.collectInstagram();
    var publicacoes = igData.items.filter(function(i) { return i.isToday && i.statusCalc !== 'publicado'; });
    var atrasadas = igData.items.filter(function(i) { return i.isOverdue; });
    var totalPub = publicacoes.length + atrasadas.length;
    if (totalPub > 0) {
      acoes.push({
        id: 'cop_publicar', categoria: 'Publicar', quantidade: totalPub,
        score: atrasadas.length > 0 ? 75 : 60,
        prioridade: atrasadas.length > 0 ? 'Alta' : 'M\u00e9dia',
        motivo: (publicacoes.length > 0 ? publicacoes.length + ' hoje' : '') + (publicacoes.length > 0 && atrasadas.length > 0 ? ' + ' : '') + (atrasadas.length > 0 ? atrasadas.length + ' atrasada' + (atrasadas.length !== 1 ? 's' : '') : ''),
        tipo: 'marketing', payload: {}
      });
    }

    // 8. Problemas críticos
    var criticos = 0;
    var motivosCriticos = [];
    if (responder.length > 0) { criticos++; motivosCriticos.push(responder.length + ' WhatsApp'); }
    var confirmarCriticos = pendentes.filter(function(c) { return c.isToday; });
    if (confirmarCriticos.length > 0) { criticos++; motivosCriticos.push(confirmarCriticos.length + ' confirmar hoje'); }
    if (atrasadas.length > 0) { criticos++; motivosCriticos.push(atrasadas.length + ' publica\u00e7\u00f5es'); }
    if (preAgendamentos > 0) { criticos++; motivosCriticos.push(preAgendamentos + ' pr\u00e9-agendamentos'); }
    if (criticos > 0) {
      acoes.push({
        id: 'cop_problemas', categoria: 'Problemas cr\u00edticos', quantidade: criticos,
        score: 90, prioridade: 'Cr\u00edtica',
        motivo: motivosCriticos.join(' | '),
        tipo: 'aihub', payload: {}
      });
    }

    // Ordenar por score decrescente
    acoes.sort(function(a, b) { return b.score - a.score; });

    return acoes;
  }
};
