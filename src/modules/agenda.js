App._getWeekDates = function() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() + this._weekOffset * 7);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(start);
  monday.setDate(diff);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
};

App._fmtDate = function(date) {
  return date.toISOString().slice(0, 10);
};

App._fmtBr = function(date) {
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
};

App._fmtBrFull = function(date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

App._dayName = function(date) {
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return names[date.getDay()];
};

App.renderAgenda = function() {
  const container = document.getElementById('moduleContent');
  container.innerHTML = `
    ${App._renderLembretePanel()}
    <div class="cal-toolbar">
      <div class="cal-nav">
        <button class="btn btn-sm" onclick="App._weekNav(-1)">&lt;</button>
        <span class="cal-range" id="calRange"></span>
        <button class="btn btn-sm" onclick="App._weekNav(1)">&gt;</button>
        <button class="btn btn-sm" onclick="App._weekNav(0)" style="margin-left:4px;">Hoje</button>
      </div>
      <div class="cal-filters">
        <div class="view-toggle">
          <button class="btn btn-sm active" data-view="week" onclick="App._setView('week')">Semana</button>
          <button class="btn btn-sm" data-view="day" onclick="App._setView('day')">Dia</button>
        </div>
        <select id="profFilter" onchange="App._onProfFilter()">
          <option value="todos">Todos</option>
          ${Repos.studio.professionals.active().map(p => `<option value="${p.id}">${this._esc(p.displayName)}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" onclick="App.showAddAppointment()">+ Novo</button>
      </div>
    </div>
    <div id="calView"></div>
    <div id="dayView" class="day-view"></div>`;
  this._renderWeek();
};

App._weekNav = function(dir) {
  if (dir === 0) {
    this._weekOffset = 0;
    this._focusedDay = DB._today();
    if (this._agendaView === 'day') { this._renderDayView(); return; }
  } else {
    this._weekOffset += dir;
    this._focusedDay = null;
  }
  this._renderWeek();
};

App._setView = function(view) {
  this._agendaView = view;
  document.querySelectorAll('.view-toggle .btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view)
  );
  document.getElementById('dayView').classList.toggle('show', view === 'day');
  if (view === 'day' && !this._focusedDay) {
    this._focusedDay = DB._today();
  }
  if (view === 'week') this._renderWeek();
  else this._renderDayView();
};

App._onProfFilter = function() {
  this._profFilter = document.getElementById('profFilter').value;
  if (this._agendaView === 'week') this._renderWeek();
  else this._renderDayView();
};

App._renderWeek = function() {
  const dates = this._getWeekDates();
  const start = this._fmtDate(dates[0]);
  const end = this._fmtDate(dates[6]);
  const today = DB._today();

  document.getElementById('calRange').textContent =
    `${this._fmtBr(dates[0])} — ${this._fmtBr(dates[6])}`;

  let all = Repos.agenda.byDateRange(start, end);
  if (this._profFilter && this._profFilter !== 'todos') {
    all = all.filter(a => a.professional === this._profFilter);
  }

  const byDate = {};
  all.forEach(a => {
    if (!byDate[a.date]) byDate[a.date] = [];
    byDate[a.date].push(a);
  });

  let grid = '<div class="week-grid">';
  dates.forEach(d => {
    const ds = this._fmtDate(d);
    const isToday = ds === today;
    const dayApps = byDate[ds] || [];
    dayApps.sort((a, b) => a.time > b.time ? 1 : -1);

    grid += `<div class="wg-day${isToday ? ' today' : ''}">
      <div class="wg-header" onclick="App._focusDay('${ds}')">
        <div class="wg-day-name">${this._dayName(d)}</div>
        <div class="wg-day-num">${d.getDate()}</div>
      </div>
      <div class="wg-cards">`;
    if (dayApps.length) {
      dayApps.forEach(a => {
        grid += `<div class="wg-card ${a.status}" onclick="event.stopPropagation();App.editAppointment('${a.id}')">
          <div class="wg-time">${a.time}${a.duration ? ' (' + a.duration + '\')' : ''}</div>
          <div class="wg-client">${this._esc(a.clientName)}</div>
          <div class="wg-service">${this._esc(a.service)}</div>
          <div class="wg-prof">${Repos.studio.professionals.label(a.professional)}</div>
        </div>`;
      });
    }
    grid += `</div></div>`;
  });
  grid += '</div>';
  document.getElementById('calView').innerHTML = grid;

  if (this._agendaView === 'day' && this._focusedDay) {
    this._renderDayView();
  } else {
    document.getElementById('dayView').classList.remove('show');
  }
};

App._focusDay = function(date) {
  this._focusedDay = date;
  this._agendaView = 'day';
  document.querySelectorAll('.view-toggle .btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === 'day')
  );
  document.getElementById('dayView').classList.add('show');
  this._renderDayView();
};

App._renderDayView = function() {
  const dayEl = document.getElementById('dayView');
  if (!this._focusedDay) { dayEl.classList.remove('show'); return; }

  const d = new Date(this._focusedDay + 'T12:00:00');
  const today = DB._today();
  const isToday = this._focusedDay === today;

  let apps = Repos.agenda.byDate(this._focusedDay);
  if (this._profFilter && this._profFilter !== 'todos') {
    apps = apps.filter(a => a.professional === this._profFilter);
  }
  apps.sort((a, b) => a.time > b.time ? 1 : -1);

  let listHtml = '';
  if (apps.length === 0) {
    listHtml = C.emptyState('Nenhum agendamento para este dia.');
  } else {
    listHtml = '<div class="dv-list">';
    apps.forEach(a => {
      const statusBtn = a.status === 'pending'
        ? `<button class="btn btn-sm btn-success" onclick="App.confirmAppointment('${a.id}')">Confirmar</button>`
        : '';
      const completeBtn = a.status === 'confirmed' || a.status === 'pending'
        ? `<button class="btn btn-sm btn-success" onclick="App.completeAppointment('${a.id}')">Concluir</button>`
        : '';
      listHtml += `<div class="dv-card">
        <div class="dv-time">${a.time}</div>
        <div class="dv-body">
          <div class="dv-client">${this._esc(a.clientName)}</div>
          <div class="dv-details">${this._esc(a.service)}${a.professional ? ' — ' + Repos.studio.professionals.label(a.professional) : ''}${a.duration ? ' — ' + a.duration + 'min' : ''}</div>
          <div class="flex gap-8 mt-12" style="align-items:center;">
            <span class="badge badge-${a.status === 'completed' ? 'completed' : a.status === 'confirmed' ? 'confirmed' : a.status === 'cancelled' ? 'cancelled' : 'scheduled'}">${STATUS_LABELS[a.status] || a.status}</span>
          </div>
          ${a.notes ? '<div class="dv-notes">' + this._esc(a.notes) + '</div>' : ''}
        </div>
        <div class="dv-actions">
          ${statusBtn}
          ${completeBtn}
          <button class="btn btn-sm" onclick="App.editAppointment('${a.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="App.deleteAppointment('${a.id}')">Remover</button>
        </div>
      </div>`;
    });
    listHtml += '</div>';
  }

  dayEl.innerHTML = `
    <div class="dv-header">
      <h3>${isToday ? 'Hoje' : this._fmtBrFull(d)}</h3>
      <button class="btn btn-sm" onclick="App.showAddAppointment('${this._focusedDay}')">+ Novo</button>
    </div>
    ${listHtml}`;
  dayEl.classList.add('show');
};

App.showAddAppointment = function(prefillDate) {
  const clients = Repos.clientes.list();
  const clientOpts = clients.map(c =>
    `<option value="${this._esc(c.id)}">${this._esc(c.name)}${c.phone ? ' — ' + this._esc(c.phone) : ''}</option>`
  ).join('');

  this._showOverlay('Novo agendamento', `
    <div class="form-group"><label>Cliente</label>
      <div class="client-select-row">
        <select id="agendaClientId" onchange="App._onClientSelect()">
          <option value="">— Selecione um cliente —</option>
          ${clientOpts}
          <option value="__new__">+ Criar novo cliente</option>
        </select>
      </div>
    </div>
    <div id="agendaNewClientFields" style="display:none;">
      <div class="form-row">
        <div class="form-group"><label>Nome *</label><input type="text" id="agendaNewName" placeholder="Nome"></div>
        <div class="form-group"><label>Telefone</label><input type="text" id="agendaNewPhone" placeholder="Telefone"></div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Data</label><input type="date" id="agendaDate" value="${prefillDate || DB._today()}"></div>
      <div class="form-group"><label>Hora</label><input type="time" id="agendaTime" value="10:00"></div>
      <div class="form-group"><label>Duração (min)</label><input type="number" id="agendaDuration" value="60" min="15" step="15"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Serviço</label>
        <select id="agendaService">${this._serviceOptions()}</select>
      </div>
      <div class="form-group"><label>Profissional</label>
        <select id="agendaProfessional">${this._professionalOptions()}</select>
      </div>
    </div>
    <div class="form-group"><label>Observações</label><textarea id="agendaNotes" rows="2"></textarea></div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.addAppointment()">Salvar</button>
    </div>
  `);
};

App._onClientSelect = function() {
  const val = document.getElementById('agendaClientId').value;
  const newFields = document.getElementById('agendaNewClientFields');
  newFields.style.display = val === '__new__' ? 'block' : 'none';
};

App.addAppointment = function() {
  const sel = document.getElementById('agendaClientId');
  if (!sel.value) return;

  if (!Validation.form([
    { id: 'agendaDate', rules: ['required', 'date'], label: 'Data' },
    { id: 'agendaTime', rules: ['required', 'time'], label: 'Hora' },
    { id: 'agendaDuration', rules: ['required', 'duration'], label: 'Duração' },
  ])) return;

  if (sel.value === '__new__') {
    const name = document.getElementById('agendaNewName').value.trim();
    if (!name) { Validation._showError('agendaNewName', 'Nome é obrigatório.'); return; }
    const c = Repos.clientes.create({ name, phone: document.getElementById('agendaNewPhone').value.trim(), interest: document.getElementById('agendaService').value });
    Repos.agenda.create({
      clientId: c.id, clientName: c.name,
      date: document.getElementById('agendaDate').value,
      time: document.getElementById('agendaTime').value,
      duration: document.getElementById('agendaDuration').value,
      service: document.getElementById('agendaService').value,
      professional: document.getElementById('agendaProfessional').value,
      notes: document.getElementById('agendaNotes').value.trim()
    });
  } else {
    const c = Repos.clientes.get(sel.value);
    if (!c) return;
    Repos.agenda.create({
      clientId: c.id, clientName: c.name,
      date: document.getElementById('agendaDate').value,
      time: document.getElementById('agendaTime').value,
      duration: document.getElementById('agendaDuration').value,
      service: document.getElementById('agendaService').value,
      professional: document.getElementById('agendaProfessional').value,
      notes: document.getElementById('agendaNotes').value.trim()
    });
  }
  this._closeOverlay();
  Audit.action('create', 'agenda', '', 'Agendamento criado para ' + (Repos.agenda.list().slice(-1)[0] || {}).clientName);
  App._toast('Agendamento criado com sucesso.', 'success');
  this.renderAgenda();
};

App.editAppointment = function(id) {
  const appointments = Repos.agenda.list();
  const a = appointments.find(x => x.id === id);
  if (!a) return;

  this._showOverlay('Editar agendamento', `
    <div class="form-group"><label>Cliente</label><input type="text" id="agendaClientName" value="${this._esc(a.clientName)}" readonly style="opacity:0.6;"></div>
    <div class="form-row">
      <div class="form-group"><label>Data</label><input type="date" id="agendaDate" value="${a.date}"></div>
      <div class="form-group"><label>Hora</label><input type="time" id="agendaTime" value="${a.time}"></div>
      <div class="form-group"><label>Duração (min)</label><input type="number" id="agendaDuration" value="${a.duration || '60'}" min="15" step="15"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Serviço</label>
        <select id="agendaService">${this._serviceOptions(a.service)}</select>
      </div>
      <div class="form-group"><label>Profissional</label>
        <select id="agendaProfessional">${this._professionalOptions(a.professional)}</select>
      </div>
    </div>
    <div class="form-group"><label>Status</label>
      <select id="agendaStatus"><option value="pending" ${a.status === 'pending' ? 'selected' : ''}>Pendente</option><option value="confirmed" ${a.status === 'confirmed' ? 'selected' : ''}>Confirmado</option><option value="completed" ${a.status === 'completed' ? 'selected' : ''}>Concluído</option><option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>Cancelado</option></select>
    </div>
    <div class="form-group"><label>Observações</label><textarea id="agendaNotes" rows="2">${this._esc(a.notes)}</textarea></div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.updateAppointment('${id}')">Salvar</button>
    </div>
  `);
};

App.updateAppointment = function(id) {
  if (!Validation.form([
    { id: 'agendaDate', rules: ['required', 'date'], label: 'Data' },
    { id: 'agendaTime', rules: ['required', 'time'], label: 'Hora' },
    { id: 'agendaDuration', rules: ['required', 'duration'], label: 'Duração' },
  ])) return;
  Repos.agenda.update(id, {
    clientName: document.getElementById('agendaClientName').value.trim(),
    date: document.getElementById('agendaDate').value,
    time: document.getElementById('agendaTime').value,
    duration: document.getElementById('agendaDuration').value,
    service: document.getElementById('agendaService').value,
    professional: document.getElementById('agendaProfessional').value,
    status: document.getElementById('agendaStatus').value,
    notes: document.getElementById('agendaNotes').value.trim()
  });
  this._closeOverlay();
  Audit.action('update', 'agenda', id, 'Agendamento atualizado');
  App._toast('Agendamento atualizado.', 'success');
  this.renderAgenda();
};

App.confirmAppointment = function(id) {
  Repos.agenda.update(id, { status: 'confirmed' });
  Audit.action('update', 'agenda', id, 'Agendamento confirmado');
  App._toast('Agendamento confirmado.', 'success');
  this.renderAgenda();
};

App.completeAppointment = function(id) {
  const a = Repos.agenda.list().find(x => x.id === id);
  if (!a) return;

  this._showOverlay('Concluir atendimento', `
    <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:16px;">
      Agendamento de <strong>${this._esc(a.clientName)}</strong> em ${a.date} às ${a.time}.
    </p>
    <div class="form-group">
      <label><input type="checkbox" id="completeRegHistory" checked> Registrar no histórico do cliente</label>
    </div>
    <div id="completeHistoryFields">
      <div class="form-row">
        <div class="form-group"><label>Valor cobrado (R$)</label><input type="text" id="completeValue" placeholder="0,00"></div>
        <div class="form-group"><label>Profissional</label>
          <select id="completeProfessional">${this._professionalOptions(a.professional)}</select>
        </div>
      </div>
      <div class="form-group"><label>Observações do atendimento</label><textarea id="completeNotes" rows="2">${this._esc(a.notes)}</textarea></div>
    </div>
    <div class="overlay-actions">
      <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
      <button class="btn btn-primary" onclick="App.doComplete('${id}')">Concluir</button>
    </div>
  `);

  document.getElementById('completeRegHistory').addEventListener('change', function() {
    document.getElementById('completeHistoryFields').style.display = this.checked ? 'block' : 'none';
  });
};

App.doComplete = function(id) {
  const a = Repos.agenda.list().find(x => x.id === id);
  if (!a) return;

  Repos.agenda.update(id, { status: 'completed' });

  if (document.getElementById('completeRegHistory').checked) {
    const clientId = a.clientId;
    if (clientId) {
      DB.addServiceHistory(clientId, {
        date: a.date,
        service: a.service,
        professional: document.getElementById('completeProfessional').value,
        value: document.getElementById('completeValue').value.trim(),
        notes: document.getElementById('completeNotes').value.trim()
      });
    }
  }
  this._closeOverlay();
  Audit.action('complete', 'agenda', id, 'Atendimento concluído via Agenda');
  App._toast('Atendimento concluído.', 'success');
  const a2 = Repos.agenda.get(id);
  if (a2) App._promptGerarOS({ id, type: 'agenda_complete', clientName: a2.clientName, service: a2.service, professional: a2.professional, value: document.getElementById('completeValue').value.trim(), notes: document.getElementById('completeNotes').value.trim() });
  this.renderAgenda();
};

App.deleteAppointment = function(id) {
  App._confirm('Remover este agendamento?', function() {
    Repos.agenda.remove(id);
    Audit.action('delete', 'agenda', id, 'Agendamento removido');
    App._toast('Agendamento removido.', 'success');
    App.renderAgenda();
  });
};
