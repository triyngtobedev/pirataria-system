App._capView = 'hoje';

App.refreshCapacidade = function() {
  if (this.currentModule === 'capacidade') this.renderCapacidade();
};

App.renderCapacidade = function() {
  App._capView = 'hoje';
  App._renderCapacidadeAtual();
};

App._renderCapacidadeAtual = function() {
  var hoje = Capacidade.hoje();
  var tipoPeriodo = App._capView === 'semana' ? 'semana' : App._capView === 'mes' ? 'mes' : 'semana';
  var periodo = Capacidade.resumoPorPeriodo(tipoPeriodo);
  var tempoServicos = Capacidade.tempoMedioPorServico();
  var business = Capacidade._getBusinessHours();

  var html = '<div class="cap-wrap">';

  // ─── Abas ───
  html += '<div class="cap-aba">' +
    '<button class="btn btn-sm' + (App._capView === 'hoje' ? ' btn-primary' : '') + '" onclick="App._capMudarAba(\'hoje\')">Hoje</button>' +
    '<button class="btn btn-sm' + (App._capView === 'semana' ? ' btn-primary' : '') + '" onclick="App._capMudarAba(\'semana\')">Semana</button>' +
    '<button class="btn btn-sm' + (App._capView === 'mes' ? ' btn-primary' : '') + '" onclick="App._capMudarAba(\'mes\')">M\u00eas</button>' +
  '</div>';

  if (App._capView === 'hoje') {
    html += App._capRenderHoje(hoje, periodo, tempoServicos, business);
  } else if (App._capView === 'semana' || App._capView === 'mes') {
    html += App._capRenderPeriodo(periodo, tempoServicos);
  }

  html += '</div>';
  document.getElementById('moduleContent').innerHTML = html;
};

App._capMudarAba = function(aba) {
  App._capView = aba;
  App._renderCapacidadeAtual();
};

