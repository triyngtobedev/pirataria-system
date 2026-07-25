App._dioDias = 7;
App._dioBusca = '';
App._dioAba = 'resumo';

App.refreshDiarioOperacional = function() {
  if (this.currentModule === 'diario_operacional') this.renderDiarioOperacional();
};

App.renderDiarioOperacional = function() {
  App._dioAba = 'resumo';
  App._dioBusca = '';
  App._renderDioAtual();
};

App._renderDioAtual = function() {
  var html = '<div class="dio-wrap">';

  // ─── Abas ───
  html += '<div class="dio-aba">' +
    '<button class="btn btn-sm' + (App._dioAba === 'resumo' ? ' btn-primary' : '') + '" onclick="App._dioMudarAba(\'resumo\')">Resumo</button>' +
    '<button class="btn btn-sm' + (App._dioAba === 'detalhes' ? ' btn-primary' : '') + '" onclick="App._dioMudarAba(\'detalhes\')">Linha do tempo</button>' +
    '<button class="btn btn-sm' + (App._dioAba === 'busca' ? ' btn-primary' : '') + '" onclick="App._dioMudarAba(\'busca\')">Buscar</button>' +
    '<button class="btn btn-sm' + (App._dioAba === 'exportar' ? ' btn-primary' : '') + '" onclick="App._dioMudarAba(\'exportar\')">Exportar</button>' +
  '</div>';

  if (App._dioAba === 'resumo') html += App._dioRenderResumo();
  else if (App._dioAba === 'detalhes') html += App._dioRenderDetalhes();
  else if (App._dioAba === 'busca') html += App._dioRenderBusca();
  else if (App._dioAba === 'exportar') html += App._dioRenderExportar();

  html += '</div>';
  document.getElementById('moduleContent').innerHTML = html;
};

