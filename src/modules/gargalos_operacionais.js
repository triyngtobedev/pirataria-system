App._garFiltro = 'todos';

App.refreshGargalosOperacionais = function() {
  if (this.currentModule === 'gargalos_operacionais') this.renderGargalosOperacionais();
};

App.renderGargalosOperacionais = function() {
  App._garFiltro = 'todos';
  App._renderGarAtual();
};

App._renderGarAtual = function() {
  var analise = GargalosOperacionais.analisar();
  var gargalos = analise.gargalos;
  var historico = GargalosOperacionais.getHistorico();

  if (App._garFiltro === 'critico') gargalos = gargalos.filter(function(g) { return g.prioridade === 'Cr\u00edtico'; });
  else if (App._garFiltro === 'alto') gargalos = gargalos.filter(function(g) { return g.prioridade === 'Alto'; });
  else if (App._garFiltro === 'medio') gargalos = gargalos.filter(function(g) { return g.prioridade === 'M\u00e9dio'; });
  else if (App._garFiltro === 'resolvidos') gargalos = gargalos.filter(function(g) { return g.resolvido; });
  else gargalos = gargalos.filter(function(g) { return !g.resolvido; });

  var html = '<div class="gar-wrap">';

  // ─── M\u00e9tricas ───
  html += '<div class="gar-metrics">' +
    '<div class="gar-card gar-card-red"><span class="gar-card-val">' + analise.criticos + '</span><span class="gar-card-lbl">Cr\u00edticos</span></div>' +
    '<div class="gar-card gar-card-orange"><span class="gar-card-val">' + analise.altos + '</span><span class="gar-card-lbl">Altos</span></div>' +
    '<div class="gar-card gar-card-blue"><span class="gar-card-val">' + analise.totalGargalos + '</span><span class="gar-card-lbl">Total detectados</span></div>' +
    '<div class="gar-card gar-card-green"><span class="gar-card-val">' + historico.length + '</span><span class="gar-card-lbl">An\u00e1lises realizadas</span></div>' +
  '</div>';

  // ─── Abas de filtro ───
  html += '<div class="gar-aba">' +
    '<button class="btn btn-sm' + (App._garFiltro === 'todos' ? ' btn-primary' : '') + '" onclick="App._garFiltrar(\'todos\')">Ativos</button>' +
    '<button class="btn btn-sm' + (App._garFiltro === 'critico' ? ' btn-primary' : '') + '" onclick="App._garFiltrar(\'critico\')">Cr\u00edticos</button>' +
    '<button class="btn btn-sm' + (App._garFiltro === 'alto' ? ' btn-primary' : '') + '" onclick="App._garFiltrar(\'alto\')">Altos</button>' +
    '<button class="btn btn-sm' + (App._garFiltro === 'medio' ? ' btn-primary' : '') + '" onclick="App._garFiltrar(\'medio\')">M\u00e9dios</button>' +
    '<button class="btn btn-sm' + (App._garFiltro === 'resolvidos' ? ' btn-primary' : '') + '" onclick="App._garFiltrar(\'resolvidos\')">Resolvidos</button>' +
  '</div>';

  if (gargalos.length === 0) {
    html += C.emptyState('Nenhum gargalo encontrado com o filtro atual.');
  } else {
    html += '<div class="gar-lista">';
    gargalos.forEach(function(g) {
      var prioCls = g.prioridade === 'Cr\u00edtico' ? 'gar-prio-critico' : g.prioridade === 'Alto' ? 'gar-prio-alto' : g.prioridade === 'M\u00e9dio' ? 'gar-prio-medio' : 'gar-prio-baixo';
      var scoreCls = g.score >= 80 ? 'gar-score-critico' : g.score >= 60 ? 'gar-score-alto' : 'gar-score-medio';

      html += '<div class="gar-card-gargalo' + (g.resolvido ? ' gar-resolvido' : '') + '">' +
        '<div class="gar-card-top">' +
          '<span class="gar-prio ' + prioCls + '">' + g.prioridade + '</span>' +
          '<strong class="gar-titulo">' + App._esc(g.titulo) + '</strong>' +
          '<span class="gar-score ' + scoreCls + '">' + g.score + '</span>' +
        '</div>' +
        '<div class="gar-desc">' + App._esc(g.descricao) + '</div>' +
        '<div class="gar-detalhes">' +
          '<div class="gar-det"><span class="gar-det-label">Impacto:</span> ' + App._esc(g.impacto) + '</div>' +
          '<div class="gar-det"><span class="gar-det-label">Causa prov\u00e1vel:</span> ' + App._esc(g.causaProvavel) + '</div>' +
          '<div class="gar-det"><span class="gar-det-label">Recomenda\u00e7\u00e3o:</span> ' + App._esc(g.recomendacao) + '</div>' +
          '<div class="gar-det"><span class="gar-det-label">Respons\u00e1vel:</span> ' + App._esc(g.responsavelSugerido) + ' | <span class="gar-det-label">Prazo:</span> ' + g.prazoRecomendado + '</div>' +
        '</div>' +
        '<div class="gar-actions">' +
          (!g.resolvido ? '<button class="btn btn-sm btn-success" onclick="GargalosOperacionais.marcarResolvido(\'' + g.id + '\');App._renderGarAtual()">Resolver</button>' : '<span class="badge badge-completed">Resolvido</span>') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  // ─── Hist\u00f3rico de an\u00e1lises ───
  if (historico.length > 0) {
    html += '<div class="gar-section"><div class="gar-section-title">Hist\u00f3rico de an\u00e1lises</div>' +
      '<div class="gar-tabela-wrap"><table class="gar-tabela">' +
      '<thead><tr><th>Data</th><th>Gargalos detectados</th><th>Cr\u00edticos</th></tr></thead><tbody>';

    historico.slice(-14).reverse().forEach(function(h) {
      html += '<tr><td>' + h.data + '</td><td>' + h.quantidade + '</td><td>' + (h.criticos || 0) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  html += '</div>'; // .gar-wrap
  document.getElementById('moduleContent').innerHTML = html;
};

App._garFiltrar = function(filtro) {
  App._garFiltro = filtro;
  App._renderGarAtual();
};

// Auto-registrar refresh via EventBus
(function() {
  if (typeof EventBus === 'undefined') return;
  EventBus.on('gargalos_operacionais.updated', function() {
    if (typeof App !== 'undefined' && App.refreshGargalosOperacionais) App.refreshGargalosOperacionais();
  });
})();
