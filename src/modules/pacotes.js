App._pacFilter = { search: '', service: '', status: '' };

App.renderPacotes = function() {
  const el = document.getElementById('moduleContent');
  const list = DB.getPacotes();
  const ativos = list.filter(p => p.status === 'ativo');
  const concluidos = list.filter(p => p.status === 'concluido');
  const sessoesRestantes = ativos.reduce((s, p) => s + (p.remainingQty || 0), 0);
  const services = Repos.studio.services.active();

  el.innerHTML = `
    <div class="rp-grid" style="margin-bottom:16px;">
      <div class="rp-card rp-card-green"><span class="rp-num">${ativos.length}</span><span class="rp-lbl">Ativos</span></div>
      <div class="rp-card"><span class="rp-num">${concluidos.length}</span><span class="rp-lbl">Concluídos</span></div>
      <div class="rp-card"><span class="rp-num">${sessoesRestantes}</span><span class="rp-lbl">Sessões restantes</span></div>
    </div>
    <div class="rp-controls">
      <div class="rp-filters">
        <input type="text" id="pacSearch" placeholder="Buscar por cliente..." oninput="App._filterPac()" style="width:170px;padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
        <select id="pacServiceFilter" onchange="App._filterPac()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos serviços</option>
          ${services.map(s => '<option value="' + s.id + '">' + App._esc(s.name) + '</option>').join('')}
        </select>
        <select id="pacStatusFilter" onchange="App._filterPac()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos status</option>
          <option value="ativo">Ativo</option>
          <option value="concluido">Concluído</option>
          <option value="expirado">Expirado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="App._showAddPacote()">+ Novo pacote</button>
      </div>
    </div>
    <div id="pacList">${this._renderPacList(list)}</div>`;
};

App._filterPac = function() {
  let list = DB.getPacotes();
  const s = (document.getElementById('pacSearch').value || '').trim().toLowerCase();
  const sv = document.getElementById('pacServiceFilter').value;
  const st = document.getElementById('pacStatusFilter').value;
  if (s) list = list.filter(p => p.clientName.toLowerCase().includes(s));
  if (sv) list = list.filter(p => p.service === sv);
  if (st) list = list.filter(p => p.status === st);
  document.getElementById('pacList').innerHTML = this._renderPacList(list);
};

App._renderPacList = function(list) {
  if (list.length === 0) return C.emptyState('Nenhum pacote encontrado.');
  const statusLabels = { ativo: 'Ativo', concluido: 'Concluído', expirado: 'Expirado', cancelado: 'Cancelado' };
  const statusClasses = { ativo: 'badge-completed', concluido: 'badge-scheduled', expirado: 'badge-cancelled', cancelado: 'badge-cancelled' };
  return '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Pacote</th><th>Serviço</th><th>Sessões</th><th>Restam</th><th>Validade</th><th>Status</th><th></th></tr></thead><tbody>' +
    list.map(p => '<tr><td>' + App._esc(p.clientName) + '</td><td>' + App._esc(p.name) + '</td><td class="text-muted text-sm">' + App._esc(p.service) + '</td><td>' + (p.usedQty || 0) + '/' + p.totalQty + '</td><td><strong>' + (p.remainingQty || 0) + '</strong></td><td class="text-muted text-sm">' + (p.expiresAt || '—') + '</td><td>' + C.badge(statusLabels[p.status] || p.status, p.status) + '</td><td><div class="actions">' + (p.status === 'ativo' ? '<button class="btn btn-sm btn-danger" onclick="App._cancelPacote(\'' + p.id + '\')">Cancelar</button>' : '') + '<button class="btn btn-sm" onclick="App._viewPacote(\'' + p.id + '\')">Detalhes</button></div></td></tr>').join('') +
    '</tbody></table></div>';
};

App._viewPacote = function(id) {
  const p = DB.getPacote(id);
  if (!p) return;
  const history = (p.usageHistory || []).map(h => '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.8rem;border-bottom:1px solid var(--border-light);"><span>' + h.date + (h.professional ? ' — ' + Repos.studio.professionals.label(h.professional) : '') + '</span><span>Usou 1</span><span class="text-muted text-sm">Restam: ' + h.remainingQty + '</span></div>').join('') || '<div class="text-muted text-sm">Nenhuma utilização.</div>';
  this._showOverlay('Pacote: ' + App._esc(p.name), `
    <div class="os-detail">
      <div class="os-detail-row"><span class="os-detail-label">Cliente</span><span class="os-detail-value">${App._esc(p.clientName)}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Pacote</span><span class="os-detail-value">${App._esc(p.name)}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Serviço</span><span class="os-detail-value">${App._esc(p.service)}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Sessões</span><span class="os-detail-value">${p.usedQty || 0} / ${p.totalQty}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Restantes</span><span class="os-detail-value">${p.remainingQty || 0}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Status</span><span class="os-detail-value">${statusLabels[p.status] || p.status}</span></div>
    </div>
    <div style="margin-top:14px;"><div class="panel-section-title">Histórico</div>${history}</div>
    <div class="overlay-actions" style="margin-top:14px;"><button class="btn" onclick="App._closeOverlay()">Fechar</button></div>
  `);
};