// ─── Aba Resumo ───
App._dioRenderResumo = function() {
  var periodo = DiarioOperacional.indicadoresPeriodo(App._dioDias);

  var html = '';

  // Seletor de per\u00edodo
  html += '<div class="dio-periodo">' +
    '<label style="font-size:0.75rem;margin-right:6px;color:var(--text-muted);">Per\u00edodo:</label>' +
    '<select onchange="App._dioSetDias(parseInt(this.value))" style="font-size:0.75rem;padding:3px 6px;">' +
      '<option value="1"' + (App._dioDias === 1 ? ' selected' : '') + '>Hoje</option>' +
      '<option value="7"' + (App._dioDias === 7 ? ' selected' : '') + '>7 dias</option>' +
      '<option value="15"' + (App._dioDias === 15 ? ' selected' : '') + '>15 dias</option>' +
      '<option value="30"' + (App._dioDias === 30 ? ' selected' : '') + '>30 dias</option>' +
    '</select>' +
    '<span style="font-size:0.7rem;color:var(--text-dim);margin-left:8px;">' + periodo.totalEventos + ' eventos no per\u00edodo</span>' +
  '</div>';

  // Indicadores
  html += '<div class="dio-indicadores">';
  periodo.indicadores.forEach(function(ind) {
    if (ind.quantidade === 0) return;
    html += '<div class="dio-card">' +
      '<span class="dio-card-icon">' + ind.icon + '</span>' +
      '<span class="dio-card-val">' + ind.quantidade + '</span>' +
      '<span class="dio-card-lbl">' + ind.label + '</span>' +
      '<span class="dio-card-media">' + ind.mediaDiaria + '/dia</span>' +
    '</div>';
  });
  html += '</div>';

  // Resumo por dia
  html += '<div class="dio-section"><div class="dio-section-title">Resumo di\u00e1rio</div>';
  periodo.resumos.forEach(function(r) {
    var isHoje = r.data === DB._today();
    html += '<div class="dio-dia' + (isHoje ? ' dio-dia-hoje' : '') + '">' +
      '<div class="dio-dia-header" onclick="App._dioToggleExpand(\'' + r.data + '\')">' +
        '<span class="dio-dia-label">' + (isHoje ? 'Hoje — ' : '') + r.dataLabel + '</span>' +
        '<span class="dio-dia-total">' + r.totalEventos + ' eventos</span>' +
        '<span class="dio-dia-toggle" id="dio_toggle_' + r.data + '">\u25BC</span>' +
      '</div>' +
      '<div class="dio-dia-body" id="dio_body_' + r.data + '" style="display:none;">' +
        '<div class="dio-dia-indicadores">';
    Object.keys(r.indicadores).forEach(function(k) {
      if (r.indicadores[k] === 0) return;
      var comp = r.comparacao[k] || {};
      var pctStr = comp.pct !== undefined ? (comp.pct > 0 ? ' \u2191' + comp.pct + '%' : comp.pct < 0 ? ' \u2193' + Math.abs(comp.pct) + '%' : ' \u2014') : '';
      html += '<div class="dio-dia-ind"><span class="dio-dia-ind-icon">' + DiarioOperacional._indicadorIcon(k) + '</span>' +
        '<span>' + DiarioOperacional._indicadorLabel(k) + ': <strong>' + r.indicadores[k] + '</strong></span>' +
        '<span class="dio-dia-comp' + ((comp.pct || 0) > 0 ? ' dio-dia-up' : (comp.pct || 0) < 0 ? ' dio-dia-down' : '') + '">' + pctStr + '</span></div>';
    });
    html += '</div>';

    // Gargalos
    if (r.gargalos.length > 0) {
      html += '<div class="dio-dia-gargalos"><strong>\u26A0 Gargalos:</strong>';
      r.gargalos.forEach(function(g) { html += '<div class="dio-dia-gargalo">\u2022 ' + g + '</div>'; });
      html += '</div>';
    }

    // Conquistas
    if (r.conquistas.length > 0) {
      html += '<div class="dio-dia-conquistas"><strong>\u2728 Conquistas:</strong>';
      r.conquistas.forEach(function(c) { html += '<div class="dio-dia-conquista">\u2022 ' + c + '</div>'; });
      html += '</div>';
    }

    // Anota\u00e7\u00f5es do dia
    var anotacoes = DiarioOperacional.getAnotacoes(r.data);
    if (anotacoes.length > 0) {
      html += '<div class="dio-dia-anotacoes"><strong>\uD83D\uDCDD Anota\u00e7\u00f5es:</strong>';
      anotacoes.forEach(function(a) { html += '<div class="dio-dia-anotacao">\u2022 ' + App._esc(a.texto) + '</div>'; });
      html += '</div>';
    }

    // Bot\u00e3o anotar
    html += '<button class="btn btn-sm" style="margin-top:6px;font-size:0.65rem;" onclick="App._dioAnotar(\'' + r.data + '\')">+ Anotar</button>';

    html += '</div></div>'; // .dio-dia-body + .dio-dia
  });
  html += '</div>';

  return html;
};

