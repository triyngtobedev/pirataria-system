App._hojeFilter = 'tudo';
App._hojeData = null;
App._expandedCards = {};

App.refreshHoje = function() {
  if (this.currentModule === 'hoje') this.renderHoje();
};

App.renderHoje = function() {
  this._hojeData = Hoje.collect();
  this._hojeFilter = 'tudo';
  this._expandedCards = {};
  this._renderHojeAtual();
};

App._renderHojeAtual = function() {
  var dados = this._hojeData;
  var filtrados = this._aplicarFiltro(dados);

  document.getElementById('moduleContent').innerHTML =
    '<div class="hj-wrap">' +
      this._renderTopbar(dados) +
      this._renderResumo(dados) +
      this._renderComunicacaoResumo() +
      this._renderFiltros() +
      this._renderBlocoAcao('A\u00e7\u00f5es Priorit\u00e1rias', filtrados.blocoAcoes, 'bell', 'atendimento') +
      this._renderBlocoAgenda(filtrados.blocoAgenda) +
      this._renderBlocoAcao('Retornos e Acompanhamentos', filtrados.blocoRetornos, 'clock', 'lembretes') +
      this._renderBlocoAcao('Clientes em Negocia\u00e7\u00e3o', filtrados.blocoNegociacoes, 'person', 'clientes') +
      this._renderBlocoAcao('Pend\u00eancias de Ontem', filtrados.blocoPendencias, 'document', 'atendimento') +
      this._renderBlocoMarketing(filtrados.blocoMarketing) +
    '</div>';
};

// ─── Topbar ───

App._renderTopbar = function(dados) {
  var h = new Date().getHours();
  var saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  var dataStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  var caixaIcon = dados.metadados.caixaAberto ? '\u25CF' : '\u25CB';
  var caixaLabel = dados.metadados.caixaAberto ? 'Caixa aberto' : 'Caixa fechado';
  var caixaCls = dados.metadados.caixaAberto ? 'hj-badge-open' : 'hj-badge-closed';

  var opResumo = Oportunidade.getResumo();

  return '<div class="hj-topbar">' +
    '<div class="hj-topbar-left">' +
      '<span class="hj-saudacao">' + saudacao + '</span>' +
      '<span class="hj-data">' + dataStr + '</span>' +
    '</div>' +
    '<div class="hj-topbar-right">' +
      '<span class="hj-stat"><strong>' + dados.metadados.totalAcoes + '</strong> pend\u00eancias</span>' +
      '<span class="hj-stat"><strong>' + dados.metadados.totalAgenda + '</strong> agendamentos</span>' +
      '<span class="hj-stat ' + caixaCls + '">' + caixaIcon + ' ' + caixaLabel + '</span>' +
      '<span class="hj-stat" style="color:var(--gold);cursor:pointer;" onclick="App.navigate(\'oportunidades\')"><strong>' + opResumo.total + '</strong> oportunidade' + (opResumo.total !== 1 ? 's' : '') + '</span>' +
      '<span class="hj-stat" style="color:var(--accent-hover);cursor:pointer;" onclick="App.navigate(\'filas\')"><strong>' + Fila.getResumo().total + '</strong> na fila</span>' +
      '<span class="hj-stat" style="color:var(--green);cursor:pointer;" onclick="App.navigate(\'inbox\')"><strong>' + DB.getConversas().filter(function(c){return c.status!=='encerrada' && c.status==='aguardando_estudio';}).length + '</strong> p/ responder</span>' +
    '</div>' +
    this._renderNotifResumo() +
  '</div>';
};

// ─── Resumo do dia ───

