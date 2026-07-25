App._finTab = 'dashboard';

App.renderFinanceiro = function() {
  const container = document.getElementById('moduleContent');
  const cashier = Repos.financeiro.cashier.getOpen();
  container.innerHTML = `
    <div class="et-tabs">
      <button class="btn btn-sm ${this._finTab === 'dashboard' ? 'btn-primary' : ''}" onclick="App._setFinTab('dashboard')">Dashboard</button>
      <button class="btn btn-sm ${this._finTab === 'caixa' ? 'btn-primary' : ''}" onclick="App._setFinTab('caixa')">Caixa</button>
      <button class="btn btn-sm ${this._finTab === 'lancamentos' ? 'btn-primary' : ''}" onclick="App._setFinTab('lancamentos')">Lançamentos</button>
      <button class="btn btn-sm ${this._finTab === 'pagamentos' ? 'btn-primary' : ''}" onclick="App._setFinTab('pagamentos')">Formas de Pagto</button>
      ${cashier && !cashier.closedAt ? '<button class="btn btn-sm" onclick="App._showCloseCashier()" style="background:var(--accent);color:#fff;border-color:var(--accent);">Fechar Caixa</button>' : ''}
    </div>
    <div id="finContent"></div>`;
  this._renderFinTab();
};

App._setFinTab = function(tab) { this._finTab = tab; this.renderFinanceiro(); };

App._renderFinTab = function() {
  const el = document.getElementById('finContent');
  if (this._finTab === 'dashboard') this._renderFinDashboard(el);
  else if (this._finTab === 'caixa') this._renderFinCaixa(el);
  else if (this._finTab === 'lancamentos') this._renderFinLancamentos(el);
  else if (this._finTab === 'pagamentos') this._renderFinPagamentos(el);
};

