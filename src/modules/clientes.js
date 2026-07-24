App.renderClientes = function() {
  const container = document.getElementById('moduleContent');
  const clients = Repos.clientes.list();

  let rows = '';
  if (clients.length === 0) {
    rows = C.emptyState('Nenhum cliente encontrado.');
  } else {
    rows = `<div class="table-wrap"><table id="clientTable">
      <thead><tr><th>Nome</th><th>Telefone</th><th>Instagram</th><th>Interesse</th><th>Visitas</th><th>Última visita</th></tr></thead>
      <tbody>`;
    clients.forEach(c => {
      rows += `<tr class="clickable" data-search="${this._esc(c.name + ' ' + c.phone).toLowerCase()}" onclick="App.openClientPanel('${c.id}')">
        <td><strong>${this._esc(c.name)}</strong></td>
        <td>${this._esc(c.phone) || '—'}</td>
        <td class="text-muted text-sm">${this._esc(c.instagram) || '—'}</td>
        <td class="text-sm">${c.interest || '—'}</td>
        <td>${c.totalVisits || 0}</td>
        <td class="text-muted text-sm">${c.lastVisit || '—'}</td>
      </tr>`;
    });
    rows += `</tbody></table></div>`;
  }

  container.innerHTML = `
    <div class="module-section">
      <div class="flex-between mb-12">
        <div class="section-title">Clientes</div>
        <div class="flex gap-8">
          <div class="search-wrap">
            <span class="search-icon">&#8981;</span>
            <input type="text" id="clientSearch" placeholder="Buscar por nome ou telefone" oninput="App.searchClients()">
          </div>
          <button class="btn btn-primary btn-sm" onclick="App.showAddClient()">+ Novo</button>
        </div>
      </div>
      ${rows}
    </div>`;
};

