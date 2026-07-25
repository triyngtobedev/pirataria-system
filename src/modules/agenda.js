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
    ${App._renderDashboard()}
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
    listHtml = L.empty('Nenhum agendamento', 'Nenhum agendamento para este dia.', 'calendar');
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
    Events.emit('crm.cliente_criado', { clientId: c.id });
    Repos.agenda.create({
      clientId: c.id, clientName: c.name,
      date: document.getElementById('agendaDate').value,
      time: document.getElementById('agendaTime').value,
      duration: document.getElementById('agendaDuration').value,
      service: document.getElementById('agendaService').value,
      professional: document.getElementById('agendaProfessional').value,
      notes: document.getElementById('agendaNotes').value.trim()
    });
    Events.emit('crm.agendamento_criado', { clientId: c.id, service: document.getElementById('agendaService').value, refId: null });
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
    Events.emit('crm.agendamento_criado', { clientId: c.id, service: document.getElementById('agendaService').value, refId: null });
  }
  this._closeOverlay();
  Audit.action('create', 'agenda', '', 'Agendamento criado para ' + (Repos.agenda.list().slice(-1)[0] || {}).clientName);
  App._toast('Agendamento criado com sucesso.', 'success');
  this.renderAgenda();
  EventBus.emit('meudia.updated');
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
  EventBus.emit('meudia.updated');
};

App.confirmAppointment = function(id) {
  Repos.agenda.update(id, { status: 'confirmed' });
  Audit.action('update', 'agenda', id, 'Agendamento confirmado');
  App._toast('Agendamento confirmado.', 'success');
  this.renderAgenda();
  EventBus.emit('meudia.updated');
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
  var compValue = document.getElementById('completeValue').value.trim();
  var compValNum = parseFloat(compValue.replace(',', '.')) || 0;
  var compNotes = document.getElementById('completeNotes').value.trim();
  App._gerarComissao(a.professional, 'servico', id, 'Atendimento: ' + a.clientName, compValNum);
  this._closeOverlay();
  Audit.action('complete', 'agenda', id, 'Atendimento concluído via Agenda');
  App._toast('Atendimento concluído.', 'success');
  var self = this;
  App._checkPacoteEUsar(a.clientId, a.service, id, a.professional, function() {
    if (a) App._promptGerarOS({ id: id, type: 'agenda_complete', clientName: a.clientName, service: a.service, professional: a.professional, value: compValue, notes: compNotes });
    self.renderAgenda();
    EventBus.emit('meudia.updated');
  });
  if (!a) { this.renderAgenda(); return; }
};

App.deleteAppointment = function(id) {
  App._confirm('Remover este agendamento?', function() {
    Repos.agenda.remove(id);
    Audit.action('delete', 'agenda', id, 'Agendamento removido');
    App._toast('Agendamento removido.', 'success');
    App.renderAgenda();
    EventBus.emit('meudia.updated');
  });
};