App._showAddPacote = function(prefillClientId) {
  const clients = DB.getClients();
  const services = Repos.studio.services.active();
  this._showOverlay('Novo pacote', `
    <div class="form-group"><label>Cliente *</label>
      <select id="pacClient"><option value="">—</option>${clients.map(c => '<option value="' + c.id + '"' + (c.id === prefillClientId ? ' selected' : '') + '>' + App._esc(c.name) + '</option>').join('')}</select>
    </div>
    <div class="form-group"><label>Nome do pacote *</label><input type="text" id="pacName" placeholder="Ex: 5 sessões de piercing"></div>
    <div class="form-row">
      <div class="form-group"><label>Serviço *</label>
        <select id="pacService">${services.map(s => '<option value="' + s.id + '">' + App._esc(s.name) + '</option>').join('')}</select>
      </div>
      <div class="form-group"><label>Quantidade *</label><input type="number" id="pacQty" value="1" min="1"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Valor total (R$)</label><input type="text" id="pacValue" placeholder="0,00"></div>
      <div class="form-group"><label>Validade</label><input type="date" id="pacExpires"></div>
    </div>
    <div class="form-group"><label>Observações</label><textarea id="pacNotes" rows="2"></textarea></div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._addPacote()">Salvar</button></div>
  `);
};

App._addPacote = function() {
  const cs = document.getElementById('pacClient'); const c = Repos.clientes.list().find(x => x.id === cs.value); if (!c) return;
  const name = document.getElementById('pacName').value.trim(); if (!name) return;
  DB.addPacote({ clientName: c.name, clientId: c.id, name, service: document.getElementById('pacService').value, qty: document.getElementById('pacQty').value, value: document.getElementById('pacValue').value.trim().replace(',', '.'), purchaseDate: DB._today(), expiresAt: document.getElementById('pacExpires').value || null, notes: document.getElementById('pacNotes').value.trim() });
  Audit.action('create', 'pacotes', c.id, 'Pacote: ' + name);
  this._closeOverlay(); this.renderPacotes();
};

App._cancelPacote = function(id) {
  App._confirm('Cancelar este pacote?', function() {
    DB.updatePacote(id, { status: 'cancelado' });
    Audit.action('cancel', 'pacotes', id, 'Pacote cancelado');
    App.renderPacotes();
  });
};

// ─── Consumo automático ───
App._checkPacoteEUsar = function(clientId, service, refId, professional, callback) {
  if (!clientId || !service) { if (callback) callback(false); return; }
  const pacotes = DB.getPacotesAtivosByClientAndService(clientId, service);
  if (pacotes.length === 0) { if (callback) callback(false); return; }
  const p = pacotes[0];
  App._confirm(p.clientName + ' possui pacote "' + p.name + '" com ' + p.remainingQty + ' sessão(ões) restante(s). Deseja utilizar uma sessão?', function() {
    const r = DB.usePacote(clientId, service, refId, professional);
    if (r.used) {
      Audit.action('use', 'pacotes', r.pacote.id, 'Sessão utilizada em ' + service + ' — restam ' + r.pacote.remainingQty);
      if (r.pacote.status === 'concluido') Audit.action('complete', 'pacotes', r.pacote.id, 'Pacote concluído');
      App._toast('Sessão do pacote "' + r.pacote.name + '" utilizada! Restam ' + r.pacote.remainingQty, 'success');
    }
    if (callback) callback(r.used);
  });
};

// ─── Seção no perfil do cliente ───
App._renderPacotesSection = function(clientId, clientName) {
  const pacotes = DB.getPacotesByClient(clientId);
  const ativos = pacotes.filter(p => p.status === 'ativo');
  if (ativos.length === 0) return '';
  let html = '<div class="panel-divider"></div><div class="panel-section">';
  html += '<div class="flex-between mb-12"><div class="panel-section-title">Pacotes</div><button class="btn btn-primary btn-sm" onclick="App._showAddPacote(\'' + clientId + '\');App.closeClientPanel()">+ Novo pacote</button></div>';
  ativos.forEach(p => {
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.82rem;border-bottom:1px solid var(--border-light);">';
    html += '<div><span style="font-weight:500;">' + App._esc(p.name) + '</span><br><span class="text-muted text-sm">' + App._esc(p.service) + '</span></div>';
    html += '<div style="text-align:right;"><span style="font-weight:600;">' + (p.remainingQty || 0) + '/' + p.totalQty + '</span><br><span class="text-muted text-sm">restam</span></div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
};