App._capRenderHoje = function(hoje, periodo, tempoServicos, business) {
  var html = '';

  // ─── M\u00e9tricas principais ───
  html += '<div class="cap-metrics">' +
    '<div class="cap-card cap-card-blue"><span class="cap-card-val">' + hoje.horasDisponiveis.toFixed(1) + 'h</span><span class="cap-card-lbl">Dispon\u00edveis</span></div>' +
    '<div class="cap-card cap-card-red"><span class="cap-card-val">' + hoje.horasOcupadas.toFixed(1) + 'h</span><span class="cap-card-lbl">Ocupadas</span></div>' +
    '<div class="cap-card cap-card-gold"><span class="cap-card-val">' + hoje.taxaOcupacao + '%</span><span class="cap-card-lbl">Taxa de ocupa\u00e7\u00e3o</span></div>' +
    '<div class="cap-card cap-card-purple"><span class="cap-card-val">' + hoje.totalAppointments + '</span><span class="cap-card-lbl">Agendamentos</span></div>' +
    '<div class="cap-card cap-card-teal"><span class="cap-card-val">' + hoje.slotsLivres.length + '</span><span class="cap-card-lbl">Hor\u00e1rios vagos</span></div>' +
  '</div>';

  // ─── Barra de ocupa\u00e7\u00e3o ───
  var pct = Math.min(100, hoje.taxaOcupacao);
  var barCls = pct >= 80 ? 'cap-bar-red' : pct >= 50 ? 'cap-bar-yellow' : 'cap-bar-green';
  html += '<div class="cap-bar-wrap"><div class="cap-bar ' + barCls + '" style="width:' + pct + '%;"></div></div>';

  // ─── A\u00e7\u00f5es r\u00e1pidas ───
  html += '<div class="cap-rapidas">' +
    '<button class="btn btn-sm btn-primary" onclick="App.navigate(\'agenda\')">Abrir Agenda</button>' +
    '<button class="btn btn-sm btn-primary" onclick="App._capCriarAgendamento()">Criar agendamento</button>' +
    '<button class="btn btn-sm" onclick="App.navigate(\'inbox\')">Pr\u00e9-agendamentos</button>' +
    '<button class="btn btn-sm" onclick="App.navigate(\'oportunidades\')">Oportunidades</button>' +
    '<button class="btn btn-sm" onclick="App.navigate(\'agenda\')">Lista de espera</button>' +
  '</div>';

  // ─── Timeline do dia ───
  html += '<div class="cap-section"><div class="cap-section-title">Timeline do dia</div>' +
    '<div class="cap-timeline">';

  hoje.timeline.forEach(function(t) {
    var cls = t.livre ? 'cap-tl-livre' : t.ocupado ? 'cap-tl-ocupado' : 'cap-tl-passou';
    var label = t.livre ? 'Livre' : t.ocupado ? (t.appointment ? t.appointment.clientName : 'Ocupado') : (t.passou ? 'Passou' : '');
    var cor = t.livre ? 'var(--green)' : t.ocupado ? 'var(--accent-hover)' : 'var(--text-dim)';
    var bg = t.livre ? '#16a34a15' : t.ocupado ? '#dc262615' : 'transparent';
    html += '<div class="cap-tl-item ' + cls + '" style="background:' + bg + ';">' +
      '<span class="cap-tl-hora">' + t.hora + '</span>' +
      '<span class="cap-tl-bar" style="background:' + cor + ';"></span>' +
      '<span class="cap-tl-label">' + (t.appointment ? App._esc(t.appointment.clientName + ' — ' + t.appointment.service) : label) + '</span>' +
    '</div>';
  });

  html += '</div></div>';

  // ─── Pr\u00f3ximos hor\u00e1rios dispon\u00edveis ───
  if (hoje.proximosHorarios.length > 0) {
    html += '<div class="cap-section"><div class="cap-section-title">Pr\u00f3ximos hor\u00e1rios dispon\u00edveis</div>' +
      '<div class="cap-slots">';
    hoje.proximosHorarios.forEach(function(h) {
      html += '<div class="cap-slot" onclick="App._capCriarAgendamento()">' +
        '<span class="cap-slot-hora">' + h.hora + '</span>' +
        '<span class="cap-slot-cta">Agendar</span>' +
      '</div>';
    });
    html += '</div></div>';
  }

  // ─── Intervalos curtos ───
  if (hoje.intervalosCurtos.length > 0) {
    html += '<div class="cap-section"><div class="cap-section-title">Intervalos curtos n\u00e3o aproveitados</div>' +
      '<div class="cap-slots">';
    hoje.intervalosCurtos.forEach(function(i) {
      html += '<div class="cap-slot cap-slot-short">' +
        '<span class="cap-slot-hora">' + i.inicio + '</span>' +
        '<span class="cap-slot-dur">' + i.duracao + 'min</span>' +
        '<span class="cap-slot-cta">Aproveitar</span>' +
      '</div>';
    });
    html += '</div></div>';
  }

  return html;
};

