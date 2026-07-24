const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

App._validateFile = function(file) {
  const ext = (file.name || '').split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    App._toast('Formato não permitido. Use: PDF, JPG, PNG ou WEBP.', 'error');
    return false;
  }
  if (file.size > MAX_SIZE) {
    App._toast('Arquivo muito grande. Máximo permitido: 10 MB.', 'error');
    return false;
  }
  return true;
};

App._uploadAnexo = function(file, entity, entityId, clientName, notes, callback) {
  if (!this._validateFile(file)) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    DB.addAnexo({ entity, entityId, clientName, fileName: file.name, fileType: file.type, fileSize: file.size, content, notes: notes || '' });
    Audit.action('upload', 'anexos', entityId, 'Anexo: ' + file.name + ' (' + entity + ')');
    App._toast('Arquivo anexado com sucesso.', 'success');
    if (callback) callback();
  };
  reader.onerror = function() { App._toast('Erro ao ler o arquivo.', 'error'); };
  reader.readAsDataURL(file);
};

App._deleteAnexo = function(id, callback) {
  App._confirm('Remover este anexo?', function() {
    const a = DB.getAnexos(null, null).find(x => x.id === id);
    if (a) Audit.action('delete', 'anexos', id, 'Anexo removido: ' + a.fileName);
    DB.deleteAnexo(id);
    App._toast('Anexo removido.', 'success');
    if (callback) callback();
  });
};

App._downloadAnexo = function(id) {
  const a = DB.getAnexos(null, null).find(x => x.id === id);
  if (!a || !a.content) return;
  Audit.action('download', 'anexos', id, 'Download: ' + a.fileName);
  const link = document.createElement('a');
  link.href = a.content;
  link.download = a.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

App._viewAnexo = function(id) {
  const a = DB.getAnexos(null, null).find(x => x.id === id);
  if (!a || !a.content) return;
  Audit.action('view', 'anexos', id, 'Visualização: ' + a.fileName);
  this._showOverlay('Anexo: ' + a.fileName, `
    <div style="margin-bottom:12px;font-size:0.82rem;color:var(--text-muted);">
      ${App._esc(a.fileName)} · ${(a.fileSize / 1024).toFixed(1)} KB · ${a.createdAt ? a.createdAt.slice(0, 10) : ''}
      ${a.notes ? '<br>Obs: ' + App._esc(a.notes) : ''}
    </div>
    ${a.content.startsWith('data:image/') ? '<img src="' + a.content + '" style="max-width:100%;max-height:400px;border-radius:4px;">' : '<iframe src="' + a.content + '" style="width:100%;height:400px;border:1px solid var(--border);border-radius:4px;"></iframe>'}
    <div class="overlay-actions" style="margin-top:12px;">
      <button class="btn" onclick="App._closeOverlay()">Fechar</button>
      <button class="btn btn-primary" onclick="App._downloadAnexo('${id}')">Baixar</button>
    </div>
  `);
};

App._renderAnexosList = function(entity, entityId) {
  const anexos = DB.getAnexos(entity, entityId);
  if (anexos.length === 0) return C.emptyState('Nenhum anexo.');
  return anexos.map(a => {
    const date = a.createdAt ? a.createdAt.slice(0, 10) : '—';
    const sizeKB = (a.fileSize / 1024).toFixed(1);
    return '<div class="anexo-item"><div class="anexo-info"><span class="anexo-name">' + App._esc(a.fileName) + '</span><span class="anexo-meta">' + sizeKB + ' KB · ' + date + (a.notes ? ' — ' + App._esc(a.notes) : '') + '</span></div><div class="actions"><button class="btn btn-sm" onclick="App._viewAnexo(\'' + a.id + '\')">Ver</button><button class="btn btn-sm" onclick="App._downloadAnexo(\'' + a.id + '\')">Baixar</button><button class="btn btn-sm btn-danger" onclick="App._deleteAnexo(\'' + a.id + '\', function(){App._refreshAnexos(\'' + entity + '\',\'' + entityId + '\')})">Remover</button></div></div>';
  }).join('');
};

App._renderAnexosSection = function(entity, entityId, clientName) {
  return `<div class="panel-divider"></div>
    <div class="panel-section">
      <div class="flex-between mb-12">
        <div class="panel-section-title">Anexos</div>
        <label class="btn btn-primary btn-sm" style="cursor:pointer;">+ Anexar<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style="display:none;" onchange="App._onAnexarFile(event, '${entity}', '${entityId}', '${App._esc(clientName)}')"></label>
      </div>
      <div id="anexosList_${entity}_${entityId}">${this._renderAnexosList(entity, entityId)}</div>
    </div>`;
};

App._onAnexarFile = function(event, entity, entityId, clientName) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  App._uploadAnexo(file, entity, entityId, clientName, '', function() {
    App._refreshAnexos(entity, entityId);
  });
  event.target.value = '';
};

App._refreshAnexos = function(entity, entityId) {
  const el = document.getElementById('anexosList_' + entity + '_' + entityId);
  if (el) el.innerHTML = App._renderAnexosList(entity, entityId);
};
