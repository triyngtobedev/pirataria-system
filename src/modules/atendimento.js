App.renderAtendimento = function() {
  const container = document.getElementById('moduleContent');
  const today = DB._today();

  const agendaApps = Repos.agenda.byDate(today)
    .filter(a => a.status !== 'cancelled')
    .sort((a, b) => a.time > b.time ? 1 : -1);
  const allAgendaApps = Repos.agenda.byDate(today);
  const walkins = Repos.atendimento.queue.list();
  const revenue = Repos.atendimento.revenueToday();

  const waiting = agendaApps.filter(a => a.status === 'pending' || a.status === 'confirmed');
  const inProgress = agendaApps.filter(a => a.status === 'in_progress');
  const done = agendaApps.filter(a => a.status === 'completed');
  const walkinWaiting = walkins.filter(q => q.status === 'waiting');
  const walkinProgress = walkins.filter(q => q.status === 'in_progress');
  const walkinDone = walkins.filter(q => q.status === 'done');

  container.innerHTML = `
    <div class="od-wrap">${this._renderDashboardHtml()}</div>

    <div class="qs-summary">
      <div class="qs-stat"><span class="qs-num">${allAgendaApps.length + walkins.length}</span>Total</div>
      <div class="qs-stat"><span class="qs-num qs-yellow">${waiting.length + walkinWaiting.length}</span>Aguardando</div>
      <div class="qs-stat"><span class="qs-num qs-red">${inProgress.length + walkinProgress.length}</span>Atendendo</div>
      <div class="qs-stat"><span class="qs-num qs-green">${done.length + walkinDone.length}</span>Concluídos</div>
      <div class="qs-stat"><span class="qs-num qs-gold">R$ ${revenue.toFixed(2).replace('.', ',')}</span>Faturamento</div>
    </div>

    <div class="qs-agenda">
      ${C.sectionHeader('Agendamentos de hoje')}
      ${agendaApps.length === 0 ? '<div class="empty-state">Nenhum agendamento para hoje.</div>' : ''}
      <div class="qs-list">${agendaApps.map(a => this._renderQueueItem(a, 'agenda')).join('')}</div>
    </div>

    <div class="qs-walkin">
      ${C.sectionHeader('Avulsos', '<button class="btn btn-primary" onclick="App.showAddToQueue()">+ Adicionar avulso</button>')}
      ${walkins.length === 0 ? '<div class="empty-state">Nenhum cliente avulso.</div>' : ''}
      <div class="qs-list">${walkins.map(q => this._renderQueueItem(q, 'walkin')).join('')}</div>
    </div>`;
};

App._renderQueueItem = function(item, type) {
  const isAppointment = type === 'agenda';
  const status = item.status;
  const isDone = status === 'completed' || status === 'done';
  const isProgress = status === 'in_progress';

  let statusIcon = '<span class="qs-badge qs-pending">Aguardando</span>';
  if (isProgress) statusIcon = '<span class="qs-badge qs-progress">Em atendimento</span>';
  if (isDone) statusIcon = '<span class="qs-badge qs-done">Concluído</span>';

  let actionHtml = '';
  if (!isDone) {
    if (!isProgress) {
      actionHtml += `<button class="btn qs-btn qs-btn-start" onclick="App.queueStart('${item.id}','${type}')">Iniciar</button>`;
    } else {
      actionHtml += `<button class="btn qs-btn qs-btn-finish" onclick="App.queueFinish('${item.id}','${type}')">Concluir</button>`;
    }
    actionHtml += `<button class="btn qs-btn qs-btn-cancel" onclick="App.queueCancel('${item.id}','${type}')">Cancelar</button>`;
  }

  const timeDisplay = isAppointment ? `<div class="qs-time">${item.time}</div>` : '<div class="qs-time" style="color:var(--text-dim);">Avulso</div>';
  const profDisplay = isAppointment && item.professional ? ` — ${Repos.studio.professionals.label(item.professional)}` : '';
  const notesDisplay = item.notes ? `<div class="qs-notes">${this._esc(item.notes)}</div>` : '';
  const postNotesDisplay = item.postNotes ? `<div class="qs-postnotes">${this._esc(item.postNotes)}</div>` : '';
  const valueDisplay = item.value ? `<span class="qs-value">R$ ${this._esc(item.value)}</span>` : '';

  return `
    <div class="qs-card ${status === 'cancelled' ? 'qs-cancelled' : ''}">
      ${timeDisplay}
      <div class="qs-body">
        <div class="qs-row1">
          <span class="qs-name">${this._esc(item.clientName)}</span>
          <span class="qs-service">${this._esc(item.service)}${profDisplay}</span>
        </div>
        <div class="qs-row2">
          ${statusIcon}
          ${isDone ? valueDisplay : ''}
        </div>
        ${notesDisplay}
        ${postNotesDisplay}
      </div>
      <div class="qs-actions">${actionHtml}</div>
    </div>`;
};

App.queueStart = function(id, type) {
  if (type === 'agenda') {
    Repos.agenda.update(id, { status: 'in_progress' });
  } else {
    Repos.atendimento.queue.updateStatus(id, 'in_progress');
  }
  this.renderAtendimento();
};