App._capRenderPeriodo = function(periodo, tempoServicos) {
  var html = '';

  // ─── M\u00e9tricas do per\u00edodo ───
  html += '<div class="cap-metrics">' +
    '<div class="cap-card cap-card-gold"><span class="cap-card-val">' + periodo.mediaOcupacao + '%</span><span class="cap-card-lbl">M\u00e9dia de ocupa\u00e7\u00e3o</span></div>' +
    '<div class="cap-card cap-card-blue"><span class="cap-card-val">' + periodo.dias.length + '</span><span class="cap-card-lbl">Dias analisados</span></div>' +
    '<div class="cap-card cap-card-red"><span class="cap-card-val">' + periodo.baixaOcupacao.length + '</span><span class="cap-card-lbl">Dias com baixa ocupa\u00e7\u00e3o</span></div>' +
    '<div class="cap-card cap-card-purple"><span class="cap-card-val">' + periodo.capacidadeMaxima.length + '</span><span class="cap-card-lbl">Pr\u00f3x. da capacidade</span></div>' +
  '</div>';

  // ─── Calend\u00e1rio simplificado ───
  html += '<div class="cap-section"><div class="cap-section-title">Calend\u00e1rio de ocupa\u00e7\u00e3o</div>' +
    '<div class="cap-cal">';

  periodo.dias.forEach(function(d) {
    if (d.isPast) return;
    var cls = d.taxa >= 80 ? 'cap-cal-cheio' : d.taxa >= 50 ? 'cap-cal-medio' : d.taxa > 0 ? 'cap-cal-vazio' : 'cap-cal-vazio';
    var title = d.diaSemana + ' ' + d.data + ' — ' + d.taxa + '% (' + d.totalAppointments + ' agendamentos)';
    html += '<div class="cap-cal-dia ' + cls + '" title="' + title + '">' +
      '<span class="cap-cal-nome">' + d.diaSemana.slice(0, 3) + '</span>' +
      '<span class="cap-cal-num">' + new Date(d.data + 'T12:00:00').getDate() + '</span>' +
      '<span class="cap-cal-taxa">' + d.taxa + '%</span>' +
    '</div>';
  });

  html += '</div></div>';

  // ─── Resumo semanal ───
  html += '<div class="cap-section"><div class="cap-section-title">Detalhamento por dia</div>' +
    '<div class="cap-tabela-wrap"><table class="cap-tabela">' +
    '<thead><tr>' +
      '<th>Dia</th><th>Data</th><th>Agendamentos</th><th>Horas ocupadas</th><th>Taxa</th><th>Vagas restantes</th>' +
    '</tr></thead><tbody>';

  periodo.dias.forEach(function(d) {
    if (d.isPast) return;
    var badgeCls = d.taxa >= 80 ? 'badge-cancelled' : d.taxa >= 50 ? 'badge-waiting' : 'badge-scheduled';
    html += '<tr>' +
      '<td>' + d.diaSemana + '</td>' +
      '<td class="text-sm">' + d.data + '</td>' +
      '<td>' + d.totalAppointments + '</td>' +
      '<td>' + d.horasOcupadas + 'h</td>' +
      '<td><span class="badge ' + badgeCls + '">' + d.taxa + '%</span></td>' +
      '<td>' + d.capacidadeRestante + 'h</td>' +
    '</tr>';
  });

  html += '</tbody></table></div></div>';

  // ─── Ranking ───
  if (periodo.rankingMaisVazios.length > 0) {
    html += '<div class="cap-section"><div class="cap-section-title">Dias mais vazios (menor ocupa\u00e7\u00e3o)</div>';
    periodo.rankingMaisVazios.forEach(function(d, idx) {
      html += '<div class="cap-rank-item" onclick="App.navigate(\'agenda\')">' +
        '<span class="cap-rank-pos">' + (idx + 1) + '\u00BA</span>' +
        '<span class="cap-rank-body"><strong>' + d.diaSemana + '</strong> ' + d.data + '</span>' +
        '<span class="cap-rank-val">' + d.totalAppointments + ' agend. \u2022 ' + d.taxa + '%</span>' +
      '</div>';
    });
    html += '</div>';
  }

  if (periodo.rankingMaisCheios.length > 0) {
    html += '<div class="cap-section"><div class="cap-section-title">Dias mais cheios (maior ocupa\u00e7\u00e3o)</div>';
    periodo.rankingMaisCheios.forEach(function(d, idx) {
      html += '<div class="cap-rank-item" onclick="App.navigate(\'agenda\')">' +
        '<span class="cap-rank-pos">' + (idx + 1) + '\u00BA</span>' +
        '<span class="cap-rank-body"><strong>' + d.diaSemana + '</strong> ' + d.data + '</span>' +
        '<span class="cap-rank-val">' + d.totalAppointments + ' agend. \u2022 ' + d.taxa + '%</span>' +
      '</div>';
    });
    html += '</div>';
  }

  // ─── Tempo m\u00e9dio por servi\u00e7o ───
  if (tempoServicos.length > 0) {
    html += '<div class="cap-section"><div class="cap-section-title">Tempo m\u00e9dio por servi\u00e7o</div>' +
      '<div class="cap-tabela-wrap"><table class="cap-tabela">' +
      '<thead><tr><th>Servi\u00e7o</th><th>Qtd</th><th>Tempo m\u00e9dio</th></tr></thead><tbody>';

    tempoServicos.forEach(function(s) {
      html += '<tr><td>' + App._esc(s.servico) + '</td><td>' + s.quantidade + '</td><td>' + s.tempoMedio + 'min</td></tr>';
    });

    html += '</tbody></table></div></div>';
  }

  return html;
};

App._capCriarAgendamento = function() {
  if (typeof App.showAddAppointment === 'function') {
    App.showAddAppointment(DB._today());
  } else {
    App.navigate('agenda');
  }
};

// Auto-registrar refresh via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('capacidade.updated', function() {
    if (typeof App !== 'undefined' && App.refreshCapacidade) App.refreshCapacidade();
  });
})();
