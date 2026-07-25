App._comFilter = { professional: '', status: '', type: '' };

App.renderComissoes = function() {
  const el = document.getElementById('moduleContent');
  const profs = Repos.studio.professionals.active();
  const list = DB.getComissoes();
  const totalAll = list.reduce((s, c) => s + c.commissionValue, 0);
  const totalPending = list.filter(c => c.status === 'pending').reduce((s, c) => s + c.commissionValue, 0);
  const totalPaid = list.filter(c => c.status === 'paid').reduce((s, c) => s + c.commissionValue, 0);

  el.innerHTML = `
    <div class="rp-grid" style="margin-bottom:16px;">
      <div class="rp-card"><span class="rp-num">R$ ${totalAll.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Total</span></div>
      <div class="rp-card rp-card-yellow"><span class="rp-num">R$ ${totalPending.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Pendente</span></div>
      <div class="rp-card rp-card-green"><span class="rp-num">R$ ${totalPaid.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Pago</span></div>
    </div>
    <div class="rp-controls">
      <div class="rp-filters">
        <select id="comProfFilter" onchange="App._filterComs()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos profissionais</option>
          ${profs.map(p => '<option value="' + p.id + '">' + App._esc(p.displayName) + '</option>').join('')}
        </select>
        <select id="comStatusFilter" onchange="App._filterComs()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos status</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
        </select>
        <select id="comTypeFilter" onchange="App._filterComs()" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <option value="">Todos tipos</option>
          <option value="servico">Serviço</option>
          <option value="venda">Venda</option>
        </select>
        <span id="comBulkActions" style="display:none;">
          <button class="btn btn-success btn-sm" onclick="App._paySelectedComs()">Pagar selecionadas</button>
        </span>
      </div>
    </div>
    <div id="comList">${this._renderComList(list)}</div>`;
};

App._filterComs = function() {
  let list = DB.getComissoes();
  const p = document.getElementById('comProfFilter').value;
  const s = document.getElementById('comStatusFilter').value;
  const t = document.getElementById('comTypeFilter').value;
  if (p) list = list.filter(c => c.professional === p);
  if (s) list = list.filter(c => c.status === s);
  if (t) list = list.filter(c => c.type === t);
  document.getElementById('comList').innerHTML = this._renderComList(list);
};

App._renderComList = function(list) {
  if (list.length === 0) return C.emptyState('Nenhuma comissão encontrada.');
  const selAll = list.some(c => c.status === 'pending');
  const statusLabels = { pending: 'Pendente', paid: 'Pago' };
  const statusClasses = { pending: 'badge-scheduled', paid: 'badge-completed' };

  return '<div class="table-wrap"><table><thead><tr>' + (selAll ? '<th style="width:30px;"><input type="checkbox" id="comSelAll" onchange="App._toggleAllComs(this)"></th>' : '') + '<th>Data</th><th>Profissional</th><th>Tipo</th><th>Descrição</th><th>Valor oper.</th><th>%</th><th>Comissão</th><th>Status</th><th></th></tr></thead><tbody>' +
    list.map(c => {
      const selHtml = c.status === 'pending' ? '<td><input type="checkbox" class="com-select" data-id="' + c.id + '" onchange="App._updateBulkBtn()"></td>' : '<td></td>';
      return '<tr>' + (selAll ? selHtml : '') + '<td class="text-muted text-sm">' + c.operationDate + '</td><td>' + Repos.studio.professionals.label(c.professional) + '</td><td class="text-sm">' + (c.type === 'servico' ? 'Serviço' : 'Venda') + '</td><td class="text-sm">' + App._esc(c.description) + '</td><td>R$ ' + c.operationValue.toFixed(2).replace('.', ',') + '</td><td class="text-muted text-sm">' + c.percent + '%</td><td><strong>R$ ' + c.commissionValue.toFixed(2).replace('.', ',') + '</strong></td><td>' + C.badge(statusLabels[c.status] || c.status, c.status) + '</td><td><div class="actions">' + (c.status === 'pending' ? '<button class="btn btn-sm btn-success" onclick="App._payComissao(\'' + c.id + '\')">Pagar</button>' : '') + '<button class="btn btn-sm btn-danger" onclick="App._deleteComissao(\'' + c.id + '\')">Remover</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
};

App._updateBulkBtn = function() {
  const checked = document.querySelectorAll('.com-select:checked').length;
  document.getElementById('comBulkActions').style.display = checked > 0 ? 'inline' : 'none';
};

App._toggleAllComs = function(el) {
  document.querySelectorAll('.com-select').forEach(c => c.checked = el.checked);
  this._updateBulkBtn();
};

App._paySelectedComs = function() {
  const ids = Array.from(document.querySelectorAll('.com-select:checked')).map(c => c.dataset.id);
  if (ids.length === 0) return;
  App._confirm('Pagar ' + ids.length + ' comissão(ões) selecionada(s)?', function() {
    ids.forEach(id => { DB.updateComissao(id, { status: 'paid' }); Audit.action('pay', 'comissoes', id, 'Comissão paga'); });
    App._toast(ids.length + ' comissão(ões) paga(s).', 'success');
    App.renderComissoes();
  });
};

App._payComissao = function(id) {
  App._confirm('Pagar esta comissão?', function() {
    DB.updateComissao(id, { status: 'paid' });
    Audit.action('pay', 'comissoes', id, 'Comissão paga');
    App.renderComissoes();
  });
};

App._deleteComissao = function(id) {
  App._confirm('Remover esta comissão?', function() {
    Audit.action('delete', 'comissoes', id, 'Comissão removida');
    DB.updateComissao(id, { status: 'cancelled' });
    App._toast('Comissão removida.', 'success');
    App.renderComissoes();
  });
};

// ─── Geração automática ───
App._gerarComissao = function(professional, type, refId, description, value) {
  if (!professional || !value || value <= 0) return;
  const pct = DB.getProfessionalCommission(professional);
  if (pct <= 0) return;
  const commissionValue = value * (pct / 100);
  DB.addComissao({ professional, type, refId, description, operationValue: value, percent: pct, commissionValue, operationDate: DB._today() });
  Audit.action('generate', 'comissoes', refId, 'Comissão gerada: ' + description + ' (' + pct + '%)');
};
