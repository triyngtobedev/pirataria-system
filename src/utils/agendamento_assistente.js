const AgendamentoAssistente = {
  detectarIntencao: function(texto) {
    if (!texto) return false;
    var palavras = ['quero marcar', 'tem horario', 'tem horário', 'agenda', 'quero agendar', 'pode ser', 'marcar', 'horario', 'horário', 'agende', 'agendar', 'vou la', 'vou l\u00e1', 'quero ir', 'marca pra mim', 'marca para mim', 'quero um horario', 'quero um horário', 'disponibilidade'];
    var t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (var i = 0; i < palavras.length; i++) {
      if (t.indexOf(palavras[i]) >= 0) return true;
    }
    return false;
  },

  getHorariosDisponiveis: function(data, profissional) {
    var settings = Repos.studio.settings.get();
    var horaAbertura = 10;
    var horaFechamento = 19;
    try { if (settings.businessHours) {
      var match = settings.businessHours.match(/(\d{1,2})(?::\d{2})?\s*(?:h)?\s*(?:[-a\s])+\s*(\d{1,2})(?::\d{2})/i);
      if (match && match.length >= 3) { horaAbertura = parseInt(match[1]); horaFechamento = parseInt(match[2]); }
      else {
        var digits = settings.businessHours.match(/(\d+)/g);
        if (digits && digits.length >= 2) { horaAbertura = parseInt(digits[0]); horaFechamento = parseInt(digits[1]); }
      }
    }} catch(e) {}

    var duracao = 60;
    var ocupados = {};
    var appointments = data ? DB.getAppointmentsByDate(data) : [];
    appointments.forEach(function(a) {
      if (a.status === 'cancelled') return;
      if (profissional && a.professional !== profissional) return;
      var h = parseInt(a.time) || 0;
      ocupados[h] = true;
      var dur = parseInt(a.duration) || 60;
      for (var i = 1; i < Math.ceil(dur / 60); i++) { ocupados[h + i] = true; }
    });

    var horarios = [];
    for (var h = horaAbertura; h < horaFechamento; h++) {
      if (!ocupados[h]) horarios.push({ hora: h.toString().padStart(2, '0') + ':00' });
    }
    return horarios;
  },

  getMelhorHorario: function(data, profissional) {
    var horarios = this.getHorariosDisponiveis(data, profissional);
    if (horarios.length === 0) return null;
    return horarios[0];
  },

  criarAgendamento: function(data, horario, clientName, clientId, servico, profissional, conversaId) {
    var a = Repos.agenda.create({
      clientId: clientId || null, clientName: clientName,
      date: data, time: horario, service: servico || '', professional: profissional || '',
      duration: '60', status: 'pending', notes: 'Criado pelo Assistente de Agendamento'
    });
    if (clientId) {
      CRM.setStatus(clientId, 'agendado');
      CRM.addTimeline(clientId, 'agendamento', 'Agendamento criado pelo assistente: ' + servico + ' em ' + data + ' \u00e0s ' + horario, a.id);
      CRM.setNextAction(clientId, 'Confirmar agendamento', data, 'high', 'Cliente possui agendamento pendente de confirma\u00e7\u00e3o');
      Events.emit('crm.agendamento_criado', { clientId: clientId, service: servico, refId: a.id });
    }
    if (conversaId) {
      Inbox.addMensagem(conversaId, 'enviada', 'Agendamento criado para ' + data + ' \u00e0s ' + horario + '.');
    }
    return a;
  },

  // Fluxo de agendamento - estados
  FLUXO_ESTADOS: [
    { id: 'info', label: 'Aguardando informa\u00e7\u00f5es' },
    { id: 'horario', label: 'Escolhendo hor\u00e1rio' },
    { id: 'definido', label: 'Hor\u00e1rio definido' },
    { id: 'confirmacao', label: 'Aguardando confirma\u00e7\u00e3o' },
    { id: 'agendado', label: 'Agendado' },
    { id: 'sincronizado', label: 'Sincronizado com Google Calendar' },
    { id: 'falha', label: 'Falha na sincroniza\u00e7\u00e3o' }
  ],

  getEstadoFluxo: function(conversaId) {
    var c = DB.getConversa(conversaId);
    if (!c) return 0;

    // Verificar se há agendamento vinculado
    var apps = [];
    if (c.clientId) {
      apps = DB.getAppointments().filter(function(a) { return a.clientId === c.clientId; }).sort(function(a, b) { return (b.createdAt || '') > (a.createdAt || '') ? 1 : -1; });
    } else {
      apps = DB.getAppointments().filter(function(a) { return a.clientName === c.clientName; }).sort(function(a, b) { return (b.createdAt || '') > (a.createdAt || '') ? 1 : -1; });
    }

    if (apps.length === 0) {
      // Verificar se já iniciamos o fluxo
      var msgs = DB.getMensagens(conversaId);
      var temOferta = msgs.some(function(m) { return m.content && (m.content.indexOf('hor\u00e1rios dispon\u00edveis') >= 0 || m.content.indexOf('agendamento criado') >= 0); });
      return temOferta ? 1 : 0; // info ou iniciando
    }

    var ultimoApp = apps[0];
    if (ultimoApp.status === 'confirmed') return 4; // agendado
    if (ultimoApp.status === 'pending') return 3; // aguardando confirmação
    return 4;
  },

  getEstadoLabel: function(estadoIdx) {
    return this.FLUXO_ESTADOS[estadoIdx] ? this.FLUXO_ESTADOS[estadoIdx].label : 'Desconhecido';
  },

  getTimelineHtml: function(conversaId) {
    var estadoAtual = this.getEstadoFluxo(conversaId);
    var html = '<div style="display:flex;flex-direction:column;gap:4px;padding:4px 0;">';
    for (var i = 0; i < this.FLUXO_ESTADOS.length; i++) {
      var e = this.FLUXO_ESTADOS[i];
      var concluido = i < estadoAtual;
      var atual = i === estadoAtual;
      var cls = concluido ? 'badge badge-completed' : atual ? 'badge badge-progress' : 'badge badge-cancelled';
      var icon = concluido ? '\u2713' : atual ? '\u25B6' : '\u25CB';
      if (e.id === 'falha') continue; // só exibir se em falha
      html += '<div style="display:flex;align-items:center;gap:6px;font-size:0.74rem;padding:2px 0;">' +
        '<span style="color:' + (concluido ? 'var(--green)' : atual ? 'var(--gold)' : 'var(--text-dim)') + ';">' + icon + '</span>' +
        '<span style="color:' + (atual ? 'var(--text)' : concluido ? 'var(--text-muted)' : 'var(--text-dim)') + ';">' + e.label + '</span>' +
      '</div>';
    }
    html += '</div>';
    return html;
  },

  getServicoFromConversa: function(conversaId) {
    var msgs = DB.getMensagens(conversaId);
    for (var i = msgs.length - 1; i >= 0; i--) {
      var txt = (msgs[i].content || '').toLowerCase();
      // Procurar por serviços conhecidos
      var servicos = Repos.studio.services.active();
      for (var j = 0; j < servicos.length; j++) {
        if (txt.indexOf(servicos[j].name.toLowerCase()) >= 0) return servicos[j].name;
      }
    }
    return '';
  },

  // ─── Modo Assistido de Agendamento ───
  // Pré-agendamento (rascunho antes da confirmação)
  criarPreAgendamento: function(conversaId, data, horario, servico, profissional) {
    var c = DB.getConversa(conversaId);
    if (!c) return null;
    var pre = { data: data, horario: horario, servico: servico || '', profissional: profissional || '', clientName: c.clientName, clientId: c.clientId, criadoEm: DB._now(), status: 'rascunho' };
    DB.updateConversa(conversaId, { preAgendamento: JSON.stringify(pre) });
    if (c.clientId) CRM.addTimeline(c.clientId, 'pre_agendamento', 'Pr\u00e9-agendamento criado: ' + servico + ' em ' + data + ' \u00e0s ' + horario, conversaId);
    return pre;
  },

  getPreAgendamento: function(conversaId) {
    var c = DB.getConversa(conversaId);
    if (!c || !c.preAgendamento) return null;
    try { return JSON.parse(c.preAgendamento); } catch(e) { return null; }
  },

  clearPreAgendamento: function(conversaId) {
    DB.updateConversa(conversaId, { preAgendamento: null });
  },

  confirmarPreAgendamento: function(conversaId) {
    var pre = this.getPreAgendamento(conversaId);
    if (!pre) return null;
    var a = this.criarAgendamento(pre.data, pre.horario, pre.clientName, pre.clientId, pre.servico, pre.profissional, conversaId);
    if (a) {
      pre.status = 'confirmado';
      pre.confirmadoEm = DB._now();
      pre.appointmentId = a.id;
      DB.updateConversa(conversaId, { preAgendamento: JSON.stringify(pre) });
      if (pre.clientId) CRM.addTimeline(pre.clientId, 'agendamento_confirmado', 'Agendamento confirmado: ' + pre.servico + ' em ' + pre.data + ' \u00e0s ' + pre.horario, a.id);
      // Sincronizar com Google Calendar
      if (GoogleCalendar.isConnected()) {
        GoogleCalendar.createEvent(a).then(function(eventId) {
          if (eventId) Repos.agenda.update(a.id, { googleEventId: eventId });
        }).catch(function() {});
      }
    }
    return a;
  },

  // Sugerir até 3 horários (Modo Assistido)
  getSugestoesAssistidas: function(data, profissional) {
    var horarios = this.getHorariosDisponiveis(data, profissional);
    if (horarios.length === 0) return [];
    // Retornar até 3 horários espaçados (manhã, tarde, fim de tarde)
    var sugestoes = [];
    var manha = horarios.filter(function(h) { var hora = parseInt(h.hora); return hora >= 8 && hora <= 12; });
    var tarde = horarios.filter(function(h) { var hora = parseInt(h.hora); return hora >= 13 && hora <= 17; });
    var noite = horarios.filter(function(h) { var hora = parseInt(h.hora); return hora >= 18; });
    if (manha.length > 0) sugestoes.push(manha[0]);
    if (tarde.length > 0) sugestoes.push(tarde[0]);
    if (noite.length > 0) sugestoes.push(noite[0]);
    // Se não tiver 3, completar com qualquer horário disponível
    if (sugestoes.length < 3) {
      var restantes = horarios.filter(function(h) { return !sugestoes.some(function(s) { return s.hora === h.hora; }); });
      for (var i = 0; i < restantes.length && sugestoes.length < 3; i++) {
        sugestoes.push(restantes[i]);
      }
    }
    return sugestoes;
  },

  getMensagensProntas: function(horarios, data, clientName, servico) {
    var msgs = [];
    var settings = Repos.studio.settings.get();
    var studioName = (settings && settings.studioName) || 'Pirataria Body Art';

    if (horarios.length > 0) {
      var listaHorarios = horarios.slice(0, 5).map(function(h) { return h.hora; }).join(', ');
      msgs.push({ label: 'Oferecer hor\u00e1rios', texto: 'Ol\u00e1, ' + clientName + '! Temos hor\u00e1rios dispon\u00edveis no ' + studioName + ' para ' + data + ': ' + listaHorarios + '. Qual funciona melhor para voc\u00ea?' + (servico ? ' (' + servico + ')' : '') });
    }
    msgs.push({ label: 'Confirmar hor\u00e1rio', texto: 'Perfeito, ' + clientName + '! Seu hor\u00e1rio foi reservado. Aguardamos voc\u00ea!' });
    msgs.push({ label: 'Indisponibilidade', texto: 'Ol\u00e1, ' + clientName + '! Infelizmente n\u00e3o temos hor\u00e1rios dispon\u00edveis para esta data. Podemos verificar outra data?' });
    msgs.push({ label: 'Hor\u00e1rios alternativos', texto: 'Ol\u00e1, ' + clientName + '! Nestes hor\u00e1rios n\u00e3o temos disponibilidade. Que tal ' + data + '?' });

    return msgs;
  }
};
