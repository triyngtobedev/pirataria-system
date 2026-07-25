App.renderClientes = function() {
  const container = document.getElementById('moduleContent');
  const clients = Repos.clientes.list();

  let rows = '';
  if (clients.length === 0) {
    rows = C.emptyStateFull({icon:'person', title:'Nenhum cliente encontrado', desc:'Cadastre o primeiro cliente para começar.', btnLabel:'+ Novo cliente', btnAction:"App.showAddClient()"});
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
  if (App._locks['addClient']) return;
  if (!Validation.form([
    { id: 'clientName', rules: ['required'], label: 'Nome' },
    { id: 'clientPhone', rules: ['phone'], label: 'Telefone' },
    { id: 'clientInstagram', rules: ['instagram'], label: 'Instagram' },
  ])) return;
  App._locks['addClient'] = true;
  var c = Repos.clientes.create({
    name: document.getElementById('clientName').value.trim(),
    phone: document.getElementById('clientPhone').value.trim(),
    instagram: document.getElementById('clientInstagram').value.trim(),
    interest: document.getElementById('clientInterest').value,
    notes: document.getElementById('clientNotes').value.trim()
  });
  App._locks['addClient'] = false;
  this._closeOverlay();
  Audit.action('create', 'clientes', '', 'Cliente cadastrado: ' + document.getElementById('clientName').value.trim());
  App._toast('Cliente cadastrado.', 'success');
  Events.emit('crm.cliente_criado', { clientId: c.id });
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
    historyHtml = L.empty('Nenhum atendimento registrado', 'Os atendimentos realizados aparecerão aqui.', 'clock');
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
    timelineHtml = L.empty('Nenhum evento registrado', 'O histórico de interações com o cliente aparecerá aqui.', 'clock');
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
      ${summaryHtml || L.empty('Sem dados.')}
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
      <div class="panel-section-title">CRM — Pipeline Comercial</div>
      <div class="form-group"><label>Status</label>
        <select id="panelCrmStatus">
          ${function(){ var s = c.crmStatus || 'novo_contato'; return Object.keys(CRM.STATUS_LABELS).map(function(k){ return '<option value="' + k + '"' + (s === k ? ' selected' : '') + '>' + CRM.STATUS_LABELS[k] + '</option>'; }).join(''); }()}
        </select>
      </div>
      <div class="form-group"><label>Pr\u00f3xima a\u00e7\u00e3o</label>
        <input type="text" id="panelCrmAction" value="${this._esc(c.crmNextAction || '')}" placeholder="Ex: Cobrar retorno">
      </div>
      <div class="form-row">
        <div class="form-group"><label>Data</label>
          <input type="date" id="panelCrmDate" value="${c.crmNextDate || ''}">
        </div>
        <div class="form-group"><label>Prioridade</label>
          <select id="panelCrmPriority">
            <option value="high" ${(c.crmPriority||'medium') === 'high' ? 'selected' : ''}>Alta</option>
            <option value="medium" ${(c.crmPriority||'medium') === 'medium' ? 'selected' : ''}>M\u00e9dia</option>
            <option value="low" ${(c.crmPriority||'medium') === 'low' ? 'selected' : ''}>Baixa</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Observa\u00e7\u00e3o</label>
        <input type="text" id="panelCrmNote" value="${this._esc(c.crmNote || '')}" placeholder="Ex: Escolhendo joia">
      </div>
      <div class="flex gap-8 mt-12">
        <button class="btn btn-primary btn-sm" onclick="App.saveCRMFromPanel()">Salvar CRM</button>
        <button class="btn btn-sm" onclick="App.clearCRMNextAction()">Limpar a\u00e7\u00e3o</button>
      </div>
      <div class="flex gap-8 mt-12" style="flex-wrap:wrap;">
        <button class="btn btn-sm" onclick="App.navigate('agenda')" style="color:var(--gold);">Agendar retorno</button>
        <button class="btn btn-sm" onclick="App.navigate('agenda')">Abrir agenda</button>
        <button class="btn btn-sm" onclick="App.navigate('atendimento')">Abrir atendimento</button>
        <button class="btn btn-sm" onclick="App.navigate('financeiro')">Ver financeiro</button>
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
    ${App._renderPlanosSection(id, c)}
    ${App._renderAnexosSection('cliente', id, c.name)}
    ${App._renderValesSection(id, c.name)}
    ${App._renderPacotesSection(id, c.name)}`;

  document.getElementById('panelOverlay').classList.add('show');
  setTimeout(function() {
    document.querySelectorAll('#panelBody input, #panelBody select, #panelBody textarea').forEach(function(el) {
      el.addEventListener('input', function() { App._markDirty(); });
      el.addEventListener('change', function() { App._markDirty(); });
    });
  }, 10);
};

App.closeClientPanel = function() {
  document.getElementById('panelOverlay').classList.remove('show');
  this._panelClientId = null;
  App._markClean();
};

App.saveClientFromPanel = function() {
  if (App._locks['saveClient']) return;
  const id = this._panelClientId;
  if (!id) return;
  if (!Validation.form([
    { id: 'panelName', rules: ['required'], label: 'Nome' },
    { id: 'panelPhone', rules: ['phone'], label: 'Telefone' },
    { id: 'panelInstagram', rules: ['instagram'], label: 'Instagram' },
  ])) return;
  App._locks['saveClient'] = true;
  Repos.clientes.update(id, {
    name: document.getElementById('panelName').value.trim(),
    phone: document.getElementById('panelPhone').value.trim(),
    instagram: document.getElementById('panelInstagram').value.trim(),
    interest: document.getElementById('panelInterest').value,
    notes: document.getElementById('panelNotes').value.trim()
  });
  App._locks['saveClient'] = false;
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

App.saveCRMFromPanel = function() {
  const id = this._panelClientId;
  if (!id) return;
  var status = document.getElementById('panelCrmStatus').value;
  var action = document.getElementById('panelCrmAction').value.trim();
  var date = document.getElementById('panelCrmDate').value;
  var priority = document.getElementById('panelCrmPriority').value;
  var note = document.getElementById('panelCrmNote').value.trim();
  CRM.setStatus(id, status);
  CRM.setNextAction(id, action, date, priority, note);
  App._toast('CRM atualizado.', 'success');
  this.openClientPanel(id);
  this.renderClientes();
  App.refreshHoje();
};

App.clearCRMNextAction = function() {
  const id = this._panelClientId;
  if (!id) return;
  CRM.clearNextAction(id);
  App._toast('Pr\u00f3xima a\u00e7\u00e3o limpa.', 'success');
  this.openClientPanel(id);
  this.renderClientes();
  App.refreshHoje();
};

App._renderPlanosSection = function(id, c) {
  var planos = DB.getPlanosByClient(id);
  if (planos.length === 0) return '';

  var html = '<div class="panel-divider"></div><div class="panel-section"><div class="panel-section-title">Acompanhamentos</div>';
  for (var i = 0; i < planos.length; i++) {
    var p = planos[i];
    var etapas = DB.getEtapas(p.id);
    var concluidas = etapas.filter(function(e) { return e.status === 'concluida'; }).length;
    var total = etapas.length;
    var pct = total > 0 ? Math.round(concluidas / total * 100) : 0;
    var statusCls = p.status === 'ativo' ? 'badge-progress' : p.status === 'concluido' ? 'badge-completed' : 'badge-cancelled';
    var statusLabel = p.status === 'ativo' ? 'Ativo' : p.status === 'concluido' ? 'Conclu\u00eddo' : 'Cancelado';

    html += '<div style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:8px;">' +
      '<div class="flex-between" style="margin-bottom:4px;"><span><strong>' + App._esc(p.procedimento) + '</strong></span><span class="badge ' + statusCls + '">' + statusLabel + '</span></div>' +
      '<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;">' + (p.profissional ? App._esc(p.profissional) + ' \u2022 ' : '') + p.dataProcedimento + ' \u2022 ' + concluidas + '/' + total + ' etapas</div>';

    if (total > 0) {
      html += '<div style="height:4px;background:var(--border);border-radius:2px;margin-bottom:8px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:' + (pct === 100 ? 'var(--green)' : 'var(--gold)') + ';border-radius:2px;transition:width 0.3s;"></div></div>';
    }

    etapas.forEach(function(e) {
      var eStatusCls = e.status === 'concluida' ? 'badge-completed' : e.status === 'ignorada' ? 'badge-cancelled' : 'badge-scheduled';
      var eStatusLabel = e.status === 'concluida' ? '\u2713' : e.status === 'ignorada' ? '\u2717' : '\u25CB';
      var eBtn = '';
      if (e.status === 'pendente') {
        eBtn = '<button class="btn btn-sm" style="font-size:0.65rem;padding:2px 6px;" onclick="PosAtendimento.concluirEtapa(\'' + e.id + '\',\'\');App.openClientPanel(\'' + id + '\');App.refreshHoje();">Concluir</button>';
      }
      var atrasada = e.status === 'pendente' && e.dataPrevista && e.dataPrevista < DB._today() ? ' style="color:var(--accent-hover);"' : '';
      html += '<div class="flex-between" style="padding:4px 0;font-size:0.78rem;border-bottom:1px solid var(--border-light);"' + atrasada + '>' +
        '<span><span class="badge ' + eStatusCls + '" style="font-size:0.6rem;padding:1px 5px;margin-right:6px;">' + eStatusLabel + '</span>' + e.label + (e.dataPrevista ? ' (' + e.dataPrevista + ')' : '') + '</span>' +
        '<span>' + eBtn + '</span>' +
      '</div>';
    });

    html += '</div>';
  }
  html += '</div>';
  return html;
};

App._autoSaveNotes = function() {
  const id = this._panelClientId;
  if (!id) return;
  const notes = document.getElementById('panelNotes').value.trim();
  Repos.clientes.update(id, { notes });
  App._toast('Observações salvas.', 'success');
};
