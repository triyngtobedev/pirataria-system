const Recomendacoes = {
  collect: function() {
    var hoje = DB._today();
    var recs = [];
    var push = function(titulo, motivo, impacto, acaoLabel, tipo, payload, score, origem) {
      recs.push({
        id: 'rec_' + Date.now().toString(36) + '_' + recs.length,
        titulo: titulo, motivo: motivo, impacto: impacto,
        acaoLabel: acaoLabel, tipo: tipo, payload: payload || {},
        score: Math.max(0, Math.min(100, score)),
        origem: origem || 'ia'
      });
    };

    var wpp = typeof Inbox.collectWhatsApp === 'function' ? Inbox.collectWhatsApp() : [];
    wpp.forEach(function(w) {
      if (w.status === 'aguardando_estudio' && w.tempoDesdeUltima !== null && w.tempoDesdeUltima > 120) {
        var ctx = { ultimaInteracao: w.ultimaInteracao, mensagemNaoRespondida: true, aguardandoResposta: true, prioridade: w.priority };
        var score = Prioritizacao.calcular('whatsapp', ctx).score;
        push(w.clientName + ' aguarda resposta h\u00e1 ' + w.tempoLabel, 'Cliente enviou mensagem e ainda n\u00e3o obteve retorno.', 'Risco de perda do cliente.', 'Responder agora', 'whatsapp', { conversaId: w.id }, score, 'whatsapp');
      }
    });

    var confirmacoes = Confirmacao.collect();
    confirmacoes.forEach(function(c) {
      if (c.statusConfirmacao === 'pendente' && c.isToday && c.diffHours !== null && c.diffHours < 3) {
        var ctx = { pendenteConfirmacao: true, horario: c.time, data: c.date, isToday: true };
        var score = Prioritizacao.calcular('confirmacao', ctx).score;
        push(c.clientName + ' — Confirmar agendamento', 'Agendamento pr\u00f3ximo sem confirma\u00e7\u00e3o.', 'Contato imediato aumenta presen\u00e7a.', 'Confirmar', 'confirmacao', {}, score, 'confirmacao');
      }
    });

    var ops = typeof Oportunidade.collect === 'function' ? Oportunidade.collect() : [];
    ops.forEach(function(o) {
      if (o.score >= 80) {
        var ctx = { oportunidadeAlta: true, oportunidadeScore: o.score };
        var score = Prioritizacao.calcular('oportunidade', ctx).score;
        push(o.clientName + ' — ' + (o.categoriaLabel || ''), 'Oportunidade com alta chance de convers\u00e3o.', 'Follow-up pode resultar em agendamento.', o.btnLabel || 'Abrir', 'oportunidade', { target: o.btnTarget }, score, 'oportunidade');
      }
    });

    var agendaHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status !== 'cancelled' && a.status !== 'completed'; });
    var agora = new Date();
    var horaAtual = agora.getHours();
    var minutoAtual = agora.getMinutes();
    var horaAtualDecimal = horaAtual + minutoAtual / 60;
    var ocupado = agendaHoje.some(function(a) { var h = parseInt(a.time) || 0; return h <= horaAtualDecimal && h + 1 >= horaAtualDecimal; });
    if (!ocupado && horaAtualDecimal >= 8 && horaAtualDecimal <= 18 && agendaHoje.length > 0) {
      push('Hor\u00e1rio ocioso na agenda', 'Sem agendamentos no hor\u00e1rio atual.', 'Aproveitar para contatar clientes.', 'Ver agenda', 'agenda', {}, 60, 'agenda');
    }

    var doneToday = agendaHoje.filter(function(a) { return a.status === 'completed' && a.value; });
    doneToday.forEach(function(a) {
      var ctx = { pagamentoPendente: true };
      var score = Prioritizacao.calcular('financeiro', ctx).score;
      push('Pagamento pendente: ' + a.clientName, 'Atendimento conclu\u00eddo sem pagamento.', 'Registrar agora evita esquecimento.', 'Registrar', 'financeiro', {}, score, 'financeiro');
    });

    var planosRetornos = typeof PosAtendimento.collectRetornos === 'function' ? PosAtendimento.collectRetornos() : [];
    planosRetornos.forEach(function(r) {
      if (r.prioridade <= 1) {
        var ctx = { followUpVencido: true, ultimaInteracao: r.dataPrevista };
        var score = Prioritizacao.calcular('posatendimento', ctx).score;
        push(r.clientName + ' — ' + r.etapa, 'Etapa de acompanhamento vencida.', 'Acompanhamento aumenta satisfa\u00e7\u00e3o.', 'Concluir etapa', 'posatendimento', { clientId: r.clientId }, score, 'posatendimento');
      }
    });

    var sessentaDias = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    DB.getClients().forEach(function(cl) {
      if ((cl.totalVisits || 0) >= 3 && cl.lastVisit && cl.lastVisit < sessentaDias) {
        var ctx = { clienteVip: true, followUpVencido: true, ultimaInteracao: cl.lastVisit };
        var score = Prioritizacao.calcular('crm', ctx).score;
        push(cl.name + ' — Cliente VIP sem contato', cl.totalVisits + ' atendimentos sem visitar.', 'Clientes VIP t\u00eam alto valor.', 'Ver cliente', 'crm', { clientId: cl.id }, score, 'crm');
      }
    });

    var totalConversas = DB.getConversas().filter(function(c) { return c.status === 'aguardando_estudio'; }).length;
    if (totalConversas >= 3) {
      var ctx = { mensagemNaoRespondida: true, ultimaInteracao: new Date().toISOString() };
      var score = Prioritizacao.calcular('whatsapp', ctx).score;
      push(totalConversas + ' mensagens aguardando resposta', 'Acumulo de conversas sem retorno.', 'Responder agora reduz espera.', 'Abrir Inbox', 'whatsapp', {}, score, 'whatsapp');
    }

    var canceladosHoje = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status === 'cancelled'; }).length;
    if (canceladosHoje > 0) {
      push(canceladosHoje + ' cancelamento' + (canceladosHoje !== 1 ? 's' : '') + ' hoje', 'Hor\u00e1rios vagos por cancelamentos.', 'Recuperar hor\u00e1rios evita perda.', 'Ver agenda', 'agenda', {}, 55, 'agenda');
    }

    recs.sort(function(a, b) { return b.score - a.score; });
    return recs;
  }
};
