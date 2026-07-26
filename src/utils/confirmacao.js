const Confirmacao = {
  collect: function() {
    var hoje = DB._today();
    var agora = Date.now();
    var results = [];

    var appointments = DB.getAppointments().filter(function(a) { return a.status !== 'cancelled'; });
    var settings = Repos.studio.settings.get();
    var studioName = (settings && settings.studioName) || 'Pirataria Body Art';

    for (var i = 0; i < appointments.length; i++) {
      var a = appointments[i];
      if (a.date < hoje) continue;

      var isPending = a.status === 'pending';
      var isConfirmed = a.status === 'confirmed';
      var isToday = a.date === hoje;
      var isTomorrow = new Date(hoje + 'T12:00:00').getTime() + 86400000;
      var aptDate = new Date(a.date + 'T' + (a.time || '12:00'));
      var diffMs = aptDate.getTime() - agora;
      var diffHours = Math.round(diffMs / 3600000);
      var diffDays = Math.round(diffMs / 86400000);

      // Status da confirmação
      var statusConf = isConfirmed ? 'confirmado' : 'pendente';
      var statusLabel = isConfirmed ? 'Confirmado' : 'Pendente';
      var statusCls = isConfirmed ? 'badge-completed' : 'badge-cancelled';

      // Último contato
      var ultimoContato = '';
      if (a.clientId) {
        var conversas = DB.getConversasByClient(a.clientId);
        if (conversas.length > 0) {
          var ultima = conversas.sort(function(x, y) { return (y.updatedAt || '') > (x.updatedAt || '') ? 1 : -1; })[0];
          ultimoContato = ultima.updatedAt ? App._tempoRelativo(ultima.updatedAt) : '—';
        }
      }
      if (!ultimoContato) ultimoContato = '—';

      // Próxima ação sugerida
      var proximaAcao = '';
      var mensagemSugerida = '';
      var prioridade = 3;

      if (isPending && isToday && diffHours < 0) {
        proximaAcao = 'Cliente atrasado, tentar contato';
        mensagemSugerida = 'Ol\u00e1, ' + a.clientName + '! Seu hor\u00e1rio era \u00e0s ' + (a.time || '') + '. Ainda d\u00e1 tempo de vir?';
        prioridade = 0;
      } else if (isPending && isToday) {
        proximaAcao = 'Confirmar agendamento de hoje';
        mensagemSugerida = 'Ol\u00e1, ' + a.clientName + '! Passando para confirmar seu hor\u00e1rio hoje \u00e0s ' + (a.time || '') + ' no ' + studioName + '. Confirmado?';
        prioridade = 1;
      } else if (isPending && diffHours <= 24 && diffHours > 0) {
        proximaAcao = 'Confirmar agendamento (24h)';
        mensagemSugerida = 'Ol\u00e1, ' + a.clientName + '! Lembrando que seu hor\u00e1rio \u00e9 amanh\u00e3 \u00e0s ' + (a.time || '') + ' no ' + studioName + '. Confirmado?';
        prioridade = 1;
      } else if (isPending && diffDays <= 3) {
        proximaAcao = 'Solicitar confirma\u00e7\u00e3o';
        mensagemSugerida = 'Ol\u00e1, ' + a.clientName + '! Tudo bem? Seu agendamento est\u00e1 pr\u00f3ximo. Pode confirmar que estar\u00e1 conosco no dia ' + a.date + ' \u00e0s ' + (a.time || '') + '?';
        prioridade = 2;
      } else if (isPending && diffDays > 3) {
        proximaAcao = 'Aguardando confirma\u00e7\u00e3o';
        mensagemSugerida = '';
        prioridade = 3;
      } else if (isConfirmed && isToday) {
        proximaAcao = 'Cliente confirmado para hoje';
        mensagemSugerida = 'Ol\u00e1, ' + a.clientName + '! Seu hor\u00e1rio \u00e9 hoje \u00e0s ' + (a.time || '') + '. Aguardamos voc\u00ea!';
        prioridade = 2;
      } else if (isConfirmed) {
        proximaAcao = 'Confirmado, aguardar data';
        prioridade = 4;
      }

      results.push({
        id: 'conf_' + a.id,
        appointmentId: a.id,
        clientName: a.clientName,
        clientId: a.clientId,
        date: a.date,
        time: a.time || '',
        service: a.service || '',
        professional: a.professional || '',
        status: a.status,
        statusConfirmacao: statusConf,
        statusLabel: statusLabel,
        statusCls: statusCls,
        ultimoContato: ultimoContato,
        proximaAcao: proximaAcao,
        mensagemSugerida: mensagemSugerida,
        prioridade: prioridade,
        diffHours: diffHours,
        isToday: isToday
      });
    }

    results.sort(function(a, b) { return a.prioridade - b.prioridade || (a.date > b.date ? 1 : -1); });
    return results;
  },

  getResumo: function() {
    var all = this.collect();
    var pendentes = all.filter(function(a) { return a.statusConfirmacao === 'pendente'; });
    var hojeNaoConfirmados = all.filter(function(a) { return a.isToday && a.statusConfirmacao === 'pendente'; });
    var atrasados = all.filter(function(a) { return a.prioridade <= 0; });
    var riscoAlto = all.filter(function(a) { return a.prioridade <= 1 && a.statusConfirmacao === 'pendente'; });
    return {
      total: all.length,
      pendentes: pendentes.length,
      hojeNaoConfirmados: hojeNaoConfirmados.length,
      atrasados: atrasados.length,
      riscoAlto: riscoAlto.length
    };
  },

  getMensagem: function(tipo, appointment) {
    if (!appointment) return '';
    var settings = Repos.studio.settings.get();
    var studioName = (settings && settings.studioName) || 'Pirataria Body Art';
    var studioAddress = (settings && settings.address) || '';
    var msgs = {
      confirmar: 'Ol\u00e1, ' + appointment.clientName + '! Tudo bem? Seu hor\u00e1rio no ' + studioName + ' est\u00e1 agendado para ' + appointment.date + ' \u00e0s ' + appointment.time + '. Pode confirmar?',
      lembrete24h: 'Ol\u00e1, ' + appointment.clientName + '! Lembrando que seu hor\u00e1rio \u00e9 amanh\u00e3 \u00e0s ' + appointment.time + ' no ' + studioName + '. Aguardamos voc\u00ea!',
      lembreteDia: 'Ol\u00e1, ' + appointment.clientName + '! Seu hor\u00e1rio \u00e9 hoje \u00e0s ' + appointment.time + ' no ' + studioName + '. Estamos prontos para te atender!' + (studioAddress ? ' Endere\u00e7o: ' + studioAddress : ''),
      solicitarConfirmacao: 'Ol\u00e1, ' + appointment.clientName + '! Pode confirmar que estar\u00e1 conosco no dia ' + appointment.date + ' \u00e0s ' + appointment.time + '?',
      reagendar: 'Ol\u00e1, ' + appointment.clientName + '! Precisamos remarcar seu hor\u00e1rio do dia ' + appointment.date + '. Quando seria melhor para voc\u00ea?',
      cancelamento: 'Ol\u00e1, ' + appointment.clientName + '! Seu agendamento do dia ' + appointment.date + ' foi cancelado. Se quiser remarcar, \u00e9 s\u00f3 nos chamar!',
      confirmarReagendamento: 'Ol\u00e1, ' + appointment.clientName + '! Seu reagendamento foi confirmado. Aguardamos voc\u00ea no dia ' + appointment.date + ' \u00e0s ' + appointment.time + '!'
    };
    return msgs[tipo] || '';
  }
};