App._renderResumo = function(dados) {
  var total = 0;
  var concluidos = 0;
  var pendentes = 0;

  dados.blocoAgenda.forEach(function(a) {
    total++;
    if (a.status === 'completed' || a.status === 'done') concluidos++;
    else if (a.status !== 'cancelled') pendentes++;
  });

  var proximo = null;
  for (var i = 0; i < dados.blocoAgenda.length; i++) {
    var a = dados.blocoAgenda[i];
    if (a.status === 'pending' || a.status === 'confirmed') {
      proximo = a;
      break;
    }
  }

  var html = '<div class="hj-resumo">';
  html += '<div class="hj-resumo-item"><span class="hj-resumo-val">' + (dados.blocoAgenda.length + dados.blocoAcoes.length) + '</span><span class="hj-resumo-lbl">atendimentos</span></div>';
  html += '<div class="hj-resumo-item"><span class="hj-resumo-val hj-resumo-green">' + concluidos + '</span><span class="hj-resumo-lbl">conclu\u00eddos</span></div>';
  html += '<div class="hj-resumo-item"><span class="hj-resumo-val hj-resumo-red">' + dados.metadados.totalAcoes + '</span><span class="hj-resumo-lbl">pend\u00eancias</span></div>';
  html += '<div class="hj-resumo-item"><span class="hj-resumo-val">' + (dados.metadados.caixaAberto ? '\u25CF' : '\u25CB') + '</span><span class="hj-resumo-lbl">' + (dados.metadados.caixaAberto ? 'Caixa aberto' : 'Caixa fechado') + '</span></div>';
  if (proximo) {
    html += '<div class="hj-resumo-item hj-resumo-prox"><span class="hj-resumo-val">' + (proximo.time || '') + '</span><span class="hj-resumo-lbl">' + this._esc(proximo.clientName) + '</span></div>';
  }
  html += '</div>';
  return html;
};

// ─── Filtros ───

App._renderFiltros = function() {
  var filtros = [
    { key: 'tudo', label: 'Tudo' },
    { key: 'prioridades', label: 'Prioridades' },
    { key: 'agenda', label: 'Agenda' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'financeiro', label: 'Financeiro' }
  ];

  var html = '<div class="hj-filtros">';
  for (var i = 0; i < filtros.length; i++) {
    var f = filtros[i];
    var ativo = f.key === this._hojeFilter ? ' hj-chip-active' : '';
    html += '<span class="hj-chip' + ativo + '" onclick="App._setHojeFilter(\'' + f.key + '\')">' + f.label + '</span>';
  }
  html += '</div>';
  return html;
};

App._setHojeFilter = function(filtro) {
  this._hojeFilter = filtro;
  this._renderHojeAtual();
};

App._aplicarFiltro = function(dados) {
  var f = this._hojeFilter;
  if (f === 'tudo') return dados;

  var vazio = { blocoAcoes: [], blocoAgenda: [], blocoRetornos: [], blocoNegociacoes: [], blocoPendencias: [], blocoMarketing: dados.blocoMarketing };

  if (f === 'prioridades') {
    return { blocoAcoes: dados.blocoAcoes, blocoAgenda: [], blocoRetornos: [], blocoNegociacoes: [], blocoPendencias: [], blocoMarketing: dados.blocoMarketing };
  }
  if (f === 'agenda') {
    return { blocoAcoes: [], blocoAgenda: dados.blocoAgenda, blocoRetornos: [], blocoNegociacoes: [], blocoPendencias: [], blocoMarketing: dados.blocoMarketing };
  }
  if (f === 'clientes') {
    return { blocoAcoes: [], blocoAgenda: [], blocoRetornos: dados.blocoRetornos, blocoNegociacoes: dados.blocoNegociacoes, blocoPendencias: [], blocoMarketing: dados.blocoMarketing };
  }
  if (f === 'financeiro') {
    return { blocoAcoes: dados.blocoAcoes, blocoAgenda: [], blocoRetornos: [], blocoNegociacoes: [], blocoPendencias: dados.blocoPendencias, blocoMarketing: dados.blocoMarketing };
  }
  return dados;
};

// ─── Card expand ───

App._toggleCardExpand = function(cardId) {
  if (this._expandedCards[cardId]) {
    delete this._expandedCards[cardId];
  } else {
    this._expandedCards[cardId] = true;
  }
  this._renderHojeAtual();
};

// ─── Helpers ───

