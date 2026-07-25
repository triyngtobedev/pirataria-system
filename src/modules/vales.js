App._valeFilter = { search: '', status: '' };

App.renderVales = function() {
  const el = document.getElementById('moduleContent');
  const vales = DB.getVales();
  const ativos = vales.filter(v => v.status === 'ativo').reduce((s, v) => s + (parseFloat(v.balance) || 0), 0);
  const utilizados = vales.filter(v => v.status !== 'ativo' && v.status !== 'cancelado').reduce((s, v) => s + (parseFloat(v.originalValue) - (parseFloat(v.balance) || 0)), 0);

  el.innerHTML = `
    <div class="rp-grid" style="margin-bottom:16px;">
      <div class="rp-card rp-card-green"><span class="rp-num">R$ ${ativos.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Saldo disponível</span></div>
      <div class="rp-card"><span class="rp-num">R$ ${utilizados.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Já utilizado</span></div>
      <div class="rp-card"><span class="rp-num">${vales.filter(v => v.status === 'ativo').length}</span><span class="rp-lbl">Vales ativos</span></div>
    </div>
    <div class="rp-controls">
      <div class="rp-filters">
        <input type="text" id="valeSearch" placeholder="Buscar por cliente..." oninput="App._filterVales()" style="width:170px;padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
        <select id="valeStatusFilter" onchange="App._filterVales()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos status</option>
          <option value="ativo">Ativo</option>
          <option value="utilizado">Utilizado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="App._showAddVale()">+ Novo vale</button>
      </div>
    </div>
    <div id="valeList">${this._renderValeList(vales)}</div>`;
};

App._filterVales = function() {
  let list = DB.getVales();
  const s = (document.getElementById('valeSearch').value || '').trim().toLowerCase();
  const st = document.getElementById('valeStatusFilter').value;
  if (s) list = list.filter(v => v.clientName.toLowerCase().includes(s));
  if (st) list = list.filter(v => v.status === st);
  document.getElementById('valeList').innerHTML = this._renderValeList(list);
};

App._renderValeList = function(list) {
  if (list.length === 0) return L.empty('Nenhum vale encontrado.');
  const statusLabels = { ativo: 'Ativo', utilizado: 'Utilizado', expirado: 'Expirado', cancelado: 'Cancelado' };
  const statusClasses = { ativo: 'badge-completed', utilizado: 'badge-scheduled', expirado: 'badge-cancelled', cancelado: 'badge-cancelled' };
  return '<div class="table-wrap"><table><thead><tr><th>Criação</th><th>Cliente</th><th>Original</th><th>Saldo</th><th>Status</th><th>Motivo</th><th></th></tr></thead><tbody>' +
    list.map(v => '<tr><td class="text-muted text-sm">' + (v.createdAt ? v.createdAt.slice(0, 10) : '—') + '</td><td>' + App._esc(v.clientName) + '</td><td>R$ ' + (parseFloat(v.originalValue) || 0).toFixed(2).replace('.', ',') + '</td><td><strong>R$ ' + (parseFloat(v.balance) || 0).toFixed(2).replace('.', ',') + '</strong></td><td>' + C.badge(statusLabels[v.status] || v.status, v.status) + '</td><td class="text-muted text-sm">' + App._esc(v.reason || '—') + '</td><td><div class="actions">' + (v.status === 'ativo' ? '<button class="btn btn-sm btn-danger" onclick="App._cancelVale(\'' + v.id + '\')">Cancelar</button>' : '') + '<button class="btn btn-sm" onclick="App._viewVale(\'' + v.id + '\')">Detalhes</button></div></td></tr>').join('') +
    '</tbody></table></div>';
};

App._viewVale = function(id) {
  const v = DB.getVale(id);
  if (!v) return;
  const history = (v.usageHistory || []).map(h => '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.8rem;border-bottom:1px solid var(--border-light);"><span>' + h.date + ' — ' + App._esc(h.operation) + '</span><span>R$ ' + h.amount.toFixed(2).replace('.', ',') + '</span><span class="text-muted text-sm">Saldo: R$ ' + h.remainingBalance.toFixed(2).replace('.', ',') + '</span></div>').join('') || '<div class="text-muted text-sm">Nenhuma utilização.</div>';
  this._showOverlay('Vale — ' + App._esc(v.clientName), `
    <div class="os-detail">
      <div class="os-detail-row"><span class="os-detail-label">Cliente</span><span class="os-detail-value">${App._esc(v.clientName)}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Valor original</span><span class="os-detail-value">R$ ${(parseFloat(v.originalValue) || 0).toFixed(2).replace('.', ',')}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Saldo atual</span><span class="os-detail-value">R$ ${(parseFloat(v.balance) || 0).toFixed(2).replace('.', ',')}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Status</span><span class="os-detail-value">${v.status}</span></div>
      <div class="os-detail-row"><span class="os-detail-label">Motivo</span><span class="os-detail-value">${App._esc(v.reason) || '—'}</span></div>
      ${v.expiresAt ? '<div class="os-detail-row"><span class="os-detail-label">Expira em</span><span class="os-detail-value">' + v.expiresAt + '</span></div>' : ''}
      ${v.notes ? '<div class="os-detail-row"><span class="os-detail-label">Obs</span><span class="os-detail-value">' + App._esc(v.notes) + '</span></div>' : ''}
    </div>
    <div style="margin-top:14px;"><div class="panel-section-title">Histórico de uso</div>${history}</div>
    <div class="overlay-actions" style="margin-top:14px;"><button class="btn" onclick="App._closeOverlay()">Fechar</button></div>
  `);
};

