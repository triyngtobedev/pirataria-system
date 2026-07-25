App._mktTab = 'calendario';

App.renderMarketing = function() {
  this._mktTab = 'calendario';
  this._renderMktLayout();
};

App._renderMktLayout = function() {
  document.getElementById('moduleContent').innerHTML =
    '<div class="et-tabs">' +
      '<button class="btn btn-sm ' + (this._mktTab === 'calendario' ? 'btn-primary' : '') + '" onclick="App._setMktTab(\'calendario\')">Calend\u00e1rio</button>' +
      '<button class="btn btn-sm ' + (this._mktTab === 'ideias' ? 'btn-primary' : '') + '" onclick="App._setMktTab(\'ideias\')">Banco de Ideias</button>' +
      '<button class="btn btn-sm ' + (this._mktTab === 'ctas' ? 'btn-primary' : '') + '" onclick="App._setMktTab(\'ctas\')">CTAs</button>' +
      '<button class="btn btn-sm ' + (this._mktTab === 'templates' ? 'btn-primary' : '') + '" onclick="App._setMktTab(\'templates\')">Templates</button>' +
      '<button class="btn btn-sm " onclick="App._mktAutoSuggest()">Sugest\u00f5es</button>' +
    '</div><div id="mktContent"></div>';
  this._renderMktTab();
};

App._setMktTab = function(tab) { this._mktTab = tab; this._renderMktTab(); };

App._renderMktTab = function() {
  var el = document.getElementById('mktContent');
  if (this._mktTab === 'calendario') this._renderMktCalendario(el);
  else if (this._mktTab === 'ideias') this._renderMktIdeias(el);
  else if (this._mktTab === 'ctas') this._renderMktCTAs(el);
  else if (this._mktTab === 'templates') this._renderMktTemplates(el);
};

App._renderMktCalendario = function(el) {
  var items = Marketing.listItems();
  var metrics = Marketing.getMetrics();
  var html = '<div class="rp-grid" style="margin-bottom:16px;">' +
    '<div class="rp-card"><span class="rp-num">' + metrics.ideias + '</span><span class="rp-lbl">Ideias</span></div>' +
    '<div class="rp-card"><span class="rp-num">' + metrics.planejados + '</span><span class="rp-lbl">Planejados</span></div>' +
    '<div class="rp-card rp-card-green"><span class="rp-num">' + metrics.publicados + '</span><span class="rp-lbl">Publicados</span></div>' +
    '<div class="rp-card rp-card-red"><span class="rp-num">' + metrics.atrasados + '</span><span class="rp-lbl">Atrasados</span></div>' +
  '</div>' +
  '<div class="flex gap-8 mb-12"><button class="btn btn-primary btn-sm" onclick="App._showNewMktItem()">+ Novo conte\u00fado</button></div>';

  if (items.length === 0) { html += C.emptyStateFull({icon:'calendar', title:'Nenhum conte\u00fado no calend\u00e1rio', desc:'Adicione ideias ou crie diretamente.'}); el.innerHTML = html; return; }

  html += '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>T\u00edtulo</th><th>Perfil</th><th>Status</th><th></th></tr></thead><tbody>' +
    items.map(function(c) {
      var stCls = c.status === 'publicado' ? 'badge-completed' : c.status === 'cancelado' ? 'badge-cancelled' : c.status === 'produzido' ? 'badge-progress' : c.status === 'planejado' ? 'badge-scheduled' : 'badge-waiting';
      return '<tr class="clickable" onclick="App._viewMktItem(\'' + c.id + '\')"><td class="text-muted text-sm">' + (c.dataPrevista || '—') + '</td><td class="text-sm">' + (c.tipo || '—') + '</td><td>' + App._esc(c.titulo) + '</td><td class="text-muted text-sm">' + App._esc(c.perfilDestino || '—') + '</td><td><span class="badge ' + stCls + '">' + (Marketing.STATUS_LABELS[c.status] || c.status) + '</span></td><td><button class="btn btn-sm" onclick="event.stopPropagation();App._viewMktItem(\'' + c.id + '\')">Detalhes</button></td></tr>';
    }).join('') + '</tbody></table></div>';

  el.innerHTML = html;
};