App._iniciais = function(nome) {
  if (!nome) return '?';
  var parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

App._tempoRelativo = function(dataStr) {
  if (!dataStr) return '';
  var diff = Date.now() - new Date(dataStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return 'h\u00e1 ' + mins + ' min';
  var horas = Math.floor(mins / 60);
  if (horas < 24) return 'h\u00e1 ' + horas + 'h';
  var dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return 'h\u00e1 ' + dias + ' dias';
  return dataStr.slice(0, 10);
};

App._tempoAte = function(timeStr) {
  if (!timeStr) return '';
  var now = new Date();
  var parts = timeStr.split(':').map(Number);
  var target = new Date(now);
  target.setHours(parts[0], parts[1], 0, 0);
  var diff = target.getTime() - now.getTime();
  var mins = Math.round(diff / 60000);
  if (mins < -60) return '';
  if (mins < 0) return '(atrasado)';
  if (mins === 0) return 'agora';
  if (mins < 60) return 'em ' + mins + ' min';
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  return 'em ' + h + 'h' + (m > 0 ? m + 'min' : '');
};

// ─── Bloco genérico ───

App._renderBlocoAcao = function(titulo, cards, iconeVazio, modulo) {
  var total = cards.length;

  if (total === 0) {
    var estados = {
      'A\u00e7\u00f5es Priorit\u00e1rias': { icon: 'bell', title: 'Nenhuma a\u00e7\u00e3o priorit\u00e1ria', desc: 'Todos os atendimentos est\u00e3o em dia.' },
      'Retornos e Acompanhamentos': { icon: 'clock', title: 'Nada pendente', desc: 'Nenhum lembrete ou retorno para hoje.' },
      'Clientes em Negocia\u00e7\u00e3o': { icon: 'person', title: 'Nenhum cliente em negocia\u00e7\u00e3o', desc: 'Clientes com interesse aparecer\u00e3o aqui.' },
      'Pend\u00eancias de Ontem': { icon: 'document', title: 'Nenhuma pend\u00eancia', desc: 'Ontem foi conclu\u00eddo sem pend\u00eancias.' }
    };
    var es = estados[titulo] || { icon: 'bell', title: 'Nenhum item', desc: '' };
    return '<div class="hj-bloco">' + C.sectionHeader(titulo) + C.emptyStateFull(es) + '</div>';
  }

  var limite = 5;
  var visiveis = cards.slice(0, limite);
  var excesso = total - limite;

  var html = '<div class="hj-bloco">' + C.sectionHeader(titulo, '<span class="hj-contador">' + total + '</span>') + '<div class="hj-card-list">';
  for (var i = 0; i < visiveis.length; i++) {
    html += this._renderCardAcao(visiveis[i]);
  }
  html += '</div>';
  if (excesso > 0) {
    html += '<div class="hj-mais" onclick="App.navigate(\'' + modulo + '\')">Ver todos (+' + excesso + ')</div>';
  }
  html += '</div>';
  return html;
};

// ─── Card de ação ───

App._renderCardAcao = function(c) {
  var cardId = c.id || 'card_' + Math.random().toString(36).slice(2, 6);
  var expandida = this._expandedCards[cardId] || false;

  var urgCls = c.prioridade <= 1 ? ' hj-card-urg' : c.prioridade <= 3 ? ' hj-card-warn' : '';
  var iniciais = this._iniciais(c.clientName);

  var timeHtml = '';
  if (c.timestamp) {
    var rel = this._tempoRelativo(new Date(c.timestamp).toISOString());
    if (rel) timeHtml = '<span class="hj-card-time">' + rel + '</span>';
  }

  var badgeHtml = '';
  if (c.badge) {
    var badgeCls = c.badgeType === 'danger' ? 'badge-cancelled' : c.badgeType === 'warning' ? 'badge-scheduled' : c.badgeType === 'info' ? 'badge-progress' : 'badge-completed';
    badgeHtml = ' <span class="badge ' + badgeCls + '">' + this._esc(c.badge) + '</span>';
  }

  var metaHtml = '';
  if (expandida) {
    metaHtml = '<div class="hj-card-meta">' +
      (c.clientName ? '<span><strong>Cliente:</strong> ' + this._esc(c.clientName) + '</span>' : '') +
      '<span><strong>Origem:</strong> ' + (c.modulo || '—') + '</span>' +
      (c.desc ? '<span class="hj-card-meta-desc">' + this._esc(c.desc) + '</span>' : '') +
    '</div>';
  }

  var secBtnHtml = '';
  var secLabel = '';
  var secAction = '';
  if (c.modulo === 'atendimento' || c.modulo === 'agenda') { secLabel = 'Abrir'; secAction = "App.navigate('" + c.modulo + "')"; }
  else if (c.modulo === 'clientes') { secLabel = 'Ver cliente'; secAction = "App.navigate('clientes')"; }
  else if (c.modulo === 'os') { secLabel = 'Abrir OS'; secAction = "App.navigate('os')"; }
  else if (c.modulo === 'financeiro') { secLabel = 'Financeiro'; secAction = "App.navigate('financeiro')"; }
  else if (c.modulo === 'lembretes') { secLabel = 'Ver'; secAction = "App.navigate('lembretes')"; }
  else if (c.modulo === 'termos') { secLabel = 'Ver termo'; secAction = "App.navigate('termos')"; }
  if (secLabel) {
    secBtnHtml = '<button class="btn btn-sm hj-card-btn-sec" onclick="' + secAction + '">' + secLabel + '</button>';
  }

  var expandIcon = expandida ? '\u25B2' : '\u25BC';

  return '<div class="hj-card' + urgCls + '">' +
    '<div class="hj-card-main">' +
      '<div class="hj-card-avatar">' + iniciais + '</div>' +
      '<div class="hj-card-body">' +
        '<div class="hj-card-title">' + this._esc(c.title) + badgeHtml + timeHtml + '</div>' +
        '<div class="hj-card-desc">' + this._esc(c.desc) + '</div>' +
      '</div>' +
      '<div class="hj-card-actions">' +
        '<button class="btn btn-primary btn-sm hj-card-btn" onclick="' + c.btnAction + '">' + this._esc(c.btnLabel) + '</button>' +
        secBtnHtml +
        '<button class="hj-card-expand" onclick="App._toggleCardExpand(\'' + cardId + '\')" title="Detalhes">' + expandIcon + '</button>' +
      '</div>' +
    '</div>' +
    metaHtml +
  '</div>';
};

// ─── Bloco Agenda ───

App._renderBlocoAgenda = function(items) {
  var total = items.length;

  if (total === 0) {
    return '<div class="hj-bloco">' + C.sectionHeader('Agenda de Hoje') + C.emptyStateFull({icon:'calendar', title:'Nenhum agendamento hoje', desc:'Os agendamentos do dia aparecer\u00e3o aqui.'}) + '</div>';
  }

  var limite = 5;
  var visiveis = items.slice(0, limite);
  var excesso = total - limite;

  var html = '<div class="hj-bloco">' + C.sectionHeader('Agenda de Hoje', '<button class="btn btn-sm" onclick="App.navigate(\'agenda\')">Ver agenda</button><span class="hj-contador" style="margin-left:8px;">' + total + '</span>') + '<div class="hj-card-list">';
  for (var i = 0; i < visiveis.length; i++) {
    html += this._renderCardAgenda(visiveis[i]);
  }
  html += '</div>';
  if (excesso > 0) {
    html += '<div class="hj-mais" onclick="App.navigate(\'agenda\')">Ver todos (+' + excesso + ')</div>';
  }
  html += '</div>';
  return html;
};

App._renderCardAgenda = function(item) {
  var cardId = 'ag_' + item.id;
  var expandida = this._expandedCards[cardId] || false;
  var iniciais = this._iniciais(item.clientName);

  var isDone = item.status === 'completed' || item.status === 'done';
  var isProgress = item.status === 'in_progress';
  var statusCls = isDone ? 'hj-ag-done' : isProgress ? 'hj-ag-progress' : '';

  var tempoHtml = '';
  if (item.time) {
    var rel = this._tempoAte(item.time);
    if (rel) tempoHtml = '<span class="hj-card-time">' + rel + '</span>';
  }

  var profDisplay = item.professional ? ' \u2014 ' + Repos.studio.professionals.label(item.professional) : '';

  var metaHtml = '';
  if (expandida) {
    metaHtml = '<div class="hj-card-meta">' +
      (item.notes ? '<span><strong>Obs:</strong> ' + this._esc(item.notes) + '</span>' : '') +
      (item.clientName ? '<span><strong>Cliente:</strong> ' + this._esc(item.clientName) + '</span>' : '') +
      '<span><strong>Status:</strong> ' + item.status + '</span>' +
    '</div>';
  }

  var actionHtml = '';
  if (!isDone) {
    if (!isProgress) {
      actionHtml += '<button class="btn btn-sm hj-card-btn" onclick="App.queueStart(\'' + item.id + '\',\'agenda\')" style="color:var(--green);border-color:var(--green-dim);">Iniciar</button>';
    } else {
      actionHtml += '<button class="btn btn-sm hj-card-btn" onclick="App.queueFinish(\'' + item.id + '\',\'agenda\')" style="color:var(--accent-hover);border-color:var(--accent-dim);">Concluir</button>';
    }
  }

  var expandIcon = expandida ? '\u25B2' : '\u25BC';

  return '<div class="hj-card hj-card-ag ' + statusCls + '">' +
    '<div class="hj-card-main">' +
      '<div class="hj-card-avatar">' + iniciais + '</div>' +
      '<div class="hj-card-body">' +
        '<div class="hj-card-title">' + this._esc(item.clientName) + tempoHtml + '</div>' +
        '<div class="hj-card-desc">' + this._esc(item.service) + profDisplay + ' \u2022 ' + item.time + '</div>' +
      '</div>' +
      '<div class="hj-card-actions">' +
        actionHtml +
        '<button class="hj-card-expand" onclick="App._toggleCardExpand(\'' + cardId + '\')" title="Detalhes">' + expandIcon + '</button>' +
      '</div>' +
    '</div>' +
    metaHtml +
  '</div>';
};

// ─── Bloco Marketing ───

App._renderNotifResumo = function() {
  var resumo = Notificacao.collectHojeResumo();
  if (resumo.naoLidas === 0) return '';
  var cls = resumo.criticas > 0 ? 'hj-notif-critico' : '';
  return '<div class="hj-notif-resumo ' + cls + '" onclick="App.openNotifPanel()">' +
    '<span class="hj-notif-icon">&#128276;</span>' +
    '<span class="hj-notif-text"><strong>' + resumo.naoLidas + '</strong> notifica\u00e7\u00e3o' + (resumo.naoLidas !== 1 ? '\u00f5es' : '') + ' n\u00e3o lida' + (resumo.naoLidas !== 1 ? 's' : '') + '</span>' +
    (resumo.criticas > 0 ? '<span class="hj-notif-criticas">' + resumo.criticas + ' cr\u00edtica' + (resumo.criticas !== 1 ? 's' : '') + '</span>' : '') +
    '<span class="hj-notif-btn">Abrir</span>' +
  '</div>';
};

App._renderBlocoMarketing = function(items) {
  if (!items || items.length === 0) {
    return '<div class="hj-bloco hj-bloco-placeholder">' +
      '<div class="hj-placeholder">' +
        '<span class="hj-placeholder-icon">&#9654;</span>' +
        '<span class="hj-placeholder-text">Em breve: a\u00e7\u00f5es inteligentes para seu est\u00fadio.</span>' +
      '</div>' +
    '</div>';
  }
  var html = '<div class="hj-bloco">' + C.sectionHeader('Produ\u00e7\u00e3o de Conte\u00fado', '<span class="hj-contador">' + items.length + '</span>') + '<div class="hj-card-list">';
  for (var i = 0; i < items.length; i++) {
    var c = items[i];
    html += this._renderCardAcao(c);
  }
  html += '</div><div class="hj-mais" onclick="App.navigate(\'marketing\')">Abrir Central de Marketing</div></div>';
  return html;
};

App._renderComunicacaoResumo = function() {
  var r = Comunicacao.getResumoOperacional();
  var total = r.totalPendencias;
  if (total === 0) return '';
  var critico = r.whatsapp.pendentes > 0 || r.instagram.pendente > 0;
  return '<div class="hj-notif-resumo ' + (critico ? 'hj-notif-critico' : '') + '" onclick="App.navigate(\'comunicacao\')" style="cursor:pointer;">' +
    '<span class="hj-notif-icon" style="font-size:1.2rem;">&#128172;</span>' +
    '<span class="hj-notif-text"><strong>' + total + '</strong> pend\u00eancia' + (total !== 1 ? 's' : '') + ' operaciona' + (total !== 1 ? 'is' : 'l') + '</span>' +
    '<span style="font-size:0.72rem;color:var(--text-muted);">' +
      (r.whatsapp.pendentes > 0 ? r.whatsapp.pendentes + ' WhatsApp | ' : '') +
      (r.agenda.confirmar > 0 ? r.agenda.confirmar + ' confirmar | ' : '') +
      (r.instagram.pendente > 0 ? r.instagram.pendente + ' Instagram' : '') +
    '</span>' +
    '<span class="hj-notif-btn">Abrir Central</span>' +
  '</div>';
};
