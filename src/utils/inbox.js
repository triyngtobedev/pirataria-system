const Inbox = {
  ORIGENS: ['whatsapp', 'instagram', 'indicacao', 'presencial', 'outro'],
  ORIGEM_LABELS: { whatsapp: 'WhatsApp', instagram: 'Instagram', indicacao: 'Indica\u00e7\u00e3o', presencial: 'Presencial', outro: 'Outro' },
  STATUS: ['aberta', 'aguardando_cliente', 'aguardando_estudio', 'encerrada'],
  STATUS_LABELS: { aberta: 'Aberta', aguardando_cliente: 'Aguardando Cliente', aguardando_estudio: 'Aguardando Est\u00fadio', encerrada: 'Encerrada' },

  create(data) {
    return DB.addConversa(data);
  },

  update(id, data) {
    return DB.updateConversa(id, data);
  },

  get(id) {
    return DB.getConversa(id);
  },

  list(filter) {
    var todas = DB.getConversas();
    if (!filter || filter === 'todas') return todas;
    return todas.filter(function(c) { return c.status === filter; });
  },

  search(query) {
    var q = query.toLowerCase().trim();
    if (!q) return DB.getConversas();
    return DB.getConversas().filter(function(c) {
      return c.clientName.toLowerCase().indexOf(q) >= 0
        || (c.phone && c.phone.indexOf(q)) >= 0
        || (c.origin && c.origin.indexOf(q)) >= 0;
    });
  },

  addMensagem(conversaId, type, content) {
    var msg = DB.addMensagem({ conversaId: conversaId, type: type, content: content });
    var c = DB.getConversa(conversaId);
    if (c && c.clientId) {
      CRM.addTimeline(c.clientId, 'conversa_' + type, (type === 'recebida' ? 'Mensagem recebida' : type === 'enviada' ? 'Mensagem enviada' : type === 'orcamento' ? 'Or\u00e7amento enviado' : 'Conversa: ' + content), conversaId);
      var statusMap = { recebida: 'aguardando_estudio', enviada: 'aguardando_cliente', orcamento: 'aguardando_cliente', resposta: 'aguardando_estudio', encerramento: 'encerrada' };
      var newStatus = statusMap[type];
      if (newStatus && c.status !== 'encerrada') {
        DB.updateConversa(conversaId, { status: newStatus });
      }
    }
    return msg;
  },

  getMensagens(conversaId) {
    return DB.getMensagens(conversaId);
  },

  close(conversaId) {
    var c = DB.getConversa(conversaId);
    if (!c) return;
    DB.updateConversa(conversaId, { status: 'encerrada' });
    Inbox.addMensagem(conversaId, 'encerramento', 'Conversa encerrada.');
    if (c.clientId) {
      CRM.addTimeline(c.clientId, 'conversa_encerrada', 'Conversa encerrada: ' + c.clientName, conversaId);
      CRM.clearNextAction(c.clientId);
      Events.emit('crm.conversa_encerrada', { clientId: c.clientId, refId: conversaId });
    }
  },

  linkClient(conversaId, clientId) {
    var c = DB.getConversa(conversaId);
    if (!c) return null;
    DB.updateConversa(conversaId, { clientId: clientId });
    var client = DB.getClient(clientId);
    if (client) {
      CRM.setStatus(clientId, 'novo_contato');
      CRM.addTimeline(clientId, 'conversa_vinculada', 'Conversa vinculada ao cliente', conversaId);
    }
    return client;
  },

  gerarAssistente: function(conversaId) {
    var c = DB.getConversa(conversaId);
    if (!c) return null;
    var msgs = DB.getMensagens(conversaId);
    var hoje = DB._today();

    // Resumo
    var resumo = c.note || '';
    if (!resumo) {
      resumo = c.clientName + ' — ' + (Inbox.ORIGEM_LABELS[c.origin] || c.origin) + (c.clientId ? ' (cliente vinculado)' : '');
    }

    // Última pergunta e resposta
    var ultimaPergunta = '';
    var ultimaResposta = '';
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m.type === 'recebida' || m.type === 'resposta') ultimaPergunta = m.content;
      if (m.type === 'enviada' || m.type === 'orcamento') ultimaResposta = m.content;
    }

    // Tempo sem resposta
    var tempoSemResposta = '';
    if (c.ultimaInteracao) {
      var mins = Math.floor((Date.now() - new Date(c.ultimaInteracao).getTime()) / 60000);
      tempoSemResposta = mins < 60 ? mins + 'min' : Math.floor(mins / 60) + 'h' + (mins % 60) + 'min';
    }

    // Chance estimada de agendamento
    var chanceAgendamento = 'M\u00e9dia';
    if (c.clientId) {
      var client = DB.getClient(c.clientId);
      if (client && (client.totalVisits || 0) >= 2) chanceAgendamento = 'Alta';
      if (client && !client.lastVisit) chanceAgendamento = 'Baixa';
    }

    // Alertas
    var alertas = [];
    if (c.clientId) {
      var client = DB.getClient(c.clientId);
      if (client && (client.totalVisits || 0) >= 3) alertas.push('Cliente VIP (' + client.totalVisits + ' atendimentos)');
      var orcAbertos = DB.getOrcamentos().filter(function(o) { return o.clientId === c.clientId && o.status !== 'rascunho' && o.status !== 'recusado' && o.status !== 'expirado'; });
      if (orcAbertos.length > 0) alertas.push(orcAbertos.length + ' or\u00e7amento(s) em aberto');
      var planos = DB.getPlanosByClient(c.clientId);
      var planoAtivo = planos.filter(function(p) { return p.status === 'ativo'; });
      if (planoAtivo.length > 0) alertas.push('Plano de acompanhamento ativo');
      var etapasVencidas = DB.getEtapasVencidas().filter(function(e) {
        var plano = DB.getPlano(e.planoId);
        return plano && plano.clientId === c.clientId;
      });
      if (etapasVencidas.length > 0) alertas.push(etapasVencidas.length + ' etapa(s) de retorno vencida(s)');
    }
    if (c.priority === 'high') alertas.push('Prioridade alta');

    // Próxima ação sugerida
    var proximaAcao = '';
    if (c.status === 'aguardando_estudio') {
      if (ultimaPergunta.indexOf('pre\u00e7o') >= 0 || ultimaPergunta.indexOf('valor') >= 0 || ultimaPergunta.indexOf('quanto') >= 0) {
        proximaAcao = 'Enviar or\u00e7amento';
      } else if (ultimaPergunta.indexOf('agendar') >= 0 || ultimaPergunta.indexOf('hor\u00e1rio') >= 0 || ultimaPergunta.indexOf('marcar') >= 0) {
        proximaAcao = 'Sugerir agendamento';
      } else {
        proximaAcao = 'Responder cliente';
      }
    } else if (c.nextAction) {
      proximaAcao = c.nextAction;
    } else {
      proximaAcao = 'Aguardando retorno do cliente';
    }

    // Respostas rápidas baseadas em contexto
    var respostasRapidas = [];
    var settings = Repos.studio.settings.get();
    var studioName = (settings && settings.studioName) || 'Pirataria Body Art';
    var studioPhone = (settings && settings.phone) || '';
    var studioInsta = (settings && settings.instagram) || '';

    // Sempre disponíveis
    respostasRapidas.push({ label: 'Sauda\u00e7\u00e3o', texto: 'Ol\u00e1, ' + c.clientName + '! Tudo bem? Aqui \u00e9 do ' + studioName + '. Como posso ajudar?' });
    respostasRapidas.push({ label: 'Agendamento', texto: 'Podemos agendar seu hor\u00e1rio! Quais dias e hor\u00e1rios funcionam melhor para voc\u00ea?' });
    respostasRapidas.push({ label: 'Confirma\u00e7\u00e3o', texto: 'Ol\u00e1, ' + c.clientName + '! Passando para confirmar seu agendamento. Confirmado?' });
    respostasRapidas.push({ label: 'Reagendamento', texto: 'Ol\u00e1, ' + c.clientName + '! Tudo bem? Precisamos remarcar seu hor\u00e1rio. Quando ficaria melhor para voc\u00ea?' });
    respostasRapidas.push({ label: 'Encerramento', texto: 'Foi um prazer atender voc\u00ea, ' + c.clientName + '! Qualquer d\u00favida, estamos \u00e0 disposi\u00e7\u00e3o.' });

    // Detecção de intenção de agendamento
    var intencaoAgendamento = false;
    var sugestaoData = '';
    var sugestaoHorarios = [];
    var sugestaoMelhorHorario = null;
    if (AgendamentoAssistente.detectarIntencao(ultimaPergunta)) {
      intencaoAgendamento = true;
      var hoje = DB._today();
      sugestaoData = hoje;
      sugestaoHorarios = AgendamentoAssistente.getHorariosDisponiveis(hoje, c.professional || '');
      sugestaoMelhorHorario = sugestaoHorarios.length > 0 ? sugestaoHorarios[0] : null;
      proximaAcao = 'Cliente quer agendar — ' + (sugestaoMelhorHorario ? 'sugerir ' + sugestaoMelhorHorario.hora : 'verificar disponibilidade');
    }

    // Contextuais
    if (ultimaPergunta && (ultimaPergunta.indexOf('pre\u00e7o') >= 0 || ultimaPergunta.indexOf('valor') >= 0 || ultimaPergunta.indexOf('quanto') >= 0)) {
      respostasRapidas.unshift({ label: 'Or\u00e7amento', texto: 'Vou te passar os valores! Podemos marcar um hor\u00e1rio para avaliarmos pessoalmente? Ou prefere que envie os valores por aqui?' });
    }
    if (c.clientId) {
      var orcs = DB.getOrcamentos().filter(function(o) { return o.clientId === c.clientId && o.status === 'aprovado'; });
      if (orcs.length > 0) {
        respostasRapidas.unshift({ label: 'Pr\u00e9-atendimento', texto: 'Seu or\u00e7amento foi aprovado! Estamos prontos para te atender. Seguem as orienta\u00e7\u00f5es pr\u00e9vias: ' + (orcs[0].observacoes || 'evite consumir \u00e1lcool no dia anterior, venha com a pele limpa e hidratada.') });
      }
    }
    var planos = c.clientId ? DB.getPlanosByClient(c.clientId) : [];
    var planoConcluido = planos.filter(function(p) { return p.status === 'concluido'; });
    if (planoConcluido.length > 0) {
      respostasRapidas.push({ label: 'P\u00f3s-atendimento', texto: 'Como est\u00e1 o resultado do procedimento? Lembrando que estamos \u00e0 disposi\u00e7\u00e3o para qualquer retorno!' });
    }

    return {
      resumo: resumo,
      ultimaPergunta: ultimaPergunta || '—',
      ultimaResposta: ultimaResposta || '—',
      tempoSemResposta: tempoSemResposta || '—',
      status: Inbox.STATUS_LABELS[c.status] || c.status,
      proximaAcao: proximaAcao,
      chanceAgendamento: chanceAgendamento,
      alertas: alertas,
      respostasRapidas: respostasRapidas,
      intencaoAgendamento: intencaoAgendamento,
      sugestaoData: sugestaoData,
      sugestaoHorarios: sugestaoHorarios,
      sugestaoMelhorHorario: sugestaoMelhorHorario
    };
  },

  classificarMotivo: function(conversaId) {
    var c = DB.getConversa(conversaId);
    if (!c) return 'duvida';
    var msgs = DB.getMensagens(conversaId);

    // Verificar orçamentos vinculados
    if (c.clientId) {
      var orcs = DB.getOrcamentos().filter(function(o) { return o.clientId === c.clientId && o.status !== 'rascunho' && o.status !== 'recusado' && o.status !== 'expirado'; });
      if (orcs.length > 0) return 'orcamento';
    }

    // Verificar planos de acompanhamento
    if (c.clientId) {
      var planos = DB.getPlanosByClient(c.clientId).filter(function(p) { return p.status === 'ativo'; });
      if (planos.length > 0) return 'pos_atendimento';
    }

    // Analisar mensagens recentes
    for (var i = msgs.length - 1; i >= 0; i--) {
      var m = msgs[i];
      if (m.type !== 'recebida' && m.type !== 'resposta') continue;
      var txt = (m.content || '').toLowerCase();
      if (txt.indexOf('pre\u00e7o') >= 0 || txt.indexOf('valor') >= 0 || txt.indexOf('quanto') >= 0 || txt.indexOf('or\u00e7amento') >= 0) return 'orcamento';
      if (txt.indexOf('agendar') >= 0 || txt.indexOf('hor\u00e1rio') >= 0 || txt.indexOf('marcar') >= 0 || txt.indexOf('quero ir') >= 0 || txt.indexOf('vou l\u00e1') >= 0) return 'agendamento';
    }

    // Verificar se tem agendamento
    if (c.clientId) {
      var apps = DB.getAppointments().filter(function(a) { return a.clientId === c.clientId; });
      if (apps.length > 0) {
        var ultimo = apps.sort(function(a, b) { return (b.date || '') > (a.date || '') ? 1 : -1; })[0];
        if (ultimo && ultimo.date >= DB._today()) return 'confirmacao';
        if (ultimo) return 'pos_atendimento';
      }
    }

    return 'duvida';
  },

  MOTIVO_LABELS: { orcamento: 'Or\u00e7amento', agendamento: 'Agendamento', confirmacao: 'Confirma\u00e7\u00e3o', pos_atendimento: 'P\u00f3s-atendimento', duvida: 'D\u00favida' },

  collectWhatsApp: function() {
    var hoje = DB._today();
    var conversas = DB.getConversas().filter(function(c) { return c.status !== 'encerrada'; });
    var results = [];

    for (var i = 0; i < conversas.length; i++) {
      var c = conversas[i];
      var motivo = Inbox.classificarMotivo(c.id);
      var msgs = DB.getMensagens(c.id);
      var ultimaMsg = msgs.length > 0 ? msgs[0] : null;
      var quemEnviou = '';
      if (ultimaMsg) {
        quemEnviou = (ultimaMsg.type === 'recebida' || ultimaMsg.type === 'resposta') ? 'cliente' : 'estudio';
      }
      var tempoDesdeUltima = c.ultimaInteracao ? Math.floor((Date.now() - new Date(c.ultimaInteracao).getTime()) / 60000) : null;

      // Prioridade: aguardando_estudio > intencao_agendamento > confirmacao > orcamento > vip > tempo
      var prioridade = 5;
      if (c.status === 'aguardando_estudio') prioridade = 0;
      else if (motivo === 'agendamento') prioridade = 1;
      else if (motivo === 'confirmacao') prioridade = 2;
      else if (motivo === 'orcamento') prioridade = 3;
      if (c.priority === 'high' && prioridade > 1) prioridade = 1;
      if (c.clientId) {
        var client = DB.getClient(c.clientId);
        if (client && (client.totalVisits || 0) >= 3 && prioridade > 2) prioridade = 2;
      }
      // Tempo sem resposta aumenta urgência
      if (tempoDesdeUltima !== null && tempoDesdeUltima > 120 && prioridade > 1) prioridade = 1;

      results.push({
        id: c.id, clientName: c.clientName, clientId: c.clientId, phone: c.phone || '',
        origem: c.origin || 'whatsapp', motivo: motivo, motivoLabel: Inbox.MOTIVO_LABELS[motivo] || 'D\u00favida',
        status: c.status, statusLabel: Inbox.STATUS_LABELS[c.status] || c.status,
        prioridade: prioridade, ultimaMsgTipo: quemEnviou,
        tempoDesdeUltima: tempoDesdeUltima,
        tempoLabel: tempoDesdeUltima !== null ? (tempoDesdeUltima < 60 ? tempoDesdeUltima + 'min' : Math.floor(tempoDesdeUltima / 60) + 'h' + (tempoDesdeUltima % 60) + 'min') : '—',
        ultimaInteracao: c.ultimaInteracao, nextAction: c.nextAction || '',
        priority: c.priority || 'medium', note: c.note || ''
      });
    }

    results.sort(function(a, b) { return a.prioridade - b.prioridade || (a.tempoDesdeUltima || 0) - (b.tempoDesdeUltima || 0); });
    return results;
  },

  collectHoje() {
    var today = DB._today();
    var conversas = DB.getConversas();
    var results = [];

    for (var i = 0; i < conversas.length; i++) {
      var c = conversas[i];
      if (c.status === 'encerrada') continue;

      var hasAction = c.nextAction || c.nextDate;
      if (!hasAction && c.status !== 'aguardando_estudio') continue;

      var prioMap = { high: 0, medium: 1, low: 2 };
      var prio = prioMap[c.priority] !== undefined ? prioMap[c.priority] : 1;

      var isOverdue = c.nextDate && c.nextDate < today;
      var isToday = c.nextDate === today;
      var urgPrio = isOverdue ? -1 : isToday ? 0 : (c.status === 'aguardando_estudio' ? 1 : 2);

      results.push({
        clientName: c.clientName,
        clientId: c.clientId || null,
        conversaId: c.id,
        action: c.nextAction || (c.status === 'aguardando_estudio' ? 'Responder ' + c.clientName : 'Acompanhar'),
        date: c.nextDate || '',
        priority: c.priority || 'medium',
        note: c.note || '',
        status: c.status,
        origin: c.origin || '',
        _ordem: urgPrio * 100 + prio * 10 + (c.nextDate ? (today < c.nextDate ? 1 : 0) : 2)
      });
    }

    results.sort(function(a, b) { return a._ordem - b._ordem; });
    return results;
  }
};
