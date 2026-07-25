App._opRealFilter = 'todos';

App.refreshOperacaoReal = function() {
  if (this.currentModule === 'operacao_real') this.renderOperacaoReal();
};

App.renderOperacaoReal = function() {
  App._opRealFilter = 'todos';
  App._renderOpRealAtual();
};

App._renderOpRealAtual = function() {
  var metricas = OperacaoReal.getMetricas();
  var atritos = OperacaoReal.getAtritos({ tipo: App._opRealFilter === 'todos' ? null : App._opRealFilter });
  var melhorias = OperacaoReal.getMelhorias();

  var html = '<div class="opreal-wrap">';

  // ─── M\u00e9tricas principais ───
  html += '<div class="opreal-metrics">' +
    '<div class="opreal-card opreal-card-red"><span class="opreal-card-val">' + metricas.totalAtritos + '</span><span class="opreal-card-lbl">Atritos</span></div>' +
    '<div class="opreal-card opreal-card-orange"><span class="opreal-card-val">' + metricas.atritosNaoLidos + '</span><span class="opreal-card-lbl">N\u00e3o lidos</span></div>' +
    '<div class="opreal-card opreal-card-purple"><span class="opreal-card-val">' + metricas.totalMelhorias + '</span><span class="opreal-card-lbl">Melhorias</span></div>' +
    '<div class="opreal-card opreal-card-blue"><span class="opreal-card-val">' + metricas.sessoes + '</span><span class="opreal-card-lbl">M\u00f3dulos na sess\u00e3o</span></div>' +
    '<div class="opreal-card opreal-card-green"><span class="opreal-card-val">' + (metricas.tempoEconomizado > 0 ? Math.round(metricas.tempoEconomizado / 60000) + 'min' : '—') + '</span><span class="opreal-card-lbl">Tempo economizado</span></div>' +
  '</div>';

  // ─── Abas ───
  html += '<div class="opreal-aba">' +
    '<button class="btn btn-sm' + (App._opRealFilter === 'todos' ? ' btn-primary' : '') + '" onclick="App._opRealFiltrar(\'todos\')">Todos</button>' +
    '<button class="btn btn-sm' + (App._opRealFilter === 'atrito' ? ' btn-primary' : '') + '" onclick="App._opRealFiltrar(\'atrito\')">Atritos</button>' +
    '<button class="btn btn-sm' + (App._opRealFilter === 'erro' ? ' btn-primary' : '') + '" onclick="App._opRealFiltrar(\'erro\')">Erros</button>' +
  '</div>';

  // ─── Atritos recentes ───
  html += '<div class="opreal-section"><div class="opreal-section-title">Atritos e Erros (' + atritos.length + ')</div>';
  if (atritos.length === 0) {
    html += C.emptyState('Nenhum atrito registrado nesta sess\u00e3o.');
  } else {
    html += '<div class="opreal-lista">';
    atritos.slice(0, 30).forEach(function(a) {
      var gravCls = a.gravidade === 'Cr\u00edtico' ? 'opreal-grav-critico' : a.gravidade === 'Alto' ? 'opreal-grav-alto' : a.gravidade === 'M\u00e9dio' ? 'opreal-grav-medio' : 'opreal-grav-baixo';
      var tipoIcon = a.tipo === 'erro' ? '\u274C' : '\u26A0';
      var bg = a.lido ? '' : 'var(--accent-dim)';

      html += '<div class="opreal-item" style="background:' + bg + ';">' +
        '<div class="opreal-item-icon">' + tipoIcon + '</div>' +
        '<div class="opreal-item-body">' +
          '<div class="opreal-item-top">' +
            '<strong>' + App._esc(a.moduloLabel || a.modulo) + '</strong>' +
            '<span class="' + gravCls + '">' + a.gravidade + '</span>' +
            '<span class="opreal-time">' + (a.timestamp ? a.timestamp.slice(11, 19) : '') + '</span>' +
          '</div>' +
          '<div class="opreal-item-obs">' + App._esc(a.observacao || a.mensagem || '—') + '</div>' +
          (a.ultimosEventos && a.ultimosEventos.length > 0 ? '<div class="opreal-eventos">\u00daltimos eventos: ' + a.ultimosEventos.join(', ') + '</div>' : '') +
        '</div>' +
        '<div class="opreal-item-actions">' +
          (!a.classificado ? '<select onchange="OperacaoReal.classificarAtrito(\'' + a.id + '\', this.value);App._renderOpRealAtual()" style="font-size:0.6rem;padding:1px 3px;"><option value="">Classificar</option><option value="Cr\u00edtico">Cr\u00edtico</option><option value="Alto">Alto</option><option value="M\u00e9dio">M\u00e9dio</option><option value="Baixo">Baixo</option></select>' : '') +
          (!a.lido ? '<button class="btn btn-sm" style="font-size:0.6rem;padding:2px 6px;" onclick="OperacaoReal.marcarLido(\'' + a.id + '\');App._renderOpRealAtual()">OK</button>' : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // ─── Melhorias sugeridas ───
  html += '<div class="opreal-section"><div class="opreal-section-title">Melhorias sugeridas (baseadas em atritos recorrentes)</div>';
  if (melhorias.length === 0) {
    html += C.emptyState('Nenhuma melhoria sugerida ainda. Atritos recorrentes geram sugest\u00f5es automaticamente.');
  } else {
    html += '<div class="opreal-lista">';
    melhorias.forEach(function(m) {
      var prioCls = m.prioridade === 'Cr\u00edtico' ? 'opreal-grav-critico' : m.prioridade === 'Alto' ? 'opreal-grav-alto' : m.prioridade === 'M\u00e9dio' ? 'opreal-grav-medio' : 'opreal-grav-baixo';
      html += '<div class="opreal-item">' +
        '<div class="opreal-item-body">' +
          '<div class="opreal-item-top">' +
            '<strong>' + App._esc(m.titulo) + '</strong>' +
            '<span class="' + prioCls + '">' + m.prioridade + '</span>' +
            '<span class="opreal-score">Score: ' + m.score + '</span>' +
          '</div>' +
          '<div class="opreal-item-obs">' + App._esc(m.descricao) + '</div>' +
          '<div class="opreal-item-meta">M\u00f3dulo: ' + App._esc(m.modulo || '—') + '</div>' +
        '</div>' +
        '<div class="opreal-item-actions">' +
          (!m.resolvido ? '<button class="btn btn-sm btn-success" style="font-size:0.6rem;padding:2px 6px;" onclick="OperacaoReal.marcarMelhoriaResolvida(\'' + m.pendenciaId + '\');App._renderOpRealAtual()">Resolver</button>' : '<span class="badge badge-completed" style="font-size:0.55rem;">Resolvido</span>') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // ─── M\u00f3dulos mais utilizados ───
  if (metricas.modulosRanking.length > 0) {
    html += '<div class="opreal-section"><div class="opreal-section-title">M\u00f3dulos mais utilizados</div>' +
      '<div class="opreal-tabela-wrap"><table class="opreal-tabela">' +
      '<thead><tr><th>M\u00f3dulo</th><th>Visitas</th><th>Tempo total</th><th>Tempo m\u00e9dio</th></tr></thead><tbody>';

    metricas.modulosRanking.forEach(function(m) {
      html += '<tr><td>' + App._esc(m.label) + '</td><td>' + m.visitas + '</td><td>' + Math.round(m.tempoTotal / 1000) + 's</td><td>' + Math.round(m.tempoMedio / 1000) + 's</td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  // ─── Fluxos mais lentos ───
  if (metricas.fluxos.length > 0) {
    html += '<div class="opreal-section"><div class="opreal-section-title">Fluxos operacionais</div>' +
      '<div class="opreal-tabela-wrap"><table class="opreal-tabela">' +
      '<thead><tr><th>Fluxo</th><th>Ocorr\u00eancias</th><th>Tempo m\u00e9dio</th><th>M\u00ednimo</th><th>M\u00e1ximo</th></tr></thead><tbody>';

    var fluxoLabels = { mensagem_resposta: 'Msg recebida → respondida', agendamento_confirmacao: 'Inten\u00e7\u00e3o → confirma\u00e7\u00e3o', atendimento_pagamento: 'Atendimento → pagamento', conclusao_pos: 'Conclus\u00e3o → p\u00f3s-atendimento' };
    metricas.fluxos.forEach(function(f) {
      html += '<tr><td>' + App._esc(fluxoLabels[f.tipo] || f.tipo) + '</td><td>' + f.count + '</td><td>' + Math.round(f.media / 1000) + 's</td><td>' + Math.round(f.min / 1000) + 's</td><td>' + Math.round(f.max / 1000) + 's</td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  html += '</div>'; // .opreal-wrap

  document.getElementById('moduleContent').innerHTML = html;
};

App._opRealFiltrar = function(tipo) {
  App._opRealFilter = tipo;
  App._renderOpRealAtual();
};

// Bot\u00e3o Reportar Atrito (inserido no header)
App._initReportarAtrito = function() {
  var header = document.querySelector('.content-header');
  if (!header) return;
  var btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-danger';
  btn.id = 'reportarAtritoBtn';
  btn.innerHTML = '\u26A0 Reportar Atrito';
  btn.title = 'Registrar um atrito ou problema no fluxo atual';
  btn.onclick = function() {
    var modulo = App.currentModule || '';
    var moduloLabel = MODULE_TITLES[modulo] || modulo;
    var html = '<p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:12px;">' +
      'Registre um atrito ou problema identificado durante o uso do sistema.</p>' +
      '<div class="form-group"><label>M\u00f3dulo atual</label><input type="text" value="' + App._esc(moduloLabel) + '" readonly style="opacity:0.6;"></div>' +
      '<div class="form-group"><label>Descreva o problema ou atrito *</label><textarea id="atritoObs" rows="3" placeholder="Ex: Dif\u00edcil encontrar o bot\u00e3o de confirmar hor\u00e1rio, Lentid\u00e3o ao abrir a agenda, Fluxo confuso..." style="width:100%;"></textarea></div>' +
      '<div class="overlay-actions">' +
        '<button class="btn" onclick="App._closeOverlay()">Cancelar</button>' +
        '<button class="btn btn-primary" onclick="App._reportarAtritoSubmit()">Registrar</button>' +
      '</div>';
    App._showOverlay('Reportar Atrito', html);
  };
  header.appendChild(btn);
};

App._reportarAtritoSubmit = function() {
  var obs = document.getElementById('atritoObs').value.trim();
  if (!obs) { App._toast('Descreva o atrito ou problema.', 'warning'); return; }
  OperacaoReal.reportarAtrito(obs);
  App._closeOverlay();
  App._toast('Atrito registrado. Obrigado por ajudar a melhorar o sistema!', 'success');
};

// Inicializar bot\u00e3o ap\u00f3s carregamento
(function() {
  if (typeof App !== 'undefined') {
    var _origBoot = App._boot;
    if (_origBoot) {
      App._boot = function() {
        var result = _origBoot.apply(this, arguments);
        setTimeout(function() { App._initReportarAtrito(); }, 500);
        return result;
      };
    }
  }
})();