App.queueFinish = function(id, type) {
  if (type === 'agenda') {
    const a = Repos.agenda.list().find(x => x.id === id);
    if (!a) return;
    this._showOverlay('Concluir atendimento', `
      <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:16px;">
        Finalizar atendimento de <strong>${this._esc(a.clientName)}</strong>
      </p>
      <div class="form-group"><label>Valor cobrado (R$)</label><input type="text" id="finishValue" placeholder="0,00" value="${a.value || ''}"></div>
      <div class="form-group"><label>Observações pós-atendimento</label><textarea id="finishPostNotes" rows="2">${a.postNotes || ''}</textarea></div>
      <div class="form-group">
        <label><input type="checkbox" id="finishRegHistory" ${a.clientId ? 'checked' : ''}> Registrar no histórico do cliente</label>
      </div>
      <div class="overlay-actions">
        <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.doFinishAppointment('${id}')">Concluir</button>
      </div>
    `);
  } else {
    const q = Repos.atendimento.queue.list().find(x => x.id === id);
    if (!q) return;
    this._showOverlay('Concluir avulso', `
      <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:16px;">
        Finalizar atendimento de <strong>${this._esc(q.clientName)}</strong>
      </p>
      <div class="form-group"><label>Valor cobrado (R$)</label><input type="text" id="finishValue" placeholder="0,00"></div>
      <div class="form-group"><label>Observações pós-atendimento</label><textarea id="finishPostNotes" rows="2"></textarea></div>
      <div class="overlay-actions">
        <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.doFinishWalkin('${id}')">Concluir</button>
      </div>
    `);
  }
};

App.doFinishAppointment = function(id) {
  if (!Validation.form([
    { id: 'finishValue', rules: ['money'], label: 'Valor' },
  ])) return;
  const value = document.getElementById('finishValue').value.trim();
  const valNum = parseFloat(value.replace(',', '.')) || 0;
  const postNotes = document.getElementById('finishPostNotes').value.trim();
  const regHistory = document.getElementById('finishRegHistory').checked;
  Repos.agenda.update(id, { status: 'completed', value, postNotes });

  if (regHistory) {
    const a = Repos.agenda.list().find(x => x.id === id);
    if (a && a.clientId) {
      Repos.clientes.history.create(a.clientId, {
        date: a.date,
        service: a.service,
        professional: a.professional,
        value,
        notes: postNotes
      });
    }
  }
  const aAfter = Repos.agenda.get(id);
  App._gerarComissao((aAfter || {}).professional, 'servico', id, 'Atendimento: ' + ((aAfter || {}).clientName), valNum);
  if (aAfter) App._checkPacoteEUsar(aAfter.clientId, aAfter.service, id, aAfter.professional);
  Events.emit('atendimento.finished', { id, type: 'agenda', clientName: (aAfter || {}).clientName, value: valNum });
  Audit.action('complete', 'atendimento', id, 'Atendimento concluído');
  this._closeOverlay();
  if (aAfter) App._promptGerarOS({ id, type: 'agenda', clientName: aAfter.clientName, service: aAfter.service, professional: aAfter.professional, value, notes: postNotes });
  App._toast('Atendimento concluído.', 'success');
  this.renderAtendimento();
};

App.doFinishWalkin = function(id) {
  if (!Validation.form([
    { id: 'finishValue', rules: ['money'], label: 'Valor' },
  ])) return;
  const value = document.getElementById('finishValue').value.trim();
  const valNum = parseFloat(value.replace(',', '.')) || 0;
  const postNotes = document.getElementById('finishPostNotes').value.trim();
  const qWalkin = Repos.atendimento.queue.list().find(x => x.id === id);
  App._gerarComissao(qWalkin ? qWalkin.professional : '', 'servico', id, 'Avulso: ' + (qWalkin ? qWalkin.clientName : ''), valNum);
  Repos.atendimento.queue.updateEntry(id, { status: 'done', value, postNotes });
  Events.emit('atendimento.finished', { id, type: 'walkin', clientName: (qWalkin || {}).clientName, value: valNum });
  Audit.action('complete', 'atendimento', id, 'Avulso concluído');
  const q = Repos.atendimento.queue.list().find(x => x.id === id);
  if (q) App._promptGerarOS({ id, type: 'walkin', clientName: q.clientName, service: q.service, professional: q.professional, value, notes: postNotes });
  this._closeOverlay();
  App._toast('Atendimento concluído.', 'success');
  this.renderAtendimento();
};

App.queueCancel = function(id, type) {
  App._confirm('Cancelar este atendimento?', function() {
    if (type === 'agenda') { Repos.agenda.update(id, { status: 'cancelled' }); }
    else { Repos.atendimento.queue.remove(id); }
    App._toast('Atendimento cancelado.', 'info');
    App.renderAtendimento();
  });
};

App.showAddToQueue = function() {
  this._showOverlay('Adicionar avulso', `
    <div class="form-group"><label>Cliente</label><input type="text" id="queueClientName" placeholder="Nome do cliente"></div>
    <div class="form-row">
      <div class="form-group"><label>Serviço</label>
        <select id="queueService">${this._serviceOptions()}</select>
      </div>
      <div class="form-group"><label>Profissional</label>
        <select id="queueProfessional">${this._professionalOptions(null, true)}</select>
      </div>
    </div>
    <div class="form-group"><label>Observações</label><textarea id="queueNotes" rows="2"></textarea></div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.addToQueue()">Adicionar</button>
    </div>
  `);
};

App.addToQueue = function() {
  const name = document.getElementById('queueClientName').value.trim();
  if (!name) { Validation._showError('queueClientName', 'Nome é obrigatório.'); return; }
  Repos.atendimento.queue.add({
    clientName: name,
    service: document.getElementById('queueService').value,
    professional: document.getElementById('queueProfessional').value,
    notes: document.getElementById('queueNotes').value.trim()
  });
  this._closeOverlay();
  App._toast('Avulso adicionado à fila.', 'success');
  this.renderAtendimento();
};
