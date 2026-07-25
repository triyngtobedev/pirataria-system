const Comunicacao = {
  collect: function() {
    var hoje = DB._today();
    var agora = Date.now();

    // 1. Conversas WhatsApp (do Inbox)
    var conversas = DB.getConversas().filter(function(c) { return c.status !== 'encerrada'; });

    // 2. Agendamentos do dia
    var agenda = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status !== 'cancelled'; });

    // 3. Conteúdo Instagram (do Marketing)
    var settings = Repos.studio.settings.get();
    var perfis = [];
    if (settings.instagram) perfis.push(settings.instagram);
    if (settings.instagramDigao) perfis.push(settings.instagramDigao);
    var conteudos = DB.getCalendario().filter(function(c) {
      return c.status !== 'cancelado' && perfis.indexOf(c.perfilDestino) >= 0;
    });

    // Pendências
    var conversasSemResposta = conversas.filter(function(c) { return c.status === 'aguardando_estudio'; });
    var agendamentosPendentes = agenda.filter(function(a) { return a.status === 'pending'; });
    var conteudosHoje = conteudos.filter(function(c) { return c.dataPrevista === hoje && c.status !== 'publicado'; });

    return {
      conversas: conversas,
      agenda: agenda,
      conteudos: conteudos,
      perfis: perfis,
      pendencias: {
        conversasSemResposta: conversasSemResposta,
        agendamentosPendentes: agendamentosPendentes,
        conteudosHoje: conteudosHoje,
        total: conversasSemResposta.length + agendamentosPendentes.length + conteudosHoje.length
      }
    };
  },

  getResumoOperacional: function() {
    var data = this.collect();
    var hoje = DB._today();

    var whatsappPendente = data.pendencias.conversasSemResposta.length;
    var agendamentosHoje = data.agenda.length;
    var agendamentosConfirmar = data.pendencias.agendamentosPendentes.length;
    var calendarioPendente = 0; // placeholder para Google Calendar
    var igResumo = Marketing.getResumoInstagram();

    // WhatsApp operational indicators
    var wppItems = typeof Inbox.collectWhatsApp === 'function' ? Inbox.collectWhatsApp() : [];
    var wppCriticos = wppItems.filter(function(i) { return i.prioridade <= 1; }).length;
    var wppTempoMedio = 0;
    var wppComTempo = wppItems.filter(function(i) { return i.tempoDesdeUltima !== null; });
    if (wppComTempo.length > 0) {
      wppTempoMedio = Math.round(wppComTempo.reduce(function(s, i) { return s + i.tempoDesdeUltima; }, 0) / wppComTempo.length);
    }
    var wppAgendamentosHoje = 0;
    if (typeof Inbox.classificarMotivo === 'function') {
      wppAgendamentosHoje = wppItems.filter(function(i) {
        return i.motivo === 'agendamento' || i.motivo === 'confirmacao';
      }).length;
    }

    return {
      whatsapp: {
        pendentes: whatsappPendente, criticos: wppCriticos,
        tempoMedio: wppTempoMedio,
        tempoLabel: wppTempoMedio > 0 ? (wppTempoMedio < 60 ? wppTempoMedio + 'min' : Math.floor(wppTempoMedio / 60) + 'h' + (wppTempoMedio % 60) + 'min') : '—',
        label: whatsappPendente + ' conversa' + (whatsappPendente !== 1 ? 's' : '') + ' sem resposta' + (wppCriticos > 0 ? ' (' + wppCriticos + ' cr\u00edtica' + (wppCriticos !== 1 ? 's' : '') + ')' : '')
      },
      agenda: { hoje: agendamentosHoje, confirmar: agendamentosConfirmar, label: agendamentosHoje + ' agendamento' + (agendamentosHoje !== 1 ? 's' : '') + ' hoje' + (agendamentosConfirmar > 0 ? ' (' + agendamentosConfirmar + ' p/ confirmar)' : '') },
      calendario: { pendente: calendarioPendente, label: calendarioPendente > 0 ? calendarioPendente + ' evento' + (calendarioPendente !== 1 ? 's' : '') + ' n\u00e3o sincronizado' : 'Google Calendar: OK' },
      instagram: { hoje: igResumo.hoje, pendente: igResumo.atrasados, label: igResumo.label },
      whatsappAgendamentosHoje: wppAgendamentosHoje,
      totalPendencias: whatsappPendente + agendamentosConfirmar + calendarioPendente + igResumo.atrasados
    };
  }
};