App._showAddVale = function(prefillClientId) {
  const clients = DB.getClients();
  this._showOverlay('Novo vale', `
    <div class="form-group"><label>Cliente *</label>
      <select id="valeClient"><option value="">—</option>${clients.map(c => '<option value="' + c.id + '"' + (c.id === prefillClientId ? ' selected' : '') + '>' + App._esc(c.name) + '</option>').join('')}</select>
    </div>
    <div class="form-row"><div class="form-group"><label>Valor (R$) *</label><input type="text" id="valeValue" placeholder="0,00"></div>
    <div class="form-group"><label>Data de expiração</label><input type="date" id="valeExpires"></div></div>
    <div class="form-group"><label>Motivo</label><input type="text" id="valeReason" placeholder="Ex: Pagamento antecipado, cortesia..."></div>
    <div class="form-group"><label>Observações</label><textarea id="valeNotes" rows="2"></textarea></div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._addVale()">Salvar</button></div>
  `);
};

App._addVale = function() {
  const clientSel = document.getElementById('valeClient');
  const val = document.getElementById('valeValue').value.trim().replace(',', '.');
  const value = parseFloat(val);
  if (!clientSel.value || isNaN(value) || value <= 0) return;
  const c = Repos.clientes.list().find(x => x.id === clientSel.value);
  if (!c) return;
  const expires = document.getElementById('valeExpires').value;
  DB.addVale({ clientName: c.name, clientId: c.id, value, reason: document.getElementById('valeReason').value.trim(), expiresAt: expires || null, notes: document.getElementById('valeNotes').value.trim() });
  Audit.action('create', 'vales', c.id, 'Vale de R$ ' + val + ' criado para ' + c.name);
  this._closeOverlay(); this.renderVales();
};

App._cancelVale = function(id) {
  App._confirm('Cancelar este vale?', function() {
    DB.updateVale(id, { status: 'cancelado' });
    Audit.action('cancel', 'vales', id, 'Vale cancelado');
    App._toast('Vale cancelado.', 'success');
    App.renderVales();
  });
};

// ─── Utilização de vale ───
App._useVale = function(clientId, amount, operation, refId) {
  if (!clientId || !amount || amount <= 0) return { used: [], totalUsed: 0 };
  const balance = DB.getClientValeBalance(clientId);
  if (balance <= 0) return { used: [], totalUsed: 0 };
  const useAmt = Math.min(amount, balance);
  const result = DB.useVale(clientId, useAmt, operation, refId);
  result.used.forEach(u => Audit.action('use', 'vales', u.valeId, 'Uso de R$ ' + u.amount.toFixed(2) + ' em ' + operation));
  return result;
};

// ─── Seção no perfil do cliente ───
App._renderValesSection = function(clientId, clientName) {
  const vales = DB.getValesByClient(clientId);
  const ativos = vales.filter(v => v.status === 'ativo');
  const balance = ativos.reduce((s, v) => s + (parseFloat(v.balance) || 0), 0);
  if (vales.length === 0 && balance <= 0) return '';
  let html = '<div class="panel-divider"></div><div class="panel-section">';
  html += '<div class="flex-between mb-12"><div class="panel-section-title">Vales</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="App._showAddVale(\'' + clientId + '\');App.closeClientPanel()">+ Novo vale</button></div>';
  html += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
  html += '<div style="flex:1;background:var(--surface-2);padding:8px;border-radius:4px;text-align:center;"><span style="display:block;font-size:1rem;font-weight:600;color:var(--green);">R$ ' + balance.toFixed(2).replace('.', ',') + '</span><span style="display:block;font-size:0.6rem;text-transform:uppercase;color:var(--text-muted);">Saldo disponível</span></div>';
  html += '<div style="flex:1;background:var(--surface-2);padding:8px;border-radius:4px;text-align:center;"><span style="display:block;font-size:1rem;font-weight:600;">' + ativos.length + '</span><span style="display:block;font-size:0.6rem;text-transform:uppercase;color:var(--text-muted);">Vales ativos</span></div>';
  html += '</div>';
  ativos.slice(0, 5).forEach(v => {
    html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.78rem;border-bottom:1px solid var(--border-light);">';
    html += '<span class="text-muted">' + App._esc(v.reason || 'Vale') + '</span>';
    html += '<span>R$ ' + (parseFloat(v.balance) || 0).toFixed(2).replace('.', ',') + '</span></div>';
  });
  if (ativos.length > 5) html += '<div class="text-muted text-sm" style="margin-top:4px;">+ ' + (ativos.length - 5) + ' vale(s)</div>';
  html += '</div>';
  return html;
};
