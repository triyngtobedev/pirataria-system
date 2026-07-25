App._kbSearch = '';
App._kbCategoria = '';

App.renderConhecimento = function() {
  this._kbSearch = '';
  this._kbCategoria = '';
  this._renderKB();
};

App._renderKB = function() {
  var artigos = this._kbSearch ? Knowledge.search(this._kbSearch) : Knowledge.list(this._kbCategoria || null);
  var metrics = Knowledge.getMetrics();

  var html = '<div class="rp-controls"><div class="rp-filters">' +
    '<input type="text" id="kbSearch" placeholder="Buscar na base de conhecimento..." style="width:220px;padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);" value="' + this._esc(this._kbSearch) + '" oninput="App._onKBSearch()">' +
    '<select id="kbCategoria" onchange="App._onKBCategoria()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">' +
      '<option value="">Todas categorias</option>' +
      Knowledge.CATEGORIAS.map(function(c) { return '<option value="' + c + '"' + (App._kbCategoria === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
    '</select>' +
    '<button class="btn btn-primary btn-sm" onclick="App._showNewKBArticle()">+ Novo artigo</button>' +
  '</div></div>' +
  '<div class="rp-grid" style="margin-bottom:18px;">' +
    '<div class="rp-card"><span class="rp-num">' + metrics.ativos + '</span><span class="rp-lbl">Artigos ativos</span></div>' +
    '<div class="rp-card"><span class="rp-num">' + metrics.categorias + '</span><span class="rp-lbl">Categorias</span></div>' +
    '<div class="rp-card"><span class="rp-num">' + metrics.favoritos + '</span><span class="rp-lbl">Favoritos</span></div>' +
  '</div>';

  if (artigos.length === 0) {
    html += C.emptyStateFull({ icon: 'file', title: 'Nenhum artigo encontrado', desc: 'Crie o primeiro artigo para come\u00e7ar a construir sua base de conhecimento.' });
    document.getElementById('moduleContent').innerHTML = html;
    return;
  }

  html += '<div style="display:flex;flex-direction:column;gap:8px;">';
  for (var i = 0; i < artigos.length; i++) {
    var a = artigos[i];
    var tipoLabel = Knowledge.TIPO_LABELS[a.tipo] || a.tipo;
    var favorito = a.favorito ? ' \u2605' : '';
    var tags = a.tags && a.tags.length > 0 ? a.tags.slice(0, 3).join(', ') + (a.tags.length > 3 ? '...' : '') : '';
    var versao = a.versao ? ' v' + a.versao : '';
    html += '<div class="rp-card" style="text-align:left;cursor:pointer;" onclick="App._viewKBArticle(\'' + a.id + '\')">' +
      '<div class="flex-between"><span><span class="badge badge-scheduled" style="font-size:0.6rem;">' + App._esc(a.categoria) + '</span> <span class="badge badge-progress" style="font-size:0.6rem;">' + App._esc(tipoLabel) + '</span>' + versao + '</span><span>' + favorito + '</span></div>' +
      '<div class="rp-num" style="font-size:0.9rem;margin:4px 0;">' + App._esc(a.titulo) + '</div>' +
      (a.resumo ? '<div style="font-size:0.75rem;color:var(--text-muted);">' + App._esc(a.resumo) + '</div>' : '') +
      (tags ? '<div style="font-size:0.65rem;color:var(--gold-dim);margin-top:4px;">' + App._esc(tags) + '</div>' : '') +
    '</div>';
  }
  html += '</div>';
  document.getElementById('moduleContent').innerHTML = html;
};

App._onKBSearch = function() {
  this._kbSearch = document.getElementById('kbSearch').value;
  this._kbCategoria = '';
  document.getElementById('kbCategoria').value = '';
  this._renderKB();
};

App._onKBCategoria = function() {
  this._kbCategoria = document.getElementById('kbCategoria').value;
  this._kbSearch = '';
  document.getElementById('kbSearch').value = '';
  this._renderKB();
};

App._showNewKBArticle = function() {
  var html = '<div class="form-group"><label>T\u00edtulo</label><input type="text" id="kbTitle"></div>' +
    '<div class="form-row"><div class="form-group"><label>Categoria</label><select id="kbCat">' + Knowledge.CATEGORIAS.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-group"><label>Tipo</label><select id="kbTipo">' + Knowledge.TIPOS.map(function(t) { return '<option value="' + t + '">' + Knowledge.TIPO_LABELS[t] + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="form-group"><label>Resumo</label><input type="text" id="kbResumo" placeholder="Breve descri\u00e7\u00e3o"></div>' +
    '<div class="form-group"><label>Conte\u00fado</label><textarea id="kbConteudo" rows="6" placeholder="Escreva o conte\u00fado aqui..."></textarea></div>' +
    '<div class="form-group"><label>Tags (separadas por v\u00edrgula)</label><input type="text" id="kbTags" placeholder="piercing, h\u00e9lix, cuidados"></div>' +
    '<div class="form-group"><label>Relacionado com</label><select id="kbRel"><option value="">—</option><option value="procedimento">Procedimento</option><option value="joia">Joia</option><option value="material">Material</option><option value="atendimento">Atendimento</option><option value="marketing">Marketing</option></select></div>' +
    '<div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmNewKBArticle()">Criar artigo</button></div>';
  this._showOverlay('Novo artigo', html);
};

App._confirmNewKBArticle = function() {
  var titulo = document.getElementById('kbTitle').value.trim();
  if (!titulo) { App._toast('T\u00edtulo \u00e9 obrigat\u00f3rio.', 'warning'); return; }
  var tagsStr = document.getElementById('kbTags').value.trim();
  var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; }) : [];
  Knowledge.create({ categoria: document.getElementById('kbCat').value, tipo: document.getElementById('kbTipo').value, titulo: titulo, resumo: document.getElementById('kbResumo').value.trim(), conteudo: document.getElementById('kbConteudo').value.trim(), tags: tags, relacionadoCom: document.getElementById('kbRel').value });
  App._closeOverlay();
  App._toast('Artigo criado.', 'success');
  this._renderKB();
};

App._viewKBArticle = function(id) {
  var a = Knowledge.get(id);
  if (!a) return;
  var tipoLabel = Knowledge.TIPO_LABELS[a.tipo] || a.tipo;
  var tags = a.tags && a.tags.length > 0 ? a.tags.map(function(t) { return '<span class="badge badge-scheduled" style="font-size:0.6rem;margin:0 2px;">' + App._esc(t) + '</span>'; }).join('') : '';
  var versoes = Knowledge.getVersions(id);
  var versaoHtml = versoes.length > 0 ? '<div style="margin-top:12px;font-size:0.72rem;color:var(--text-dim);">' + versoes.slice(0, 5).map(function(v) { return 'v' + v.versao + ' — ' + (v.createdAt ? v.createdAt.slice(0, 19).replace('T', ' ') : '') + (v.observacao ? ' (' + v.observacao + ')' : ''); }).join('<br>') + '</div>' : '';

  this._showOverlay(App._esc(a.titulo), '<div class="os-detail">' +
    '<div class="os-detail-row"><span class="os-detail-label">Categoria</span><span class="os-detail-value">' + App._esc(a.categoria) + '</span></div>' +
    '<div class="os-detail-row"><span class="os-detail-label">Tipo</span><span class="os-detail-value">' + tipoLabel + ' (v' + (a.versao || 1) + ')</span></div>' +
    (a.resumo ? '<div class="os-detail-row"><span class="os-detail-label">Resumo</span><span class="os-detail-value">' + App._esc(a.resumo) + '</span></div>' : '') +
    '<div class="os-detail-row"><span class="os-detail-label">Conte\u00fado</span><span class="os-detail-value" style="white-space:pre-wrap;font-size:0.82rem;line-height:1.6;">' + App._esc(a.conteudo) + '</span></div>' +
    (tags ? '<div class="os-detail-row"><span class="os-detail-label">Tags</span><span class="os-detail-value">' + tags + '</span></div>' : '') +
    (a.relacionadoCom ? '<div class="os-detail-row"><span class="os-detail-label">Relacionado</span><span class="os-detail-value">' + a.relacionadoCom + '</span></div>' : '') +
    (a.createdAt ? '<div class="os-detail-row"><span class="os-detail-label">Criado</span><span class="os-detail-value">' + a.createdAt.slice(0, 10) + '</span></div>' : '') +
  '</div>' + versaoHtml +
  '<div class="overlay-actions" style="margin-top:16px;">' +
    '<button class="btn" onclick="App._closeOverlay()">Fechar</button>' +
    '<button class="btn" onclick="Knowledge.toggleFavorito(\'' + id + '\');App._viewKBArticle(\'' + id + '\');">' + (a.favorito ? 'Desfavoritar' : 'Favoritar') + '</button>' +
    '<button class="btn btn-primary" onclick="App._editKBArticle(\'' + id + '\')">Editar</button>' +
    '<button class="btn' + (a.ativo ? ' btn-danger' : ' btn-success') + '" onclick="App._toggleKBArticle(\'' + id + '\')">' + (a.ativo ? 'Desativar' : 'Ativar') + '</button>' +
  '</div>');
};

App._editKBArticle = function(id) {
  var a = Knowledge.get(id);
  if (!a) return;
  App._closeOverlay();
  var tagsStr = a.tags ? a.tags.join(', ') : '';
  this._showOverlay('Editar: ' + App._esc(a.titulo), '<div class="form-group"><label>T\u00edtulo</label><input type="text" id="kbTitle" value="' + App._esc(a.titulo) + '"></div>' +
    '<div class="form-row"><div class="form-group"><label>Categoria</label><select id="kbCat">' + Knowledge.CATEGORIAS.map(function(c) { return '<option value="' + c + '"' + (a.categoria === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-group"><label>Tipo</label><select id="kbTipo">' + Knowledge.TIPOS.map(function(t) { return '<option value="' + t + '"' + (a.tipo === t ? ' selected' : '') + '>' + Knowledge.TIPO_LABELS[t] + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="form-group"><label>Resumo</label><input type="text" id="kbResumo" value="' + App._esc(a.resumo) + '"></div>' +
    '<div class="form-group"><label>Conte\u00fado</label><textarea id="kbConteudo" rows="6">' + App._esc(a.conteudo) + '</textarea></div>' +
    '<div class="form-group"><label>Tags (separadas por v\u00edrgula)</label><input type="text" id="kbTags" value="' + App._esc(tagsStr) + '"></div>' +
    '<div class="form-group"><label>Observa\u00e7\u00e3o da edi\u00e7\u00e3o</label><input type="text" id="kbObs" placeholder="Ex: Atualizado protocolo de biosseguran\u00e7a"></div>' +
    '<div class="form-group"><label>Relacionado com</label><select id="kbRel"><option value="">—</option><option value="procedimento"' + (a.relacionadoCom === 'procedimento' ? ' selected' : '') + '>Procedimento</option><option value="joia"' + (a.relacionadoCom === 'joia' ? ' selected' : '') + '>Joia</option><option value="material"' + (a.relacionadoCom === 'material' ? ' selected' : '') + '>Material</option><option value="atendimento"' + (a.relacionadoCom === 'atendimento' ? ' selected' : '') + '>Atendimento</option><option value="marketing"' + (a.relacionadoCom === 'marketing' ? ' selected' : '') + '>Marketing</option></select></div>' +
    '<div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._confirmEditKBArticle(\'' + id + '\')">Salvar</button></div>');
};

App._confirmEditKBArticle = function(id) {
  var titulo = document.getElementById('kbTitle').value.trim();
  if (!titulo) return;
  var tagsStr = document.getElementById('kbTags').value.trim();
  var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; }) : [];
  var obs = document.getElementById('kbObs').value.trim();
  Knowledge.update(id, { categoria: document.getElementById('kbCat').value, tipo: document.getElementById('kbTipo').value, titulo: titulo, resumo: document.getElementById('kbResumo').value.trim(), conteudo: document.getElementById('kbConteudo').value.trim(), tags: tags, relacionadoCom: document.getElementById('kbRel').value }, obs || 'Editado manualmente');
  App._closeOverlay();
  App._toast('Artigo atualizado.', 'success');
  this._renderKB();
};

App._toggleKBArticle = function(id) {
  var a = Knowledge.get(id);
  if (!a) return;
  Knowledge.update(id, { ativo: !a.ativo, _novaversao: false }, (a.ativo ? 'Desativado' : 'Ativado'));
  App._closeOverlay();
  App._toast('Artigo ' + (a.ativo ? 'desativado' : 'ativado') + '.', 'success');
  this._renderKB();
};
