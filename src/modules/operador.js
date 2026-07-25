App._opFoco = false;

App.renderOperador = function() {
  this._renderOp();
};

App._renderOp = function() {
  var metricas = Operador.getMetricas();
  var fila = Operador.getQueue();
  var emOperacao = Operador._ativo;
  var emFoco = Operador._foco;

  // Modo Foco
  if (emFoco) {
    this._renderOpFoco();
    return;
  }

  var html = '<div class="hj-wrap">';

  // Header
  html += '<div class="hj-topbar"><div class="hj-topbar-left"><span class="hj-saudacao">Centro de Opera\u00e7\u00f5es</span><span class="hj-data">' + new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + '</span></div>' +
    '<div class="hj-topbar-right">' +
      (!emOperacao
        ? '<button class="btn btn-primary" onclick="Operador.iniciar();App._renderOp();">Iniciar Opera\u00e7\u00e3o</button>'
        : '<button class="btn btn-success" onclick="Operador._foco=true;App._renderOp();">Modo Foco</button>' +
          '<button class="btn btn-sm" onclick="Operador.ciclo();App._renderOp();">Recalcular</button>' +
          '<button class="btn btn-sm" onclick="Operador.parar();App._renderOp();">Parar</button>') +
    '</div></div>';

  if (!emOperacao) {
    html += '<div class="hj-resumo" style="border-left:3px solid var(--gold);"><div style="text-align:center;padding:8px 0;"><strong>Operador inativo</strong><br><span style="font-size:0.78rem;color:var(--text-muted);">Clique em "Iniciar Opera\u00e7\u00e3o" para ativar o ciclo cont\u00ednuo de prioriza\u00e7\u00e3o.</span></div></div>';
    document.getElementById('moduleContent').innerHTML = html;
    return;
  }

  // Métricas
  html += L.metrics([
    { value: metricas.total, label: 'Tarefas', cls: '' },
    { value: metricas.criticos, label: 'Cr\u00edticos', cls: 'rp-card-red' },
    { value: metricas.urgentes, label: 'Urgentes', cls: 'rp-card-yellow' }
  ]);

  // Situação geral
  var prox = Operador.getProximaTarefa();
  if (prox) {
    var pClass = prox.score >= 80 ? 'rp-card-red' : prox.score >= 60 ? 'rp-card-yellow' : '';
    html += '<div class="rp-card ' + pClass + '" style="margin-bottom:16px;border-left:3px solid ' + (prox.score >= 80 ? 'var(--accent)' : prox.score >= 60 ? 'var(--yellow)' : 'var(--gold)') + ';display:flex;align-items:center;gap:12px;">' +
      '<div style="flex:1;"><strong>Pr\u00f3xima melhor a\u00e7\u00e3o</strong><br><span style="font-size:0.78rem;color:var(--text-muted);">' + App._esc(prox.categoria) + ' — ' + App._esc(prox.cliente || prox.acao) + '</span></div>' +
      '<div style="display:flex;gap:6px;">' +
        '<button class="btn btn-primary btn-sm" onclick="var t=Operador.getProximaTarefa();if(t&&t.tipo){Executor.executar(t.tipo,t.payload);Operador._queue.splice(Operador._indiceFoco,1);App._renderOp();}">Resolver</button>' +
        '<button class="btn btn-sm" onclick="EventBus.emit(\'copiloto.updated\')">\u21BB</button>' +
      '</div></div>';
  }

  // Top 10 tarefas
  html += '<div class="hj-bloco">' + C.sectionHeader('Top 10 Tarefas', '<span class="hj-contador">' + fila.length + '</span>');
  if (fila.length === 0) {
    html += L.empty('Nenhuma tarefa', 'Tudo resolvido!', 'bell');
  } else {
    html += '<div class="hj-card-list">';
    fila.slice(0, 10).forEach(function(item) {
      var cls = item.score >= 80 ? 'hj-card-urg' : item.score >= 60 ? 'hj-card-warn' : '';
      html += '<div class="hj-card ' + cls + '"><div class="hj-card-main"><div class="hj-card-body"><div class="hj-card-title">' +
        App._esc(item.categoria) + (item.cliente ? ' — ' + App._esc(item.cliente) : '') + ' <span style="font-size:0.55rem;color:var(--text-dim);">Score ' + item.score + '</span></div>' +
        '<div class="hj-card-desc">' + App._esc(item.acao || item.impacto) + '</div>' +
        (item.motivos && item.motivos.length > 0 ? '<div style="margin-top:2px;display:flex;flex-wrap:wrap;gap:3px;">' + item.motivos.map(function(m) { return '<span class="badge badge-scheduled" style="font-size:0.5rem;">' + App._esc(m) + '</span>'; }).join('') + '</div>' : '') +
        '</div><div class="hj-card-actions"><button class="btn btn-primary btn-sm" onclick="Executor.executar(\'' + item.tipo + '\',' + JSON.stringify(item.payload || {}).replace(/'/g, "\\'") + ');Operador._queue.splice(' + fila.indexOf(item) + ',1);App._renderOp();">' + App._esc(item.acao || 'Abrir') + '</button></div></div></div>';
    });
    html += '</div>';
  }
  html += '</div>';

  document.getElementById('moduleContent').innerHTML = html;
};

App._renderOpFoco = function() {
  var tarefa = Operador.getProximaTarefa();

  if (!tarefa) {
    document.getElementById('moduleContent').innerHTML =
      '<div class="hj-wrap" style="text-align:center;padding:80px 20px;">' +
        '<div style="font-size:3rem;margin-bottom:16px;">\u2705</div>' +
        '<div style="font-size:1.1rem;font-weight:500;margin-bottom:8px;">Todas as tarefas conclu\u00eddas!</div>' +
        '<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:20px;">O Modo Foco n\u00e3o encontrou mais tarefas pendentes.</div>' +
        '<button class="btn btn-primary" onclick="Operador._foco=false;Operador.parar();App._renderOp();">Encerrar Opera\u00e7\u00e3o</button>' +
      '</div>';
    return;
  }

  var pClass = tarefa.score >= 80 ? 'rp-card-red' : tarefa.score >= 60 ? 'rp-card-yellow' : '';
  document.getElementById('moduleContent').innerHTML =
    '<div class="hj-wrap" style="max-width:480px;margin:40px auto;">' +
      '<div style="text-align:center;margin-bottom:20px;">' +
        '<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">Modo Foco</div>' +
        '<div style="font-size:0.72rem;color:var(--text-dim);">Tarefa ' + (Operador._indiceFoco + 1) + ' de ' + Operador._queue.length + '</div>' +
      '</div>' +
      '<div class="rp-card ' + pClass + '" style="text-align:center;padding:24px;">' +
        '<div style="font-size:1.1rem;font-weight:500;margin-bottom:8px;">' + App._esc(tarefa.categoria) + '</div>' +
        (tarefa.cliente ? '<div style="font-size:0.95rem;margin-bottom:8px;">' + App._esc(tarefa.cliente) + '</div>' : '') +
        '<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px;">' + App._esc(tarefa.acao) + '</div>' +
        '<div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:16px;"><strong>Impacto esperado:</strong> ' + App._esc(tarefa.impacto || tarefa.acao) + '</div>' +
        (tarefa.motivos && tarefa.motivos.length > 0 ? '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-bottom:16px;">' + tarefa.motivos.map(function(m) { return '<span class="badge badge-scheduled">' + App._esc(m) + '</span>'; }).join('') + '</div>' : '') +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
          '<button class="btn btn-primary" onclick="var t=Operador.getProximaTarefa();if(t&&t.tipo){Executor.executar(t.tipo,t.payload);Operador._queue.splice(Operador._indiceFoco,1);App._renderOpFoco();}">Resolver</button>' +
          '<button class="btn btn-sm" onclick="Operador.pularTarefa();App._renderOpFoco();">Pular</button>' +
          '<button class="btn btn-sm" onclick="Operador.adiarTarefa();App._renderOpFoco();">Adiar</button>' +
          '<button class="btn btn-sm" onclick="Operador._foco=false;App._renderOp();">Sair</button>' +
        '</div>' +
      '</div>' +
    '</div>';
};
