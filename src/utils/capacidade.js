const Capacidade = {
  _getBusinessHours: function() {
    var settings = Repos.studio.settings.get();
    var abertura = 10, fechamento = 19;
    try {
      if (settings.businessHours) {
        var match = settings.businessHours.match(/(\d{1,2})(?::\d{2})?\s*(?:h)?\s*(?:[-a\s])+\s*(\d{1,2})(?::\d{2})/i);
        if (match && match.length >= 3) { abertura = parseInt(match[1]); fechamento = parseInt(match[2]); }
        else {
          var digits = settings.businessHours.match(/(\d+)/g);
          if (digits && digits.length >= 2) { abertura = parseInt(digits[0]); fechamento = parseInt(digits[1]); }
        }
      }
    } catch(e) {}
    return { abertura: abertura, fechamento: fechamento, totalHoras: fechamento - abertura };
  },

  _parseTime: function(t) {
    var p = (t || '00:00').split(':');
    return parseInt(p[0]) + (parseInt(p[1] || 0) / 60);
  },

  _tempoDecorrido: function(dataRef) {
    if (!dataRef) return '';
    var diff = Date.now() - new Date(dataRef).getTime();
    var horas = Math.floor(diff / 3600000);
    if (horas < 1) return 'Agora';
    if (horas < 24) return horas + 'h atr\u00e1s';
    return Math.floor(horas / 24) + 'd atr\u00e1s';
  },

  hoje: function() {
    var hoje = DB._today();
    var business = this._getBusinessHours();
    var agora = new Date();
    var horaAtual = agora.getHours() + agora.getMinutes() / 60;

    var appointments = DB.getAppointmentsByDate(hoje).filter(function(a) { return a.status !== 'cancelled'; });
    var slotsOcupados = {};
    var duracaoTotalMin = 0;
    appointments.forEach(function(a) {
      var inicio = Capacidade._parseTime(a.time);
      var dur = parseInt(a.duration) || 60;
      duracaoTotalMin += dur;
      for (var m = 0; m < Math.ceil(dur / 60); m++) {
        slotsOcupados[Math.floor(inicio) + m] = true;
      }
    });

    var horasOcupadas = Math.round(duracaoTotalMin / 60 * 10) / 10;
    var horasDisponiveis = Math.max(0, business.totalHoras - horasOcupadas);
    var taxaOcupacao = business.totalHoras > 0 ? Math.round(duracaoTotalMin / (business.totalHoras * 60) * 100) : 0;

    var slotsLivres = [];
    for (var h = business.abertura; h < business.fechamento; h++) {
      if (h < horaAtual) continue;
      if (!slotsOcupados[h]) {
        slotsLivres.push({ hora: h.toString().padStart(2, '0') + ':00', horarioDecimal: h });
      }
    }

    var intervalosCurtos = [];
    var horasOcupadasArray = Object.keys(slotsOcupados).map(Number).sort(function(a, b) { return a - b; });
    for (var i = 0; i < horasOcupadasArray.length - 1; i++) {
      var gap = horasOcupadasArray[i + 1] - horasOcupadasArray[i];
      if (gap === 2 && business.fechamento - horasOcupadasArray[i + 1] >= 1 && horasOcupadasArray[i] - business.abertura >= 1) {
        intervalosCurtos.push({ inicio: (horasOcupadasArray[i] + 1).toString().padStart(2, '0') + ':00', horarioDecimal: horasOcupadasArray[i] + 1, duracao: 60 });
      } else if (gap === 1) {
        var anterior = horasOcupadasArray[i] - 1;
        var proximo = horasOcupadasArray[i + 1] + 1;
        if (anterior >= business.abertura && !slotsOcupados[anterior] && proximo < business.fechamento && !slotsOcupados[proximo]) {
          continue;
        }
      }
    }

    var proximosHorarios = slotsLivres.slice(0, 5);

    var timeline = [];
    for (var h2 = business.abertura; h2 < business.fechamento; h2++) {
      var horaStr = h2.toString().padStart(2, '0') + ':00';
      var ocupado = slotsOcupados[h2] || false;
      var passou = h2 < horaAtual;
      var appointment = null;
      appointments.forEach(function(a) {
        var inicioApt = Capacidade._parseTime(a.time);
        if (Math.floor(inicioApt) === h2 || (inicioApt < h2 + 1 && inicioApt >= h2)) {
          appointment = a;
        }
      });
      timeline.push({
        hora: horaStr, horarioDecimal: h2,
        ocupado: ocupado, passou: passou,
        appointment: appointment,
        livre: !ocupado && !passou
      });
    }

    return {
      data: hoje,
      horasDisponiveis: horasDisponiveis,
      horasOcupadas: horasOcupadas,
      taxaOcupacao: taxaOcupacao,
      totalSlots: business.totalHoras,
      slotsLivres: slotsLivres,
      intervalosCurtos: intervalosCurtos,
      proximosHorarios: proximosHorarios,
      timeline: timeline,
      totalAppointments: appointments.length,
      businessAbertura: business.abertura,
      businessFechamento: business.fechamento,
      horaAtual: horaAtual
    };
  },

  resumoDiario: function(dias) {
    var hoje = DB._today();
    var business = this._getBusinessHours();
    var resultados = [];

    for (var d = 0; d < dias; d++) {
      var data = new Date(Date.now() + d * 86400000);
      var dataStr = data.toISOString().slice(0, 10);
      var diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'long' });

      var apps = DB.getAppointmentsByDate(dataStr).filter(function(a) { return a.status !== 'cancelled'; });
      var duracaoTotal = 0;
      apps.forEach(function(a) {
        duracaoTotal += parseInt(a.duration) || 60;
      });

      var horasOcupadas = duracaoTotal / 60;
      var taxa = business.totalHoras > 0 ? Math.round(horasOcupadas / business.totalHoras * 100) : 0;
      var slotsLivres = business.totalHoras - Math.ceil(horasOcupadas);

      var capacidadeRestante = Math.max(0, business.totalHoras - Math.ceil(horasOcupadas));

      resultados.push({
        data: dataStr,
        diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
        totalAppointments: apps.length,
        horasOcupadas: Math.round(horasOcupadas * 10) / 10,
        taxa: taxa,
        slotsLivres: Math.max(0, slotsLivres),
        capacidadeRestante: capacidadeRestante,
        isToday: dataStr === hoje,
        isPast: dataStr < hoje
      });
    }
    return resultados;
  },

  resumoPorPeriodo: function(tipo) {
    var dias = tipo === 'semana' ? 7 : tipo === 'mes' ? 30 : 7;
    var diario = this.resumoDiario(dias);

    var totalSlots = 0, totalOcupados = 0;
    diario.forEach(function(d) {
      if (d.isPast) return;
      totalSlots += Capacidade._getBusinessHours().totalHoras;
      totalOcupados += d.horasOcupadas;
    });

    var mediaOcupacao = totalSlots > 0 ? Math.round(totalOcupados / totalSlots * 100) : 0;

    var maisCheios = diario.slice().sort(function(a, b) { return b.taxa - a.taxa; });
    var maisVazios = diario.slice().sort(function(a, b) { return a.taxa - b.taxa; }).filter(function(d) { return d.taxa < 50; });

    var baixaOcupacao = diario.filter(function(d) { return d.taxa <= 40 && !d.isPast; });
    var capacidadeMaxima = diario.filter(function(d) { return d.taxa >= 80 && !d.isPast; });
    var totalPrevisto = diario.filter(function(d) { return !d.isPast; }).length;

    return {
      tipo: tipo,
      dias: diario,
      mediaOcupacao: mediaOcupacao,
      totalPrevisto: totalPrevisto,
      baixaOcupacao: baixaOcupacao,
      capacidadeMaxima: capacidadeMaxima,
      rankingMaisCheios: maisCheios.slice(0, 5),
      rankingMaisVazios: maisVazios.length > 0 ? maisVazios.slice(0, 5) : []
    };
  },

  tempoMedioPorServico: function() {
    var appointments = DB.getAppointments().filter(function(a) { return a.status === 'completed' || a.status === 'confirmed'; });
    var porServico = {};
    appointments.forEach(function(a) {
      var servico = a.service || 'Sem servi\u00e7o';
      if (!porServico[servico]) porServico[servico] = { servico: servico, total: 0, count: 0 };
      porServico[servico].total += parseInt(a.duration) || 60;
      porServico[servico].count++;
    });
    var resultados = [];
    Object.keys(porServico).forEach(function(s) {
      var item = porServico[s];
      resultados.push({
        servico: s,
        tempoMedio: item.count > 0 ? Math.round(item.total / item.count) : 60,
        totalMinutos: item.total,
        quantidade: item.count
      });
    });
    resultados.sort(function(a, b) { return b.quantidade - a.quantidade; });
    return resultados;
  },

  collectRecomendacoes: function() {
    var hoje = this.hoje();
    var recs = [];
    var business = this._getBusinessHours();

    if (hoje.taxaOcupacao < 50 && hoje.horasDisponiveis >= 2) {
      recs.push({
        tipo: 'janela_livre',
        titulo: 'Janela livre na agenda de hoje',
        descricao: hoje.horasDisponiveis + 'h dispon\u00edveis com taxa de ocupa\u00e7\u00e3o de ' + hoje.taxaOcupacao + '%. Aproveite para antecipar agendamentos ou contatar leads.',
        score: 65,
        acaoLabel: 'Ver agenda',
        acaoTipo: 'agenda',
        acaoPayload: {}
      });
    }

    if (hoje.intervalosCurtos.length > 0) {
      recs.push({
        tipo: 'intervalos_curtos',
        titulo: 'Intervalos curtos identificados',
        descricao: hoje.intervalosCurtos.length + ' intervalo(s) curto(s) entre atendimentos. Ideal para retoques ou avalia\u00e7\u00f5es r\u00e1pidas.',
        score: 50,
        acaoLabel: 'Ver hor\u00e1rios',
        acaoTipo: 'agenda',
        acaoPayload: {}
      });
    }

    if (hoje.proximosHorarios.length > 0) {
      var lista = hoje.proximosHorarios.slice(0, 3).map(function(h) { return h.hora; }).join(', ');
      recs.push({
        tipo: 'horarios_disponiveis',
        titulo: 'Pr\u00f3ximos hor\u00e1rios dispon\u00edveis',
        descricao: 'Hor\u00e1rios livres: ' + lista + '. Abra oportunidades ou contate leads.',
        score: 55,
        acaoLabel: 'Abrir oportunidades',
        acaoTipo: 'oportunidade',
        acaoPayload: {}
      });
    }

    var semanal = this.resumoPorPeriodo('semana');
    semanal.baixaOcupacao.forEach(function(d) {
      var diasAte = Math.ceil((new Date(d.data) - Date.now()) / 86400000);
      recs.push({
        tipo: 'baixa_ocupacao',
        titulo: d.diaSemana + ' (' + d.data + ') — ' + d.taxa + '% ocupa\u00e7\u00e3o',
        descricao: 'Apenas ' + d.totalAppointments + ' agendamento(s). ' + d.capacidadeRestante + ' hor\u00e1rio(s) dispon\u00edvel(is). Programe conte\u00fado ou promo\u00e7\u00e3o.',
        score: Math.max(40, 60 - diasAte),
        acaoLabel: 'Criar agendamento',
        acaoTipo: 'agenda',
        acaoPayload: {}
      });
    });

    recs.sort(function(a, b) { return b.score - a.score; });
    return recs;
  }
};

