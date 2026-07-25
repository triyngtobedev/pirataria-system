App.openNotifPanel = function() {
  var dados = Notificacao.collectRecent();
  var html = '';

  // Header
  html += '<div class="notif-panel-header"><span class="panel-section-title">Notifica\u00e7\u00f5es</span>' +
    '<div class="flex gap-8">' +
      '<button class="btn btn-sm" onclick="Notificacao.markAllAsRead();App.openNotifPanel();">Ler todas</button>' +
      '<button class="btn btn-sm" onclick="Notificacao.archiveAllRead();App.openNotifPanel();">Arquivar</button>' +
      '<button class="btn btn-sm" onclick="App.closeNotifPanel()">Fechar</button>' +
    '</div></div>';

  var grupos = [
    { label: 'Hoje', items: dados.hoje },
    { label: 'Ontem', items: dados.ontem },
    { label: 'Anteriores', items: dados.anteriores }
  ];

  for (var g = 0; g < grupos.length; g++) {
    var grupo = grupos[g];
    if (grupo.items.length === 0) continue;
    html += '<div class="notif-grupo"><div class="notif-grupo-label">' + grupo.label + ' (' + grupo.items.length + ')</div>';
    // Agrupamento por clientName
    var agrupados = {};
    grupo.items.forEach(function(n) {
      var chave = n.clientId || n.titulo;
      if (!agrupados[chave]) agrupados[chave] = { cliente: n.clientId, titulo: n.titulo, notificacoes: [] };
      agrupados[chave].notificacoes.push(n);
    });
    Object.keys(agrupados).forEach(function(chave) {
      var grp = agrupados[chave];
      if (grp.notificacoes.length > 1) {
        html += '<div class="notif-grupo-cliente"><div class="notif-grupo-cliente-titulo">' + App._esc(grp.titulo) + ' — ' + grp.notificacoes.length + ' atualiza\u00e7\u00f5es</div>';
        grp.notificacoes.forEach(function(n) { html += App._renderNotifItem(n); });
        html += '</div>';
      } else {
        html += App._renderNotifItem(grp.notificacoes[0]);
      }
    });
    html += '</div>';
  }

  if (dados.hoje.length === 0 && dados.ontem.length === 0 && dados.anteriores.length === 0) {
    html += '<div class="empty-state" style="padding:40px 20px;">Nenhuma notifica\u00e7\u00e3o.</div>';
  }

  document.getElementById('panelTitle').textContent = 'Notifica\u00e7\u00f5es';
  document.getElementById('panelBody').innerHTML = html;
  document.getElementById('panelOverlay').classList.add('show');
};

App.closeNotifPanel = function() {
  document.getElementById('panelOverlay').classList.remove('show');
  Notificacao._updateBadge();
};

App._renderNotifItem = function(n) {
  var prioMap = { critica: 'notif-critica', alta: 'notif-alta', media: 'notif-media', baixa: 'notif-baixa' };
  var prioCls = prioMap[n.prioridade] || 'notif-media';
  var naoLida = n.status === 'nao_lida' ? 'notif-item-naolida' : '';
  var tempoRel = App._tempoRelativoNotif(n.createdAt);

  var acoes = '';
  if (n.actionLabel && n.actionTarget) {
    var actionOnclick = n.actionTarget === 'navigate' ? "App.navigate('" + n.actionParams + "');App.closeNotifPanel();" : n.actionTarget === 'cliente' ? "App.openClientPanel('" + n.actionParams + "');App.closeNotifPanel();" : '';
    if (actionOnclick) acoes = '<button class="btn btn-sm" onclick="' + actionOnclick + '">' + App._esc(n.actionLabel) + '</button>';
  }

  return '<div class="notif-item ' + prioCls + ' ' + naoLida + '" onclick="Notificacao.markAsRead(\'' + n.id + '\');App._renderNotifItemRead(\'' + n.id + '\')">' +
    '<div class="notif-item-body">' +
      '<span class="notif-item-titulo">' + App._esc(n.titulo) + '</span>' +
      (n.descricao ? '<span class="notif-item-desc">' + App._esc(n.descricao) + '</span>' : '') +
      '<span class="notif-item-time">' + tempoRel + '</span>' +
    '</div>' +
    '<div class="notif-item-actions">' +
      acoes +
      '<button class="btn btn-sm" onclick="event.stopPropagation();Notificacao.archive(\'' + n.id + '\');App.openNotifPanel();" title="Arquivar">&#10005;</button>' +
    '</div>' +
  '</div>';
};

App._renderNotifItemRead = function(id) {
  var el = document.querySelector('.notif-item-naolida');
  if (el) el.classList.remove('notif-item-naolida');
  Notificacao._updateBadge();
};

App._tempoRelativoNotif = function(createdAt) {
  if (!createdAt) return '';
  var diff = Date.now() - new Date(createdAt).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return 'h\u00e1 ' + mins + ' min';
  var horas = Math.floor(mins / 60);
  if (horas < 24) return 'h\u00e1 ' + horas + 'h';
  var dias = Math.floor(horas / 24);
  return 'h\u00e1 ' + dias + ' dias';
};