App._renderFinDashboard = function(el) {
  const today = Finance.todaySummary();
  el.innerHTML = `
    <div class="rp-section">
      <div class="section-title">Caixa ${today.cashier ? '<span class="badge badge-completed">Aberto</span>' : '<span class="badge badge-cancelled">Fechado</span>'}</div>
      <div class="rp-grid">
        <div class="rp-card ${today.balance >= 0 ? 'rp-card-green' : 'rp-card-red'}"><span class="rp-num">R$ ${today.balance.toFixed(2).replace('.',',')}</span><span class="rp-lbl">Saldo atual</span></div>
        <div class="rp-card"><span class="rp-num">R$ ${today.totalIn.toFixed(2).replace('.',',')}</span><span class="rp-lbl">Entradas</span></div>
        <div class="rp-card rp-card-red"><span class="rp-num">R$ ${today.totalOut.toFixed(2).replace('.',',')}</span><span class="rp-lbl">Saídas</span></div>
        <div class="rp-card"><span class="rp-num">R$ ${today.grossProfit.toFixed(2).replace('.',',')}</span><span class="rp-lbl">Lucro bruto</span></div>
        <div class="rp-card"><span class="rp-num">${today.transactions}</span><span class="rp-lbl">Transações</span></div>
      </div>
    </div>
    ${today.byMethod.length > 0 ? `<div class="rp-section"><div class="section-title">Por forma de pagamento</div>
      <div class="table-wrap"><table><thead><tr><th>Forma</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
      <tbody>${today.byMethod.map(m => `<tr><td>${this._esc(m.method)}</td><td>R$ ${m.entries.toFixed(2).replace('.',',')}</td><td>R$ ${m.exits.toFixed(2).replace('.',',')}</td><td>R$ ${m.total.toFixed(2).replace('.',',')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${today.byOrigin.length > 0 ? `<div class="rp-section"><div class="section-title">Por origem</div>
      <div class="table-wrap"><table><thead><tr><th>Origem</th><th>Entradas</th><th>Saídas</th></tr></thead>
      <tbody>${today.byOrigin.map(o => `<tr><td>${this._esc(o.origin)}</td><td>R$ ${o.entries.toFixed(2).replace('.',',')}</td><td>R$ ${o.exits.toFixed(2).replace('.',',')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${!today.cashier ? L.empty('Nenhum caixa aberto', 'Abra um caixa na aba "Caixa" para começar.', 'coin') : ''}`;
};

App._renderFinCaixa = function(el) {
  const cashier = Repos.financeiro.cashier.getOpen();
  const history = DB._get('caixas').filter(c => c.closedAt).sort((a, b) => b.date > a.date ? 1 : -1).slice(0, 20);
  if (cashier) {
    el.innerHTML = `<div class="card">
      <div class="section-title" style="margin-bottom:12px;">Caixa aberto</div>
      <div class="form-group"><label>Aberto em</label><span style="color:var(--text-muted);font-size:0.85rem;">${cashier.openedAt ? cashier.openedAt.slice(0, 19).replace('T', ' ') : '—'}</span></div>
      <div class="form-group"><label>Operador</label><span style="color:var(--text-muted);font-size:0.85rem;">${this._esc(cashier.openedBy)}</span></div>
      <div class="form-group"><label>Saldo inicial</label><span style="color:var(--gold);font-size:0.85rem;">R$ ${(cashier.initialBalance || 0).toFixed(2).replace('.',',')}</span></div>
      <div class="form-group"><label>Saldo atual</label><span style="color:var(--gold);font-size:1rem;font-weight:600;">R$ ${(cashier.currentBalance || 0).toFixed(2).replace('.',',')}</span></div>
      <button class="btn btn-primary mt-12" onclick="App._showCloseCashier()">Fechar caixa</button>
    </div>
    ${history.length > 0 ? `<div class="module-section"><div class="section-title">Caixas anteriores</div>
      <div class="table-wrap"><table><thead><tr><th>Data</th><th>Operador</th><th>Saldo final</th></tr></thead>
      <tbody>${history.map(c => `<tr><td class="text-muted">${c.date}</td><td>${this._esc(c.closedBy || c.openedBy)}</td><td>R$ ${(c.currentBalance || 0).toFixed(2).replace('.',',')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
  } else {
    el.innerHTML = `<div class="card">
      <div class="section-title" style="margin-bottom:12px;">Abrir caixa</div>
      <div class="form-group"><label>Operador</label><input type="text" id="cxOperator" placeholder="Nome do operador"></div>
      <div class="form-group"><label>Saldo inicial (R$)</label><input type="text" id="cxInitial" value="0,00"></div>
      <button class="btn btn-primary" onclick="App._openCashier()">Abrir caixa</button>
    </div>
    ${history.length > 0 ? `<div class="module-section"><div class="section-title">Caixas anteriores</div>
      <div class="table-wrap"><table><thead><tr><th>Data</th><th>Operador</th><th>Saldo final</th></tr></thead>
      <tbody>${history.map(c => `<tr><td class="text-muted">${c.date}</td><td>${this._esc(c.closedBy || c.openedBy)}</td><td>R$ ${(c.currentBalance || 0).toFixed(2).replace('.',',')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
  }
};

App._openCashier = function() {
  const operator = document.getElementById('cxOperator').value.trim() || 'sistema';
  const initial = parseFloat(document.getElementById('cxInitial').value.replace(',', '.')) || 0;
  const cx = Repos.financeiro.cashier.open({ operator, initialBalance: initial });
  if (cx) Audit.action('create', 'financeiro', cx.id, 'Caixa aberto por ' + operator);
  App._toast('Caixa aberto.', 'success');
  this.renderFinanceiro();
  EventBus.emit('meudia.updated');
};

App._showCloseCashier = function() {
  const today = Finance.todaySummary();
  if (!today.cashier) return;
  App._showOverlay('Fechamento de caixa', `
    <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:16px;">Confira os valores abaixo antes de encerrar. Após fechado, o caixa torna-se somente leitura.</p>
    <div class="rp-grid" style="margin-bottom:16px;">
      <div class="rp-card"><span class="rp-num">R$ ${today.totalIn.toFixed(2).replace('.',',')}</span><span class="rp-lbl">Entradas</span></div>
      <div class="rp-card rp-card-red"><span class="rp-num">R$ ${today.totalOut.toFixed(2).replace('.',',')}</span><span class="rp-lbl">Saídas</span></div>
      <div class="rp-card ${today.balance >= 0 ? 'rp-card-green' : 'rp-card-red'}"><span class="rp-num">R$ ${today.balance.toFixed(2).replace('.',',')}</span><span class="rp-lbl">Saldo esperado</span></div>
    </div>
    ${today.byMethod.map(m => `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.82rem;border-bottom:1px solid var(--border-light);"><span>${this._esc(m.method)}</span><span>R$ ${m.total.toFixed(2).replace('.',',')}</span></div>`).join('')}
    <div class="form-group" style="margin-top:12px;"><label>Valor informado em caixa (R$)</label><input type="text" id="closeInformed" value="${today.balance.toFixed(2).replace('.',',')}"></div>
    <div id="closeDiff" style="font-size:0.82rem;margin-top:4px;"></div>
    <div class="form-group" style="margin-top:12px;"><label>Observações</label><textarea id="closeNotes" rows="2"></textarea></div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App._doCloseCashier()">Confirmar fechamento</button>
    </div>
  `);
};

App._doCloseCashier = function() {
  const cashier = Repos.financeiro.cashier.getOpen();
  if (!cashier) return;
  const informed = parseFloat(document.getElementById('closeInformed').value.replace(',', '.')) || 0;
  const diff = informed - (cashier.currentBalance || 0);
  Repos.financeiro.cashier.close(cashier.id, { operator: cashier.openedBy, notes: document.getElementById('closeNotes').value.trim(), closingData: { informed, diff, byMethod: Finance.todaySummary().byMethod } });
  App._closeOverlay();
  Audit.action('update', 'financeiro', cashier.id, 'Caixa fechado. Diferença: R$ ' + diff.toFixed(2).replace('.', ','));
  App._toast('Caixa fechado. Diferença: R$ ' + diff.toFixed(2).replace('.', ','), diff === 0 ? 'success' : 'warning');
  this.renderFinanceiro();
  EventBus.emit('meudia.updated');
};

App._renderFinLancamentos = function(el) {
  const today = DB._today();
  const ledgers = Repos.financeiro.ledger.list(today);
  el.innerHTML = `
    <div class="flex gap-8 mb-12 flex-wrap">
      <button class="btn btn-primary btn-sm" onclick="App._showManualEntry('entrada')">+ Receita</button>
      <button class="btn btn-sm btn-danger" onclick="App._showManualEntry('saida')">- Despesa</button>
    </div>
    <div class="section-title">Lançamentos de hoje (${ledgers.length})</div>
    <div class="table-wrap"><table><thead><tr><th>Hora</th><th>Tipo</th><th>Origem</th><th>Descrição</th><th>Forma</th><th>Valor</th></tr></thead>
    <tbody>${ledgers.length === 0 ? '<tr><td colspan="6"><div class="empty-state">Nenhum lançamento hoje.</div></td></tr>' :
    ledgers.map(l => `<tr><td class="text-muted text-sm">${l.createdAt ? l.createdAt.slice(11, 19) : '—'}</td>
      <td><span class="badge ${l.type === 'entrada' ? 'badge-completed' : 'badge-cancelled'}">${l.type === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
      <td class="text-sm">${this._esc(l.origin)}</td>
      <td>${this._esc(l.description)}</td>
      <td class="text-muted text-sm">${l.paymentMethod || '—'}</td>
      <td style="color:${l.type === 'entrada' ? 'var(--green)' : '#f87171'};">${l.type === 'entrada' ? '' : '-'}R$ ${l.value.toFixed(2).replace('.',',')}</td>
    </tr>`).join('')}</tbody></table></div>`;
};

App._showManualEntry = function(type) {
  const methods = Repos.financeiro.paymentMethods.list();
  const label = type === 'entrada' ? 'Nova receita' : 'Nova despesa';
  this._showOverlay(label, `
    <div class="form-group"><label>Descrição</label><input type="text" id="leDesc"></div>
    <div class="form-row"><div class="form-group"><label>Valor (R$)</label><input type="text" id="leValue" placeholder="0,00"></div>
    <div class="form-group"><label>Forma de pagamento</label><select id="leMethod"><option value="">—</option>${methods.map(m => '<option value="' + App._esc(m.name) + '">' + App._esc(m.name) + '</option>').join('')}</select></div></div>
    <div class="form-group"><label>Categoria</label><input type="text" id="leCategory" placeholder="${type === 'entrada' ? 'Ex: Outras receitas' : 'Ex: Material, Água, Luz'}"></div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._addManualEntry('${type}')">Salvar</button></div>
  `);
};

App._addManualEntry = function(type) {
  const desc = document.getElementById('leDesc').value.trim();
  const val = parseFloat(document.getElementById('leValue').value.replace(',', '.')) || 0;
  if (!desc || val <= 0) return;
  Repos.financeiro.ledger.create({ type, origin: 'manual', category: document.getElementById('leCategory').value.trim() || (type === 'entrada' ? 'Outras receitas' : 'Despesas'), description: desc, value: val, paymentMethod: document.getElementById('leMethod').value });
  Audit.action('create', 'financeiro', '', (type === 'entrada' ? 'Receita' : 'Despesa') + ' manual: ' + desc);
  this._closeOverlay();
  App._toast((type === 'entrada' ? 'Receita' : 'Despesa') + ' registrada.', 'success');
  this.renderFinanceiro();
  EventBus.emit('meudia.updated');
};

App._renderFinPagamentos = function(el) {
  const methods = Repos.financeiro.paymentMethods.list();
  el.innerHTML = `
    <div class="flex-between mb-12"><div class="section-title">Formas de pagamento</div><button class="btn btn-primary btn-sm" onclick="App._showAddPaymentMethod()">+ Nova</button></div>
    <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Status</th><th></th></tr></thead>
    <tbody>${methods.map(m => `<tr><td><strong>${this._esc(m.name)}</strong></td><td><span class="badge ${m.active ? 'badge-completed' : 'badge-cancelled'}">${m.active ? 'Ativa' : 'Inativa'}</span></td>
    <td><button class="btn btn-sm ${m.active ? 'btn-warning' : 'btn-success'}" onclick="App._togglePaymentMethod('${m.id}')">${m.active ? 'Desativar' : 'Ativar'}</button></td></tr>`).join('')}</tbody></table></div>`;
};
App._showAddPaymentMethod = function() { this._showOverlay('Nova forma de pagamento', '<div class="form-group"><label>Nome</label><input type="text" id="pmName"></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._addPaymentMethod()">Salvar</button></div>'); };
App._addPaymentMethod = function() { const n = document.getElementById('pmName').value.trim(); if (!n) return; Repos.financeiro.paymentMethods.create({ name: n }); this._closeOverlay(); App._toast('Forma de pagamento adicionada.', 'success'); this.renderFinanceiro(); };
App._togglePaymentMethod = function(id) { const m = Repos.financeiro.paymentMethods.list().find(x => x.id === id); if (!m) return; Repos.financeiro.paymentMethods.update(id, { active: !m.active }); App._toast('Forma de pagamento ' + (m.active ? 'desativada' : 'ativada') + '.', 'success'); this.renderFinanceiro(); };