App.searchClients = function() {
  const q = document.getElementById('clientSearch').value.trim().toLowerCase();
  const rows = document.querySelectorAll('#clientTable tbody tr');
  rows.forEach(row => {
    const text = row.dataset.search || row.textContent.toLowerCase();
    row.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
};

App.showAddClient = function() {
  this._showOverlay('Novo cliente', `
    <div class="form-group"><label>Nome *</label><input type="text" id="clientName" placeholder="Nome do cliente"></div>
    <div class="form-row">
      <div class="form-group"><label>Telefone</label><input type="text" id="clientPhone" placeholder="(71) 9XXXX-XXXX"></div>
      <div class="form-group"><label>Instagram</label><input type="text" id="clientInstagram" placeholder="@cliente"></div>
    </div>
    <div class="form-group"><label>Tipo de interesse</label>
      <select id="clientInterest"><option value="">—</option>${this._serviceOptions()}</select>
    </div>
    <div class="form-group"><label>Observações</label><textarea id="clientNotes" rows="2" placeholder="Preferências, histórico..."></textarea></div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.addClient()">Salvar</button>
    </div>
  `);
};

App.addClient = function() {
  if (!Validation.form([
    { id: 'clientName', rules: ['required'], label: 'Nome' },
    { id: 'clientPhone', rules: ['phone'], label: 'Telefone' },
    { id: 'clientInstagram', rules: ['instagram'], label: 'Instagram' },
  ])) return;
  Repos.clientes.create({
    name: document.getElementById('clientName').value.trim(),
    phone: document.getElementById('clientPhone').value.trim(),
    instagram: document.getElementById('clientInstagram').value.trim(),
    interest: document.getElementById('clientInterest').value,
    notes: document.getElementById('clientNotes').value.trim()
  });
  this._closeOverlay();
  Audit.action('create', 'clientes', '', 'Cliente cadastrado: ' + document.getElementById('clientName').value.trim());
  App._toast('Cliente cadastrado.', 'success');
  this.renderClientes();
};

App.openClientPanel = function(id) {
  this._panelClientId = id;
  const c = Repos.clientes.get(id);
  if (!c) return;
  const history = Repos.clientes.history.list(id);
  const metrics = this._clientMetrics(id);
  const timeline = this._clientTimeline(id);

  document.getElementById('panelTitle').textContent = c.name;

  // ─── Resumo ───
  let summaryHtml = '';
  if (metrics) {
    summaryHtml = `
      <div class="cp-summary-grid">
        <div class="cp-summary-item"><span class="cp-summary-val">${metrics.totalVisits}</span><span class="cp-summary-lbl">Atendimentos</span></div>
        <div class="cp-summary-item"><span class="cp-summary-val">R$ ${metrics.totalSpent.toFixed(2).replace('.', ',')}</span><span class="cp-summary-lbl">Total gasto</span></div>
        <div class="cp-summary-item"><span class="cp-summary-val">R$ ${metrics.avgTicket.toFixed(2).replace('.', ',')}</span><span class="cp-summary-lbl">Ticket médio</span></div>
        <div class="cp-summary-item"><span class="cp-summary-val">${metrics.isNew ? 'Sim' : 'Não'}</span><span class="cp-summary-lbl">Cliente novo</span></div>
        <div class="cp-summary-item ${metrics.isInactive ? 'cp-summary-warn' : ''}"><span class="cp-summary-val">${metrics.isRecurring ? 'Sim' : 'Não'}</span><span class="cp-summary-lbl">Recorrente</span></div>
        <div class="cp-summary-item ${metrics.isInactive ? 'cp-summary-warn' : ''}"><span class="cp-summary-val">${metrics.isInactive ? 'Sim' : 'Não'}</span><span class="cp-summary-lbl">Inativo +90d</span></div>
      </div>
      <div class="cp-summary-details">
        ${metrics.createdAt ? '<span>Cadastro: ' + metrics.createdAt + '</span>' : ''}
        ${metrics.lastVisit ? '<span>Último: ' + metrics.lastVisit + '</span>' : ''}
        ${metrics.avgFrequency ? '<span>Frequência: a cada ~' + metrics.avgFrequency + ' dias</span>' : ''}
        ${metrics.topService ? '<span>Top serviço: ' + this._esc(metrics.topService.name) + ' (' + metrics.topService.count + 'x)</span>' : ''}
        ${metrics.topProf ? '<span>Top profissional: ' + this._esc(metrics.topProf.name) + ' (' + metrics.topProf.count + 'x)</span>' : ''}
      </div>`;
  }

  // ─── Histórico ───
  let historyHtml = '';
  if (history.length === 0) {
    historyHtml = C.emptyState('Nenhum atendimento registrado.');
  } else {
    historyHtml = history.map(h => {
      return `<div class="history-item">
        <div class="h-top">
          <span class="h-service">${this._esc(h.service)}</span>
          <span class="h-value">${h.value ? 'R$ ' + this._esc(h.value) : '—'}</span>
        </div>
        <div class="flex-between">
          <span class="h-date">${h.date}</span>
          <span class="h-prof">${Repos.studio.professionals.label(h.professional)}</span>
        </div>
        ${h.notes ? '<div class="h-notes">' + this._esc(h.notes) + '</div>' : ''}
        <div class="actions mt-12">
          <button class="btn btn-sm btn-danger" onclick="App.deleteServiceHistory('${id}','${h.id}')">Remover</button>
        </div>
      </div>`;
    }).join('');
  }

  // ─── Linha do Tempo ───
  let timelineHtml = '';
  if (timeline.length === 0) {
    timelineHtml = C.emptyState('Nenhum evento registrado.');
  } else {
    timelineHtml = '<div class="cp-timeline">';
    timeline.forEach(e => {
      const iconMap = { cadastro: '●', agendamento: '○', cancelamento: '✕', atendimento: '✓' };
      timelineHtml += `<div class="cp-tl-item cp-tl-${e.type}">
        <span class="cp-tl-icon">${iconMap[e.type] || '·'}</span>
        <span class="cp-tl-date">${e.date}</span>
        <span class="cp-tl-label">${this._esc(e.label)}</span>
      </div>`;
    });
    timelineHtml += '</div>';
  }

  document.getElementById('panelBody').innerHTML = `
    <div class="panel-section">
      <div class="panel-section-title">Resumo</div>
      ${summaryHtml || '<div class="empty-state">Sem dados.</div>'}
    </div>

    <div class="panel-divider"></div>

    <div class="panel-section">
      <div class="panel-section-title">Dados do cliente</div>
      <div class="form-group"><label>Nome</label><input type="text" id="panelName" value="${this._esc(c.name)}"></div>
      <div class="form-row">
        <div class="form-group"><label>Telefone</label><input type="text" id="panelPhone" value="${this._esc(c.phone)}"></div>
        <div class="form-group"><label>Instagram</label><input type="text" id="panelInstagram" value="${this._esc(c.instagram)}"></div>
      </div>
      <div class="form-group"><label>Interesse</label>
        <select id="panelInterest"><option value="">—</option>${this._serviceOptions(c.interest)}</select>
      </div>
      <div class="form-group"><label>Observações</label><textarea id="panelNotes" rows="2" onblur="App._autoSaveNotes()">${this._esc(c.notes)}</textarea></div>
      <div class="flex gap-8 mt-12">
        <button class="btn btn-primary btn-sm" onclick="App.saveClientFromPanel()">Salvar dados</button>
        <button class="btn btn-sm btn-danger" onclick="App.deleteClientFromPanel()">Excluir cliente</button>
      </div>
    </div>

    <div class="panel-divider"></div>

    <div class="panel-section">
      <div class="panel-section-title">Linha do Tempo</div>
      ${timelineHtml}
    </div>

    <div class="panel-divider"></div>

    <div class="panel-section">
      <div class="flex-between mb-12">
        <div class="panel-section-title">Histórico de atendimentos</div>
        <button class="btn btn-primary btn-sm" onclick="App.showAddServiceHistory()">+ Novo</button>
      </div>
      ${historyHtml}
    </div>
    ${App._renderAnexosSection('cliente', id, c.name)}
    ${App._renderValesSection(id, c.name)}
    ${App._renderPacotesSection(id, c.name)}`;

  document.getElementById('panelOverlay').classList.add('show');
};

App.closeClientPanel = function() {
  document.getElementById('panelOverlay').classList.remove('show');
  this._panelClientId = null;
};

App.saveClientFromPanel = function() {
  const id = this._panelClientId;
  if (!id) return;
  if (!Validation.form([
    { id: 'panelName', rules: ['required'], label: 'Nome' },
    { id: 'panelPhone', rules: ['phone'], label: 'Telefone' },
    { id: 'panelInstagram', rules: ['instagram'], label: 'Instagram' },
  ])) return;
  Repos.clientes.update(id, {
    name: document.getElementById('panelName').value.trim(),
    phone: document.getElementById('panelPhone').value.trim(),
    instagram: document.getElementById('panelInstagram').value.trim(),
    interest: document.getElementById('panelInterest').value,
    notes: document.getElementById('panelNotes').value.trim()
  });
  Audit.action('update', 'clientes', id, 'Dados do cliente atualizados');
  App._toast('Cliente atualizado.', 'success');
  this.openClientPanel(id);
  this.renderClientes();
};

App.deleteClientFromPanel = function() {
  const id = this._panelClientId;
  if (!id) return;
  App._confirm('Excluir este cliente e todo seu histórico?', function() {
    Repos.clientes.remove(id);
    App.closeClientPanel();
    Audit.action('delete', 'clientes', id, 'Cliente e histórico excluídos');
    App._toast('Cliente excluído.', 'success');
    App.renderClientes();
  });
};

App.showAddServiceHistory = function() {
  const id = this._panelClientId;
  if (!id) return;
  this._showOverlay('Novo atendimento', `
    <div class="form-group"><label>Data</label><input type="date" id="histDate" value="${DB._today()}"></div>
    <div class="form-group"><label>Serviço</label>
      <select id="histService">${this._serviceOptions()}</select>
    </div>
    <div class="form-group"><label>Profissional</label>
      <select id="histProfessional">${this._professionalOptions()}</select>
    </div>
    <div class="form-group"><label>Valor cobrado (R$)</label><input type="text" id="histValue" placeholder="0,00"></div>
    <div class="form-group"><label>Observações</label><textarea id="histNotes" rows="2"></textarea></div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.addServiceHistory()">Salvar</button>
    </div>
  `);
};

App.addServiceHistory = function() {
  const id = this._panelClientId;
  if (!id) return;
  if (!Validation.form([
    { id: 'histDate', rules: ['required', 'date'], label: 'Data' },
    { id: 'histValue', rules: ['money'], label: 'Valor' },
  ])) return;
  Repos.clientes.history.create(id, {
    date: document.getElementById('histDate').value,
    service: document.getElementById('histService').value,
    professional: document.getElementById('histProfessional').value,
    value: document.getElementById('histValue').value.trim(),
    notes: document.getElementById('histNotes').value.trim()
  });
  this._closeOverlay();
  Audit.action('create', 'clientes', id, 'Atendimento registrado no histórico');
  App._toast('Atendimento registrado no histórico.', 'success');
  this.openClientPanel(id);
  this.renderClientes();
};

App.deleteServiceHistory = function(clientId, entryId) {
  App._confirm('Remover este atendimento do histórico?', function() {
    Repos.clientes.history.remove(clientId, entryId);
    App._toast('Atendimento removido do histórico.', 'success');
    App.openClientPanel(clientId);
    App.renderClientes();
  });
};

App._autoSaveNotes = function() {
  const id = this._panelClientId;
  if (!id) return;
  const notes = document.getElementById('panelNotes').value.trim();
  Repos.clientes.update(id, { notes });
  App._toast('Observações salvas.', 'success');
};
