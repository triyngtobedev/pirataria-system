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
      var match = settings.businessHours.match(/(\d+)/g);
      if (match && match.length >= 2) { horaAbertura = parseInt(match[0]); horaFechamento = parseInt(match[1]); }
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
