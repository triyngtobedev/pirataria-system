App.renderComunicacao = function() {
  var data = Comunicacao.collect();
  var resumo = Comunicacao.getResumoOperacional();

  var html = '<div class="hj-wrap">' +
    '<div class="hj-topbar"><div class="hj-topbar-left"><span class="hj-saudacao">Central de Comunica\u00e7\u00e3o</span><span class="hj-data">' + new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + '</span></div>' +
    '<div class="hj-topbar-right"><span class="hj-stat" style="color:var(--accent-hover);"><strong>' + resumo.totalPendencias + '</strong> pend\u00eancias</span></div></div>' +
    this._renderResumoComunicacao(resumo) +
    '<div class="hj-filtros" style="margin-bottom:18px;">' +
      '<span class="hj-chip hj-chip-active" onclick="App._filtroCom=this;App._renderComTab(\'tudo\')">Tudo</span>' +
      '<span class="hj-chip" onclick="App._filtroCom=this;App._renderComTab(\'whatsapp\')">WhatsApp</span>' +
      '<span class="hj-chip" onclick="App._filtroCom=this;App._renderComTab(\'agenda\')">Agenda</span>' +
      '<span class="hj-chip" onclick="App._filtroCom=this;App._renderComTab(\'instagram\')">Instagram</span>' +
    '</div><div id="comContent"></div></div>';

  document.getElementById('moduleContent').innerHTML = html;
  this._renderComTab('tudo');
};

App._renderResumoComunicacao = function(r) {
  return '<div class="hj-resumo">' +
    '<div class="hj-resumo-item ' + (r.whatsapp.pendentes > 0 ? 'hj-resumo-red' : '') + '"><span class="hj-resumo-val">' + r.whatsapp.pendentes + '</span><span class="hj-resumo-lbl">WhatsApp</span></div>' +
    '<div class="hj-resumo-item"><span class="hj-resumo-val">' + r.agenda.hoje + '</span><span class="hj-resumo-lbl">Agenda hoje</span></div>' +
    '<div class="hj-resumo-item"><span class="hj-resumo-val">' + (r.calendario.pendente > 0 ? '\u26A0' : '\u2713') + '</span><span class="hj-resumo-lbl">Google Cal.</span></div>' +
    '<div class="hj-resumo-item ' + (r.instagram.pendente > 0 ? 'hj-resumo-red' : '') + '"><span class="hj-resumo-val">' + r.instagram.pendente + '</span><span class="hj-resumo-lbl">Instagram</span></div>' +
  '</div>';
};

App._renderComTab = function(filtro) {
  var data = Comunicacao.collect();
  var el = document.getElementById('comContent');
  if (!el) return;

  // Update chip styles
  document.querySelectorAll('.hj-chip').forEach(function(c) { c.classList.remove('hj-chip-active'); });
  var chips = document.querySelectorAll('.hj-chip');
  var idx = { tudo: 0, whatsapp: 1, agenda: 2, instagram: 3 }[filtro] || 0;
  if (chips[idx]) chips[idx].classList.add('hj-chip-active');

  var html = '';

  // WhatsApp
  if (filtro === 'tudo' || filtro === 'whatsapp') {
    html += '<div class="hj-bloco">' + this._renderComSection('WhatsApp', data.conversas.length, 'inbox');
    if (data.conversas.length === 0) {
      html += '<div class="empty-state" style="padding:20px;">Nenhuma conversa ativa.</div>';
    } else {
      html += '<div class="hj-card-list">';
      data.conversas.forEach(function(c) {
        var isAguardando = c.status === 'aguardando_estudio';
        html += '<div class="hj-card ' + (isAguardando ? 'hj-card-urg' : '') + '"><div class="hj-card-main">' +
          '<div class="hj-card-avatar">' + App._iniciais(c.clientName) + '</div>' +
          '<div class="hj-card-body"><div class="hj-card-title">' + App._esc(c.clientName) + (isAguardando ? ' <span class="badge badge-cancelled">Aguardando</span>' : '') + '</div>' +
          '<div class="hj-card-desc">' + (Inbox.ORIGEM_LABELS[c.origin] || c.origin || 'WhatsApp') + ' \u2022 ' + App._tempoRelativo(c.ultimaInteracao) + '</div></div>' +
          '<div class="hj-card-actions"><button class="btn btn-sm hj-card-btn" onclick="App.navigate(\'inbox\')">Abrir</button></div></div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // Agenda
  if (filtro === 'tudo' || filtro === 'agenda') {
    html += '<div class="hj-bloco">' + this._renderComSection('Agenda de Hoje', data.agenda.length, 'agenda');
    if (data.agenda.length === 0) {
      html += '<div class="empty-state" style="padding:20px;">Nenhum agendamento hoje.</div>';
    } else {
      html += '<div class="hj-card-list">';
      data.agenda.forEach(function(a) {
        var precisaConf = a.status === 'pending';
        html += '<div class="hj-card ' + (precisaConf ? 'hj-card-warn' : '') + '"><div class="hj-card-main">' +
          '<div class="hj-card-avatar">' + App._iniciais(a.clientName) + '</div>' +
          '<div class="hj-card-body"><div class="hj-card-title">' + App._esc(a.clientName) + (precisaConf ? ' <span class="badge badge-scheduled">Pendente</span>' : '') + '</div>' +
          '<div class="hj-card-desc">' + App._esc(a.service) + (a.professional ? ' \u2014 ' + Repos.studio.professionals.label(a.professional) : '') + ' \u2022 ' + a.time + '</div></div>' +
          '<div class="hj-card-actions"><button class="btn btn-sm hj-card-btn" onclick="App.navigate(\'agenda\')">Abrir</button></div></div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // Instagram
  if (filtro === 'tudo' || filtro === 'instagram') {
    html += '<div class="hj-bloco">' + this._renderComSection('Instagram — Conte\u00fado', data.conteudos.length, 'marketing');
    if (data.conteudos.length === 0) {
      html += '<div class="empty-state" style="padding:20px;">Nenhum conte\u00fado nos perfis.</div>';
    } else {
      html += '<div class="hj-card-list">';
      data.conteudos.forEach(function(c) {
        var isAtrasado = c.dataPrevista && c.dataPrevista < DB._today() && c.status !== 'publicado';
        html += '<div class="hj-card ' + (isAtrasado ? 'hj-card-urg' : '') + '"><div class="hj-card-main">' +
          '<div class="hj-card-avatar" style="background:var(--accent-dim);color:var(--accent-hover);">IG</div>' +
          '<div class="hj-card-body"><div class="hj-card-title">' + App._esc(c.titulo) + (isAtrasado ? ' <span class="badge badge-cancelled">Atrasado</span>' : '') + '</div>' +
          '<div class="hj-card-desc">' + (c.tipo || '') + ' \u2022 ' + App._esc(c.perfilDestino || '—') + (c.dataPrevista ? ' \u2022 ' + c.dataPrevista : '') + '</div></div>' +
          '<div class="hj-card-actions"><button class="btn btn-sm hj-card-btn" onclick="App.navigate(\'marketing\')">Abrir</button></div></div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  el.innerHTML = html || '<div class="empty-state" style="padding:40px;">Selecione uma aba acima.</div>';
};

App._renderComSection = function(titulo, total, modulo) {
  var limit = 8;
  return '<div class="flex-between mb-12"><div class="section-title">' + titulo + ' <span class="hj-contador">' + total + '</span></div>' +
    '<button class="btn btn-sm" onclick="App.navigate(\'' + modulo + '\')">Ver tudo</button></div>';
};