// ─── Aba Detalhes (Linha do Tempo) ───
App._dioRenderDetalhes = function() {
  var periodo = DiarioOperacional.indicadoresPeriodo(App._dioDias);

  var html = '<div class="dio-periodo">' +
    '<label style="font-size:0.75rem;margin-right:6px;color:var(--text-muted);">Per\u00edodo:</label>' +
    '<select onchange="App._dioSetDias(parseInt(this.value));App._dioMudarAba(\'detalhes\')" style="font-size:0.75rem;padding:3px 6px;">' +
      '<option value="1"' + (App._dioDias === 1 ? ' selected' : '') + '>Hoje</option>' +
      '<option value="7"' + (App._dioDias === 7 ? ' selected' : '') + '>7 dias</option>' +
      '<option value="15"' + (App._dioDias === 15 ? ' selected' : '') + '>15 dias</option>' +
      '<option value="30"' + (App._dioDias === 30 ? ' selected' : '') + '>30 dias</option>' +
    '</select>' +
  '</div>';

  html += '<div class="dio-section"><div class="dio-section-title">Linha do tempo consolidada</div>';

  var todosDetalhes = [];
  periodo.resumos.forEach(function(r) {
    r.detalhes.forEach(function(d) {
      todosDetalhes.push({ data: r.data, dataLabel: r.dataLabel, horario: d.horario, evento: d.evento, modulo: d.modulo, entidade: d.entidade, payload: d.payload });
    });
  });
  todosDetalhes.sort(function(a, b) { return (a.data + a.horario) > (b.data + b.horario) ? -1 : 1; });

  if (todosDetalhes.length === 0) {
    html += C.emptyState('Nenhum evento registrado no per\u00edodo.');
  } else {
    html += '<div class="dio-timeline">';
    todosDetalhes.slice(0, 100).forEach(function(d) {
      var isHoje = d.data === DB._today();
      html += '<div class="dio-tl-item' + (isHoje ? ' dio-tl-hoje' : '') + '">' +
        '<span class="dio-tl-data">' + (isHoje ? 'Hoje' : d.dataLabel.slice(0, 3)) + '</span>' +
        '<span class="dio-tl-hora">' + d.horario + '</span>' +
        '<span class="dio-tl-evento">' + App._esc(d.evento) + '</span>' +
        '<span class="dio-tl-modulo">' + App._esc(d.modulo || '—') + '</span>' +
      '</div>';
    });
    if (todosDetalhes.length > 100) {
      html += '<div class="dio-tl-mais">+ ' + (todosDetalhes.length - 100) + ' eventos. Use a busca ou reduza o per\u00edodo.</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
};

// ─── Aba Busca ───
App._dioRenderBusca = function() {
  var resultados = App._dioBusca ? DiarioOperacional.buscar(App._dioBusca, 30) : [];

  var html = '<div class="dio-busca-wrap">' +
    '<input type="text" id="dioBuscaInput" placeholder="Buscar por tipo de evento, m\u00f3dulo, entidade..." value="' + App._esc(App._dioBusca) + '" oninput="App._dioExecutarBusca(this.value)" style="width:100%;padding:8px 12px;font-size:0.85rem;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text);">' +
  '</div>';

  if (App._dioBusca) {
    if (resultados.length === 0) {
      html += C.emptyState('Nenhum evento encontrado para "' + App._esc(App._dioBusca) + '"');
    } else {
      html += '<div style="font-size:0.75rem;color:var(--text-muted);margin:4px 0;">' + resultados.reduce(function(s, r) { return s + r.detalhes.length; }, 0) + ' resultado(s) para "' + App._esc(App._dioBusca) + '"</div>';
      html += '<div class="dio-timeline">';
      resultados.forEach(function(r) {
        r.detalhes.forEach(function(d) {
          html += '<div class="dio-tl-item">' +
            '<span class="dio-tl-data">' + r.dataLabel.slice(0, 3) + '</span>' +
            '<span class="dio-tl-hora">' + d.horario + '</span>' +
            '<span class="dio-tl-evento">' + App._esc(d.evento) + '</span>' +
            '<span class="dio-tl-modulo">' + App._esc(d.modulo || '—') + '</span>' +
          '</div>';
        });
      });
      html += '</div>';
    }
  } else {
    html += '<div style="font-size:0.8rem;color:var(--text-muted);padding:20px 0;text-align:center;">Digite um termo para buscar na timeline dos \u00faltimos 30 dias.</div>';
  }
  return html;
};

// ─── Aba Exportar ───
App._dioRenderExportar = function() {
  var dias = App._dioDias;

  var html = '<div class="dio-export">' +
    '<div class="dio-section-title" style="margin-bottom:12px;">Exportar di\u00e1rio operacional</div>' +
    '<div class="dio-periodo" style="margin-bottom:12px;">' +
      '<label style="font-size:0.75rem;margin-right:6px;color:var(--text-muted);">Per\u00edodo:</label>' +
      '<select id="dioExportDias" style="font-size:0.75rem;padding:3px 6px;">' +
        '<option value="1"' + (dias === 1 ? ' selected' : '') + '>Hoje</option>' +
        '<option value="7"' + (dias === 7 ? ' selected' : '') + '>7 dias</option>' +
        '<option value="15"' + (dias === 15 ? ' selected' : '') + '>15 dias</option>' +
        '<option value="30"' + (dias === 30 ? ' selected' : '') + '>30 dias</option>' +
      '</select>' +
    '</div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-primary btn-sm" onclick="App._dioExportJSON()">Exportar JSON</button>' +
      '<button class="btn btn-sm" onclick="App._dioExportCSV()">Exportar CSV</button>' +
    '</div>' +
    '<div id="dioExportOutput" style="margin-top:12px;"></div>' +
  '</div>';
  return html;
};

// ─── Helpers ───
App._dioMudarAba = function(aba) {
  App._dioAba = aba;
  App._renderDioAtual();
};

App._dioSetDias = function(dias) {
  App._dioDias = dias;
  App._renderDioAtual();
};

App._dioToggleExpand = function(data) {
  var body = document.getElementById('dio_body_' + data);
  var toggle = document.getElementById('dio_toggle_' + data);
  if (body && toggle) {
    var isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    toggle.textContent = isOpen ? '\u25BC' : '\u25B2';
  }
};

App._dioExecutarBusca = function(valor) {
  App._dioBusca = valor;
  App._dioMudarAba('busca');
};

App._dioAnotar = function(data) {
  var dataLabel = data === DB._today() ? 'Hoje' : data;
  App._showOverlay('Anotar no di\u00e1rio (' + dataLabel + ')', '<div class="form-group"><label>Observa\u00e7\u00e3o</label><textarea id="dioAnotacaoTexto" rows="3" style="width:100%;" placeholder="Ex: Dia produtivo, consegui atender todos os clientes no hor\u00e1rio..."></textarea></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._dioSalvarAnotacao(\'' + data + '\')">Salvar</button></div>');
};

App._dioSalvarAnotacao = function(data) {
  var texto = document.getElementById('dioAnotacaoTexto').value.trim();
  if (!texto) { App._toast('Digite uma observa\u00e7\u00e3o.', 'warning'); return; }
  DiarioOperacional.adicionarAnotacao(data, texto);
  App._closeOverlay();
  App._toast('Anota\u00e7\u00e3o salva no di\u00e1rio.', 'success');
  App._renderDioAtual();
};

App._dioExportJSON = function() {
  var dias = parseInt(document.getElementById('dioExportDias').value);
  var json = DiarioOperacional.exportarJSON(dias);
  var output = document.getElementById('dioExportOutput');
  output.innerHTML = '<textarea rows="10" style="width:100%;font-size:0.7rem;font-family:monospace;" readonly>' + App._esc(json) + '</textarea>' +
    '<button class="btn btn-sm" style="margin-top:4px;" onclick="App._dioCopiarTexto(\'' + App._esc(json.replace(/'/g, "\\'")) + '\')">Copiar</button>';
};

App._dioExportCSV = function() {
  var dias = parseInt(document.getElementById('dioExportDias').value);
  var csv = DiarioOperacional.exportarCSV(dias);
  var output = document.getElementById('dioExportOutput');
  output.innerHTML = '<textarea rows="10" style="width:100%;font-size:0.7rem;font-family:monospace;" readonly>' + App._esc(csv) + '</textarea>' +
    '<button class="btn btn-sm" style="margin-top:4px;" onclick="App._dioCopiarTexto(\'' + App._esc(csv.replace(/'/g, "\\'")) + '\')">Copiar</button>';
};

App._dioCopiarTexto = function(texto) {
  navigator.clipboard.writeText(texto).then(function() {
    App._toast('Copiado para a \u00e1rea de transfer\u00eancia.', 'success');
  }).catch(function() {
    App._toast('Erro ao copiar.', 'error');
  });
};

// Auto-registrar refresh via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('diario_operacional.updated', function() {
    if (typeof App !== 'undefined' && App.refreshDiarioOperacional) App.refreshDiarioOperacional();
  });
})();