App._showNewMktItem = function() {
  var ctas = Marketing.getCTAs();
  var settings = Repos.studio.settings.get();
  this._showOverlay('Novo conte\u00fado', '<div class="form-group"><label>T\u00edtulo</label><input type="text" id="mktNewTitle"></div><div class="form-row"><div class="form-group"><label>Tipo</label><select id="mktNewType">' + Marketing.TIPOS.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select></div><div class="form-group"><label>Data prevista</label><input type="date" id="mktNewDate"></div></div><div class="form-group"><label>Descri\u00e7\u00e3o</label><textarea id="mktNewDesc" rows="2"></textarea></div><div class="form-group"><label>CTA</label><select id="mktNewCTA"><option value="">—</option>' + ctas.map(function(c) { return '<option value="' + App._esc(c.texto) + '">' + App._esc(c.texto) + '</option>'; }).join('') + '</select></div><div class="form-group"><label>Perfil de destino</label><select id="mktNewPerfil"><option value="">—</option><option value="' + (settings.instagram || '') + '">' + (settings.instagram || 'Perfil principal') + '</option>' + (settings.instagramDigao ? '<option value="' + settings.instagramDigao + '">' + settings.instagramDigao + '</option>' : '') + '</select></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmNewMktItem()">Criar</button></div>');
};

App._confirmNewMktItem = function() {
  var titulo = document.getElementById('mktNewTitle').value.trim();
  if (!titulo) return;
  Marketing.createItem({ dataPrevista: document.getElementById('mktNewDate').value, tipo: document.getElementById('mktNewType').value, status: 'planejado', titulo: titulo, descricao: document.getElementById('mktNewDesc').value.trim(), cta: document.getElementById('mktNewCTA').value, perfilDestino: document.getElementById('mktNewPerfil').value });
  App._closeOverlay();
  App._toast('Conte\u00fado criado.', 'success');
  this._renderMktLayout();
};

App._viewMktItem = function(id) {
  var c = Marketing.getItem(id);
  if (!c) return;
  var html = '<div class="os-detail">' +
    '<div class="os-detail-row"><span class="os-detail-label">T\u00edtulo</span><span class="os-detail-value">' + App._esc(c.titulo) + '</span></div>' +
    '<div class="os-detail-row"><span class="os-detail-label">Tipo</span><span class="os-detail-value">' + (c.tipo || '—') + '</span></div>' +
    '<div class="os-detail-row"><span class="os-detail-label">Data</span><span class="os-detail-value">' + (c.dataPrevista || '—') + '</span></div>' +
    '<div class="os-detail-row"><span class="os-detail-label">Perfil</span><span class="os-detail-value">' + App._esc(c.perfilDestino || '—') + '</span></div>' +
    (c.descricao ? '<div class="os-detail-row"><span class="os-detail-label">Descri\u00e7\u00e3o</span><span class="os-detail-value">' + App._esc(c.descricao) + '</span></div>' : '') +
    (c.cta ? '<div class="os-detail-row"><span class="os-detail-label">CTA</span><span class="os-detail-value">' + App._esc(c.cta) + '</span></div>' : '') +
    (c.clientId ? '<div class="os-detail-row"><span class="os-detail-label">Cliente</span><span class="os-detail-value"><button class="btn btn-sm" onclick="App.openClientPanel(\'' + c.clientId + '\')">Ver</button></span></div>' : '') +
    '<div class="os-detail-row"><span class="os-detail-label">Status</span><span class="os-detail-value"><select id="mktEditStatus">' + Marketing.STATUS.map(function(s) { return '<option value="' + s + '"' + (c.status === s ? ' selected' : '') + '>' + Marketing.STATUS_LABELS[s] + '</option>'; }).join('') + '</select></span></div>' +
  '</div><div class="overlay-actions" style="margin-top:16px;"><button class="btn" onclick="App._closeOverlay()">Fechar</button><button class="btn btn-primary" onclick="App._saveMktItemStatus(\'' + id + '\')">Salvar</button></div>';
  this._showOverlay('Conte\u00fado', html);
};

App._saveMktItemStatus = function(id) {
  var st = document.getElementById('mktEditStatus').value;
  Marketing.updateItem(id, { status: st });
  App._closeOverlay();
  App._toast('Status atualizado.', 'success');
  this._renderMktLayout();
};

App._renderMktIdeias = function(el) {
  var ideias = Marketing.getIdeias();
  var html = '<div class="flex gap-8 mb-12"><button class="btn btn-primary btn-sm" onclick="App._showNewIdeia()">+ Nova ideia</button></div>';
  if (ideias.length === 0) { html += C.emptyStateFull({icon:'bell', title:'Nenhuma ideia cadastrada', desc:'Crie ideias para alimentar o calend\u00e1rio editorial.'}); el.innerHTML = html; return; }
  html += '<div class="rp-grid">';
  ideias.forEach(function(i) {
    html += '<div class="rp-card" style="text-align:left;"><div class="flex-between"><span class="rp-lbl" style="font-size:0.65rem;">' + App._esc(i.categoria) + '</span>' + (i.favorita ? '<span style="color:var(--gold);">\u2605</span>' : '') + '</div><div class="rp-num" style="font-size:0.9rem;margin:4px 0;">' + App._esc(i.titulo) + '</div>' + (i.descricao ? '<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;">' + App._esc(i.descricao) + '</div>' : '') + (i.hashtags ? '<div style="font-size:0.65rem;color:var(--gold-dim);">' + App._esc(i.hashtags) + '</div>' : '') + '<div class="flex gap-8 mt-12"><button class="btn btn-sm" onclick="App._mktIdeiaParaCalendario(\'' + i.id + '\')">Usar</button><button class="btn btn-sm" onclick="Marketing.updateIdeia(\'' + i.id + '\',{favorita:' + (!i.favorita) + '});App._renderMktIdeias(document.getElementById(\'mktContent\'));">' + (i.favorita ? 'Desfavoritar' : 'Favoritar') + '</button></div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
};

App._showNewIdeia = function() {
  this._showOverlay('Nova ideia', '<div class="form-group"><label>T\u00edtulo</label><input type="text" id="ideiaTitle"></div><div class="form-group"><label>Categoria</label><select id="ideiaCat"><option>Story</option><option>Reel</option><option>Carrossel</option><option>Foto</option><option>V\u00eddeo</option><option>Bastidores</option></select></div><div class="form-group"><label>Descri\u00e7\u00e3o</label><textarea id="ideiaDesc" rows="2"></textarea></div><div class="form-group"><label>CTA sugerido</label><input type="text" id="ideiaCTA"></div><div class="form-group"><label>Hashtags</label><input type="text" id="ideiaTags" placeholder="#bodyart #piercing"></div><div class="form-group"><label>Frequ\u00eancia</label><input type="text" id="ideiaFreq" placeholder="Ex: 1x por m\u00eas"></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmNewIdeia()">Criar</button></div>');
};

App._confirmNewIdeia = function() {
  var t = document.getElementById('ideiaTitle').value.trim();
  if (!t) return;
  Marketing.createIdeia({ categoria: document.getElementById('ideiaCat').value, titulo: t, descricao: document.getElementById('ideiaDesc').value.trim(), sugestaoCTA: document.getElementById('ideiaCTA').value.trim(), hashtags: document.getElementById('ideiaTags').value.trim(), frequencia: document.getElementById('ideiaFreq').value.trim() });
  App._closeOverlay();
  App._toast('Ideia criada.', 'success');
  this._renderMktLayout();
};

App._mktIdeiaParaCalendario = function(ideiaId) {
  var settings = Repos.studio.settings.get();
  this._showOverlay('Usar ideia no calend\u00e1rio', '<div class="form-group"><label>Data prevista</label><input type="date" id="mktIdeiaDate"></div><div class="form-group"><label>Perfil de destino</label><select id="mktIdeiaPerfil"><option value="">—</option><option value="' + (settings.instagram || '') + '">' + (settings.instagram || 'Perfil principal') + '</option>' + (settings.instagramDigao ? '<option value="' + settings.instagramDigao + '">' + settings.instagramDigao + '</option>' : '') + '</select></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmMktIdeiaParaCalendario(\'' + ideiaId + '\')">Adicionar ao calend\u00e1rio</button></div>');
};

App._confirmMktIdeiaParaCalendario = function(ideiaId) {
  Marketing.ideiaParaCalendario(ideiaId, document.getElementById('mktIdeiaDate').value, document.getElementById('mktIdeiaPerfil').value);
  App._closeOverlay();
  App._toast('Ideia adicionada ao calend\u00e1rio.', 'success');
  this._mktTab = 'calendario';
  this._renderMktLayout();
};

App._mktAutoSuggest = function() {
  var sugestoes = Marketing.autoSuggestFromPosAtendimento();
  if (sugestoes.length === 0) { App._toast('Nenhuma sugest\u00e3o dispon\u00edvel no momento.', 'info'); return; }
  var html = '<p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:14px;">Clientes com acompanhamento conclu\u00eddo e autoriza\u00e7\u00e3o: gere conte\u00fado automaticamente.</p><div style="display:flex;flex-direction:column;gap:8px;">';
  sugestoes.forEach(function(s) {
    html += '<div style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:10px 12px;display:flex;align-items:center;justify-content:space-between;"><span><strong>' + App._esc(s.clientName) + '</strong> — ' + App._esc(s.procedimento) + '</span><button class="btn btn-sm btn-primary" onclick="App._confirmMktSugestao(\'' + s.planoId + '\',\'' + s.clientId + '\',\'' + App._esc(s.clientName) + '\',\'' + App._esc(s.procedimento) + '\')">Gerar conte\u00fado</button></div>';
  });
  html += '</div><div class="overlay-actions" style="margin-top:16px;"><button class="btn" onclick="App._closeOverlay()">Fechar</button></div>';
  this._showOverlay('Sugest\u00f5es de conte\u00fado', html);
};

App._confirmMktSugestao = function(planoId, clientId, clientName, procedimento) {
  Marketing.criarSugestaoConteudo(planoId, clientId, clientName, procedimento);
  App._closeOverlay();
  App._toast('Sugest\u00e3o de conte\u00fado criada como Ideia no calend\u00e1rio.', 'success');
  this._mktTab = 'calendario';
  this._renderMktLayout();
};

App._renderMktCTAs = function(el) {
  var ctas = Marketing.getCTAs();
  var html = '<div class="flex gap-8 mb-12"><button class="btn btn-primary btn-sm" onclick="App._showNewCTA()">+ Novo CTA</button></div>';
  html += '<div class="table-wrap"><table><thead><tr><th>Texto</th><th></th></tr></thead><tbody>';
  if (ctas.length === 0) html += '<tr><td colspan="2"><div class="empty-state">Nenhum CTA cadastrado.</div></td></tr>';
  ctas.forEach(function(c) { html += '<tr><td>' + App._esc(c.texto) + '</td><td><button class="btn btn-sm btn-danger" onclick="Marketing.deleteCTA(\'' + c.id + '\');App._renderMktCTAs(document.getElementById(\'mktContent\'));">Remover</button></td></tr>'; });
  html += '</tbody></table></div>';
  el.innerHTML = html;
};

App._showNewCTA = function() {
  this._showOverlay('Novo CTA', '<div class="form-group"><label>Texto do CTA</label><input type="text" id="ctaText" placeholder="Ex: Agende seu piercing"></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmNewCTA()">Salvar</button></div>');
};

App._confirmNewCTA = function() {
  var t = document.getElementById('ctaText').value.trim();
  if (!t) return;
  Marketing.addCTA(t);
  App._closeOverlay();
  App._toast('CTA adicionado.', 'success');
  this._renderMktLayout();
};

App._renderMktTemplates = function(el) {
  var tipos = ['legenda', 'hashtag', 'roteiro', 'checklist'];
  var ativo = this._mktTplTab || 'legenda';
  var html = '<div class="et-tabs" style="margin-bottom:12px;">' + tipos.map(function(t) { return '<button class="btn btn-sm ' + (ativo === t ? 'btn-primary' : '') + '" onclick="App._mktTplTab=\'' + t + '\';App._renderMktTemplates(document.getElementById(\'mktContent\'))">' + t.charAt(0).toUpperCase() + t.slice(1) + 's</button>'; }).join('') + '</div>';
  html += '<div class="flex gap-8 mb-12"><button class="btn btn-primary btn-sm" onclick="App._showNewTemplate(\'' + ativo + '\')">+ Novo</button></div>';

  var templates = Marketing.getTemplates(ativo);
  if (templates.length === 0) { html += C.emptyState('Nenhum template cadastrado.'); el.innerHTML = html; return; }
  html += '<div style="display:flex;flex-direction:column;gap:8px;">';
  templates.forEach(function(t) {
    html += '<div style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:10px 12px;"><div class="flex-between"><strong>' + App._esc(t.titulo) + '</strong><button class="btn btn-sm btn-danger" onclick="Marketing.deleteTemplate(\'' + t.id + '\');App._renderMktTemplates(document.getElementById(\'mktContent\'))">Remover</button></div><div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;white-space:pre-wrap;">' + App._esc(t.conteudo) + '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
};

App._showNewTemplate = function(tipo) {
  this._showOverlay('Novo template', '<div class="form-group"><label>T\u00edtulo</label><input type="text" id="tplTitle"></div><div class="form-group"><label>Conte\u00fado</label><textarea id="tplContent" rows="4"></textarea></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmNewTemplate(\'' + tipo + '\')">Salvar</button></div>');
};

App._confirmNewTemplate = function(tipo) {
  var t = document.getElementById('tplTitle').value.trim();
  if (!t) return;
  Marketing.addTemplate({ tipo: tipo, titulo: t, conteudo: document.getElementById('tplContent').value.trim() });
  App._closeOverlay();
  App._toast('Template salvo.', 'success');
  this._renderMktLayout();
};
