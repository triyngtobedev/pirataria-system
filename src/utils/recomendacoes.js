const Recomendacoes = {
  // Retorna recomendações ordenadas por score (Prioritizacao)
  collect: function() {
    var hoje = DB._today();
    var recs = [];
    var push = function(titulo, motivo, impacto, acaoLabel, acaoFn, score, origem) {
      recs.push({
        id: 'rec_' + Date.now().toString(36) + '_' + recs.length,
        titulo: titulo, motivo: motivo, impacto: impacto,
        acaoLabel: acaoLabel, acaoFn: acaoFn,
        score: Math.max(0, Math.min(100, score)),
        origem: origem || 'ia'
      });
    };

    // 1. Cliente aguardando resposta há muito tempo
    var wpp = typeof Inbox.collectWhatsApp === 'function' ? Inbox.collectWhatsApp() : [];
    wpp.forEach(function(w) {
      if (w.status === 'aguardando_estudio' && w.tempoDesdeUltima !== null && w.tempoDesdeUltima > 120) {
        var ctx = { ultimaInteracao: w.ultimaInteracao, mensagemNaoRespondida: true, aguardandoResposta: true, prioridade: w.priority };
        var score = Prioritizacao.calcular('whatsapp', ctx).score;
        push(
          w.clientName + ' aguarda resposta h\u00e1 ' + w.tempoLabel,
          'Cliente enviou mensagem e ainda n\u00e3o obteve retorno.',
          'Risco de perda do cliente. Quanto mais tempo passa, menor a chance de convers\u00e3o.',
          'Responder agora', "App.navigate('inbox')", score, 'whatsapp'
        );
      }
    });

    // 2. Confirmação pendente próxima ao horário
    var confirmacoes = Confirmacao.collect();
    confirmacoes.forEach(function(c) {
      if (c.statusConfirmacao === 'pendente' && c.isToday && c.diffHours !== null && c.diffHours < 3) {
        var ctx = { pendenteConfirmacao: true, horario: c.time, data: c.date, isToday: true };
        var score = Prioritizacao.calcular('confirmacao', ctx).score;
        push(
          c.clientName + ' — Confirmar agendamento',
          'Agendamento de hoje pr\u00f3ximo do hor\u00e1rio sem confirma\u00e7\u00e3o.',
          'Cliente pode n\u00e3o comparecer se n\u00e3o confirmar. Contato imediato aumenta taxa de presen\u00e7a.',
          'Confirmar', "App.navigate('confirmacao')", score, 'confirmacao'
        );
      }
    });

    // 3. Oportunidade com alta chance sem follow-up
    var ops = typeof Oportunidade.collect === 'function' ? Oportunidade.collect() : [];
    ops.forEach(function(o) {
      if (o.score >= 80) {
        var ctx = { oportunidadeAlta: true, oportunidadeScore: o.score };
        var score = Prioritizacao.calcular('oportunidade', ctx).score;
        push(
          o.clientName + ' — ' + o.categoriaLabel,
          'Oportunidade identificada com alta chance de convers\u00e3o (score ' + o.score + ').',
          'Follow-up imediato pode resultar em novo agendamento e faturamento.',
          o.btnLabel || 'Abrir', "App.navigate('" + o.btnTarget + "')", score, 'oportunidade'
        );
      }
    });

    // 4. Horário ocioso na agenda (próximas 2h sem agendamento)
    var agendaHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status !== 'cancelled' && a.status !== 'completed'; });
    var agora = new Date();
    var horaAtual = agora.getHours();
    var minutoAtual = agora.getMinutes();
    var horaAtualDecimal = horaAtual + minutoAtual / 60;
    var ocupado = agendaHoje.some(function(a) {
      var h = parseInt(a.time) || 0;
      return h <= horaAtualDecimal && h + 1 >= horaAtualDecimal;
    });
    if (!ocupado && horaAtualDecimal >= 8 && horaAtualDecimal <= 18 && agendaHoje.length > 0) {
      push(
        'Hor\u00e1rio ocioso na agenda',
        'N\u00e3o h\u00e1 agendamentos no hor\u00e1rio atual. Possibilidade de encaixe.',
        'Aproveitar para contatar clientes da fila de espera ou confirmar pr\u00f3ximos hor\u00e1rios.',
        'Ver agenda', "App.navigate('agenda')", 60, 'agenda'
      );
    }

    // 5. Pagamentos pendentes
    var doneToday = agendaHoje.filter(function(a) { return a.status === 'completed' && a.value; });
    doneToday.forEach(function(a) {
      var ctx = { pagamentoPendente: true };
      var score = Prioritizacao.calcular('financeiro', ctx).score;
      push(
        'Pagamento pendente: ' + a.clientName,
        'Atendimento conclu\u00eddo sem registro de pagamento.',
        ' Registrar o pagamento agora evita esquecimento e mant\u00e9m o financeiro organizado.',
        ' Registrar', "App.navigate('financeiro')", score, 'financeiro'
      );
    });

    // 6. Pós-atendimento vencido
    var planosRetornos = typeof PosAtendimento.collectRetornos === 'function' ? PosAtendimento.collectRetornos() : [];
    planosRetornos.forEach(function(r) {
      if (r.prioridade <= 1) {
        var ctx = { followUpVencido: true, ultimaInteracao: r.dataPrevista };
        var score = Prioritizacao.calcular('posatendimento', ctx).score;
        push(
          r.clientName + ' — ' + r.etapa,
          'Etapa de acompanhamento vencida. Cliente precisa de retorno.',
          'Acompanhamento regular aumenta a satisfa\u00e7\u00e3o e fideliza\u00e7\u00e3o do cliente.',
          'Concluir etapa', "App.openClientPanel('" + r.clientId + "')", score, 'posatendimento'
        );
      }
    });

    // 7. Cliente VIP sem retorno recente
    var sessentaDias = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    DB.getClients().forEach(function(cl) {
      if ((cl.totalVisits || 0) >= 3 && cl.lastVisit && cl.lastVisit < sessentaDias) {
        var ctx = { clienteVip: true, followUpVencido: true, ultimaInteracao: cl.lastVisit };
        var score = Prioritizacao.calcular('crm', ctx).score;
        push(
          cl.name + ' — Cliente VIP sem contato',
          'Cliente com ' + cl.totalVisits + ' atendimentos sem visitar h\u00e1 mais de 60 dias.',
          'Clientes VIP t\u00eam alto valor de vida. Um contato pode reativ\u00e1-lo.',
          'Ver cliente', "App.openClientPanel('" + cl.id + "')", score, 'crm'
        );
      }
    });

    // 8. Mensagens acumuladas na Inbox
    var totalConversas = DB.getConversas().filter(function(c) { return c.status === 'aguardando_estudio'; }).length;
    if (totalConversas >= 3) {
      var ctx = { mensagemNaoRespondida: true, ultimaInteracao: new Date().toISOString() };
      var score = Prioritizacao.calcular('whatsapp', ctx).score;
      push(
        totalConversas + ' mensagem' + (totalConversas !== 1 ? 's' : '') + ' aguardando resposta',
        'Acumulo de conversas sem retorno no WhatsApp.',
        'Responder agora reduz o tempo de espera e aumenta a taxa de convers\u00e3o.',
        'Abrir Inbox', "App.navigate('inbox')", score, 'whatsapp'
      );
    }

    // 9. Cancelamentos com possibilidade de preenchimento
    var canceladosHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status === 'cancelled'; }).length;
    if (canceladosHoje > 0) {
      push(
        canceladosHoje + ' cancelamento' + (canceladosHoje !== 1 ? 's' : '') + ' hoje',
        'Hor\u00e1rios vagos por cancelamentos. Oportunidade de preencher com outros clientes.',
        'Recuperar hor\u00e1rios cancelados pode evitar perda de faturamento no dia.',
        'Ver agenda', "App.navigate('agenda')", 55, 'agenda'
      );
    }

    // Ordenar por score decrescente
    recs.sort(function(a, b) { return b.score - a.score; });

    return recs;
  }
};