// Auto-registrar recomenda\u00e7\u00f5es no Recomendacoes
(function() {
  if (typeof Recomendacoes !== 'undefined') {
    var originalCollect = Recomendacoes.collect;
    Recomendacoes.collect = function() {
      var recs = originalCollect ? originalCollect() : [];
      try {
        var capRecs = Capacidade.collectRecomendacoes();
        capRecs.forEach(function(cr) {
          recs.push({
            id: 'cap_' + Date.now().toString(36) + '_' + recs.length,
            titulo: cr.titulo,
            motivo: cr.descricao,
            impacto: 'Otimiza\u00e7\u00e3o da capacidade operacional.',
            acaoLabel: cr.acaoLabel,
            tipo: cr.acaoTipo,
            payload: cr.acaoPayload || {},
            score: cr.score,
            origem: 'capacidade'
          });
        });
      } catch(e) {}
      recs.sort(function(a, b) { return b.score - a.score; });
      return recs;
    };
  }
})();

// Auto-registrar atualiza\u00e7\u00e3o via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('agenda.created', function() { EventBus.emit('capacidade.updated'); });
  EventBus.on('agenda.updated', function() { EventBus.emit('capacidade.updated'); });
  EventBus.on('agenda.cancelled', function() { EventBus.emit('capacidade.updated'); });
  EventBus.on('agenda.confirmed', function() { EventBus.emit('capacidade.updated'); });
})();