// ─── Dashboard ───
App._renderDashboard = function() {
  const today = DB._today();
  const now = new Date();
  const todayStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, function(c) { return c.toUpperCase(); });

  const agendaToday = DB.getAppointmentsByDate(today);
  const doneToday = agendaToday.filter(function(a) { return a.status === 'completed'; }).length;
  var revToday = 0;
  agendaToday.forEach(function(a) { if (a.status === 'completed') revToday += parseFloat(a.value) || 0; });
  var walkinRev = 0;
  DB.getQueue().forEach(function(q) { if (q.status === 'done') walkinRev += parseFloat(q.value) || 0; });
  var totalRev = revToday + walkinRev;

  var cashier = DB.getOpenCashier();
  var lowStockCount = 0;
  try { var inv = Inventory.alerts(); lowStockCount = (inv.outOfStock || []).length + (inv.belowMin || []).length; } catch(e) {}

  var upcoming = agendaToday.filter(function(a) { return a.status === 'pending' || a.status === 'confirmed'; }).sort(function(a, b) { return a.time > b.time ? 1 : -1; }).slice(0, 3);

  var recentLogs = [];
  try { recentLogs = DB.getLogs(5); } catch(e) {}

  var pendingLems = DB.getLembretes().filter(function(l) { return l.status === 'pending'; });
  var lateLems = pendingLems.filter(function(l) { return l.date < today; });
  var todayLems = pendingLems.filter(function(l) { return l.date === today; });

  var html = '<div class="db-wrap">';
  html += App._renderOnboardingChecklist();
  html += App._renderPendingPanel();
  html += '<div class="db-header"><span class="db-date">' + App._esc(todayStr) + '</span><div class="db-chips">';
  if (cashier) html += '<span class="db-chip db-chip-green">Caixa aberto</span>';
  if (lateLems.length > 0) html += '<span class="db-chip db-chip-red">' + lateLems.length + ' lembrete(s) atrasado(s)</span>';
  if (todayLems.length > 0) html += '<span class="db-chip db-chip-yellow">' + todayLems.length + ' lembrete(s) hoje</span>';
  if (lowStockCount > 0) html += '<span class="db-chip db-chip-red">' + lowStockCount + ' produto(s) estoque crítico</span>';
  html += '</div></div>';

  html += '<div class="db-metrics">';
  html += '<div class="db-card db-card-gold"><div class="db-card-icon">&#9733;</div><div class="db-card-body"><span class="db-card-value" data-count="' + totalRev.toFixed(2) + '" data-prefix="R$ ">0,00</span><span class="db-card-label">Faturamento hoje</span></div></div>';
  html += '<div class="db-card db-card-blue"><div class="db-card-icon">&#9745;</div><div class="db-card-body"><span class="db-card-value" data-count="' + doneToday + '">0</span><span class="db-card-label">Atendimentos hoje</span></div></div>';
  html += '<div class="db-card db-card-purple"><div class="db-card-icon">&#9787;</div><div class="db-card-body"><span class="db-card-value" data-count="' + agendaToday.length + '">0</span><span class="db-card-label">Agendamentos hoje</span></div></div>';
  html += '<div class="db-card db-card-teal"><div class="db-card-icon">&#9881;</div><div class="db-card-body"><span class="db-card-value" data-count="' + DB.getQueue().length + '">0</span><span class="db-card-label">Na fila</span></div></div>';
  html += '</div>';

  html += '<div class="db-bottom">';
  html += '<div class="db-col"><div class="db-section-title">Próximos atendimentos</div>';
  if (upcoming.length === 0) html += '<div class="db-empty">Nenhum agendamento pendente.</div>';
  else {
    upcoming.forEach(function(a) {
      html += '<div class="db-event"><span class="db-event-time">' + a.time + '</span><div class="db-event-body"><span class="db-event-title">' + App._esc(a.clientName) + '</span><span class="db-event-sub">' + App._esc(a.service) + (a.professional ? ' — ' + Repos.studio.professionals.label(a.professional) : '') + '</span></div></div>';
    });
  }
  html += '</div>';

  html += '<div class="db-col"><div class="db-section-title">Atividade recente</div>';
  if (recentLogs.length === 0) html += '<div class="db-empty">Nenhuma atividade registrada.</div>';
  else {
    recentLogs.forEach(function(l) {
      html += '<div class="db-activity"><span class="db-activity-time">' + (l.createdAt ? l.createdAt.slice(11, 19) : '—') + '</span><span class="db-activity-text">' + App._esc(l.description || l.action) + '</span></div>';
    });
  }
  html += '</div></div></div>';

  setTimeout(function() {
    document.querySelectorAll('.db-card-value').forEach(function(el) {
      var target = parseFloat(el.dataset.count.replace(',', '.')) || 0;
      var prefix = el.dataset.prefix || '';
      var duration = 800;
      var start = performance.now();
      function frame(now) {
        var pct = Math.min(1, (now - start) / duration);
        var current = target * (1 - Math.pow(1 - pct, 3));
        el.textContent = prefix + (target % 1 === 0 ? Math.round(current) : current.toFixed(2).replace('.', ','));
        if (pct < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }, 100);

  return html;
};

// ─── Onboarding Checklist ───
App._onboardingDone = false;

App._renderOnboardingChecklist = function() {
  if (this._onboardingDone) return '';

  var checks = [
    { label: 'Cadastrar o primeiro cliente', done: Repos.clientes.list().length > 0, icon: 'person' },
    { label: 'Agendar o primeiro atendimento', done: Repos.agenda.list().length > 0, icon: 'calendar' },
    { label: 'Registrar o primeiro atendimento', done: Repos.agenda.list().filter(function(a) { return a.status === 'completed'; }).length > 0, icon: 'clock' },
    { label: 'Criar a primeira Ordem de Servi\u00e7o', done: DB.getOrdensServico().length > 0, icon: 'document' },
    { label: 'Registrar a primeira venda', done: Repos.produtos.sales.list().length > 0, icon: 'cart' },
    { label: 'Adicionar o primeiro item ao estoque', done: Repos.produtos.list().length > 0, icon: 'box' },
  ];

  var allDone = checks.every(function(c) { return c.done; });
  if (allDone) {
    this._onboardingDone = true;
    return '<div class="ob-wrap ob-complete"><div class="ob-title">Parab\u00e9ns!</div><div class="ob-desc">O Pirataria System est\u00e1 pronto para o uso di\u00e1rio.</div></div>';
  }

  var html = '<div class="ob-wrap">';
  html += '<div class="ob-title">Comece por aqui</div>';
  html += '<div class="ob-desc">Complete os passos abaixo para configurar o sistema e come\u00e7ar a atender.</div>';
  html += '<div class="ob-list">';
  checks.forEach(function(c) {
    var cls = c.done ? 'ob-item ob-item-done' : 'ob-item';
    var icon = c.done ? '\u2713' : '\u25CB';
    html += '<div class="' + cls + '"><span class="ob-icon">' + icon + '</span><span class="ob-label">' + App._esc(c.label) + '</span></div>';
  });
  html += '</div></div>';
  return html;
};

// ─── Pendências de Hoje ───
App._renderPendingPanel = function() {
  var today = DB._today();
  var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  var items = [];

  function parseTime(t) { var p = t.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); }

  Repos.agenda.byDate(today).filter(function(a) { return a.status === 'in_progress'; }).forEach(function(a) {
    items.push({ type: 'atendimento', client: a.clientName, desc: 'Atendimento iniciado e n\u00e3o finalizado', sev: 'high', action: 'App.navigate(\'atendimento\')' });
  });
  Repos.atendimento.queue.list().filter(function(q) { return q.status === 'in_progress'; }).forEach(function(q) {
    items.push({ type: 'atendimento', client: q.clientName, desc: 'Atendimento iniciado e n\u00e3o finalizado', sev: 'high', action: 'App.navigate(\'atendimento\')' });
  });

  Repos.agenda.byDate(today).filter(function(a) { return (a.status === 'pending' || a.status === 'confirmed') && parseTime(a.time) < nowMin; }).forEach(function(a) {
    items.push({ type: 'agenda', client: a.clientName, desc: 'Agendamento passou do hor\u00e1rio (' + a.time + ')', sev: 'medium', action: 'App.navigate(\'agenda\')' });
  });

  var ledger = Repos.financeiro.ledger.list(today);
  DB.getOrdensServico().filter(function(o) { return o.date === today && o.status !== 'cancelled'; }).forEach(function(o) {
    var paid = ledger.some(function(l) { return l.description && l.description.indexOf(o.clientName) >= 0; });
    if (!paid) items.push({ type: 'os', client: o.clientName, desc: 'OS #' + o.osNumber + ' sem pagamento', sev: 'medium', action: 'App.navigate(\'os\')' });
  });

  Repos.agenda.byDate(today).filter(function(a) { return a.status === 'in_progress' || a.status === 'completed'; }).forEach(function(a) {
    var temTermo = DB.getTermos().some(function(t) { return t.clientName === a.clientName && t.procedure === a.service && t.status === 'signed'; });
    if (!temTermo) items.push({ type: 'termo', client: a.clientName, desc: 'Termo de consentimento pendente', sev: 'medium', action: 'App.navigate(\'termos\')' });
  });

  items.sort(function(a, b) { return a.sev === 'high' ? -1 : b.sev === 'high' ? 1 : 0; });
  if (items.length === 0) return '';

  var icons = { high: '\u26D4', medium: '\u26A0' };
  var cols  = { high: 'pp-red', medium: 'pp-yellow' };

  var html = '<div class="pp-wrap">';
  html += '<div class="pp-title">Pend\u00eancias de Hoje (' + items.length + ')</div>';
  html += '<div class="pp-list">';
  items.slice(0, 8).forEach(function(item) {
    html += '<div class="pp-item ' + (cols[item.sev] || '') + '" onclick="' + item.action + '">';
    html += '<span class="pp-icon">' + (icons[item.sev] || '\u2022') + '</span>';
    html += '<span class="pp-body"><span class="pp-client">' + App._esc(item.client) + '</span><span class="pp-desc">' + item.desc + '</span></span>';
    html += '</div>';
  });
  if (items.length > 8) html += '<div class="pp-more">+ ' + (items.length - 8) + ' pend\u00eancias...</div>';
  html += '</div></div>';
  return html;
};
