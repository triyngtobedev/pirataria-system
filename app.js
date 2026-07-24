const App = {
  currentModule: null,

  init() {
    DB.seed();
    this.bindNav();
    this.navigate('agenda');
  },

  bindNav() {
    document.querySelectorAll('[data-module]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(link.dataset.module);
      });
    });
  },

  navigate(module) {
    this.currentModule = module;

    document.querySelectorAll('[data-module]').forEach(a => {
      a.classList.toggle('active', a.dataset.module === module);
    });

    const titles = {
      agenda: 'Agenda',
      clientes: 'Clientes',
      atendimento: 'Atendimento',
      studio: 'Studio'
    };
    document.getElementById('moduleTitle').textContent = titles[module] || 'Dashboard';

    switch (module) {
      case 'agenda': this.renderAgenda(); break;
      case 'clientes': this.renderClientes(); break;
      case 'atendimento': this.renderAtendimento(); break;
      case 'studio': this.renderStudio(); break;
    }
  },

  // ───── Agenda ─────
  _agendaView: 'week',
  _weekOffset: 0,
  _focusedDay: null,
  _profFilter: 'todos',

  renderAgenda() {
    const container = document.getElementById('moduleContent');
    container.innerHTML = `
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
            <option value="Digao">Digão</option>
            <option value="Matheus">Matheus</option>
            <option value="Raquel">Raquel</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="App.showAddAppointment()">+ Novo</button>
        </div>
      </div>
      <div id="calView"></div>
      <div id="dayView" class="day-view"></div>`;
    this._renderWeek();
  },

  _weekNav(dir) {
    if (dir === 0) {
      this._weekOffset = 0;
      this._focusedDay = DB._today();
      if (this._agendaView === 'day') { this._renderDayView(); return; }
    } else {
      this._weekOffset += dir;
      this._focusedDay = null;
    }
    this._renderWeek();
  },

  _setView(view) {
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
  },

  _onProfFilter() {
    this._profFilter = document.getElementById('profFilter').value;
    if (this._agendaView === 'week') this._renderWeek();
    else this._renderDayView();
  },

  _getWeekDates() {
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
  },

  _fmtDate(date) {
    return date.toISOString().slice(0, 10);
  },

  _fmtBr(date) {
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  },

  _fmtBrFull(date) {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },

  _dayName(date) {
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return names[date.getDay()];
  },

  _statusLabel(s) {
    const map = { confirmed: 'Confirmado', pending: 'Pendente', completed: 'Concluído', cancelled: 'Cancelado' };
    return map[s] || s;
  },

  _renderWeek() {
    const dates = this._getWeekDates();
    const start = this._fmtDate(dates[0]);
    const end = this._fmtDate(dates[6]);
    const today = DB._today();

    document.getElementById('calRange').textContent =
      `${this._fmtBr(dates[0])} — ${this._fmtBr(dates[6])}`;

    let all = DB.getAppointmentsByDateRange(start, end);
    if (this._profFilter && this._profFilter !== 'todos') {
      all = all.filter(a => a.professional === this._profFilter);
    }

    const byDate = {};
    all.forEach(a => {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    });

    const isCurrentWeek = this._weekOffset === 0;

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
          const profLabel = { Digao: 'Digão', Matheus: 'Matheus', Raquel: 'Raquel' };
          grid += `<div class="wg-card ${a.status}" onclick="event.stopPropagation();App.editAppointment('${a.id}')">
            <div class="wg-time">${a.time}${a.duration ? ' (' + a.duration + '\')' : ''}</div>
            <div class="wg-client">${this._esc(a.clientName)}</div>
            <div class="wg-service">${this._esc(a.service)}</div>
            <div class="wg-prof">${profLabel[a.professional] || a.professional || ''}</div>
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
  },

  _focusDay(date) {
    this._focusedDay = date;
    this._agendaView = 'day';
    document.querySelectorAll('.view-toggle .btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view === 'day')
    );
    document.getElementById('dayView').classList.add('show');
    this._renderDayView();
  },

  _renderDayView() {
    const dayEl = document.getElementById('dayView');
    if (!this._focusedDay) { dayEl.classList.remove('show'); return; }

    const d = new Date(this._focusedDay + 'T12:00:00');
    const today = DB._today();
    const isToday = this._focusedDay === today;

    let apps = DB.getAppointmentsByDate(this._focusedDay);
    if (this._profFilter && this._profFilter !== 'todos') {
      apps = apps.filter(a => a.professional === this._profFilter);
    }
    apps.sort((a, b) => a.time > b.time ? 1 : -1);

    let listHtml = '';
    if (apps.length === 0) {
      listHtml = '<div class="empty-state">Nenhum agendamento para este dia.</div>';
    } else {
      listHtml = '<div class="dv-list">';
      apps.forEach(a => {
        const profLabel = { Digao: 'Digão', Matheus: 'Matheus', Raquel: 'Raquel' };
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
            <div class="dv-details">${this._esc(a.service)}${a.professional ? ' — ' + (profLabel[a.professional] || a.professional) : ''}${a.duration ? ' — ' + a.duration + 'min' : ''}</div>
            <div class="flex gap-8 mt-12" style="align-items:center;">
              <span class="badge badge-${a.status === 'completed' ? 'completed' : a.status === 'confirmed' ? 'confirmed' : a.status === 'cancelled' ? 'cancelled' : 'scheduled'}">${this._statusLabel(a.status)}</span>
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
  },

  // ───── CRUD Agendamentos ─────
  showAddAppointment(prefillDate) {
    const clients = DB.getClients();
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
          <select id="agendaService"><option value="Piercing">Piercing</option><option value="Tatuagem">Tatuagem</option><option value="Ambos">Ambos</option></select>
        </div>
        <div class="form-group"><label>Profissional</label>
          <select id="agendaProfessional"><option value="Digao">Digão</option><option value="Matheus">Matheus</option><option value="Raquel">Raquel</option></select>
        </div>
      </div>
      <div class="form-group"><label>Observações</label><textarea id="agendaNotes" rows="2"></textarea></div>
      <div class="overlay-actions">
        <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.addAppointment()">Salvar</button>
      </div>
    `);
  },

  _onClientSelect() {
    const val = document.getElementById('agendaClientId').value;
    const newFields = document.getElementById('agendaNewClientFields');
    newFields.style.display = val === '__new__' ? 'block' : 'none';
  },

  addAppointment() {
    const sel = document.getElementById('agendaClientId');
    let clientName = '';
    let clientId = null;

    if (sel.value === '__new__') {
      clientName = document.getElementById('agendaNewName').value.trim();
      if (!clientName) return;
      const phone = document.getElementById('agendaNewPhone').value.trim();
      const c = DB.addClient({ name: clientName, phone, interest: document.getElementById('agendaService').value });
      clientId = c.id;
    } else if (sel.value) {
      const c = DB.getClient(sel.value);
      if (c) { clientName = c.name; clientId = c.id; }
    } else {
      return;
    }

    DB.addAppointment({
      clientId,
      clientName,
      date: document.getElementById('agendaDate').value,
      time: document.getElementById('agendaTime').value,
      duration: document.getElementById('agendaDuration').value,
      service: document.getElementById('agendaService').value,
      professional: document.getElementById('agendaProfessional').value,
      notes: document.getElementById('agendaNotes').value.trim()
    });
    this._closeOverlay();
    this.renderAgenda();
  },

  editAppointment(id) {
    const appointments = DB.getAppointments();
    const a = appointments.find(x => x.id === id);
    if (!a) return;

    const profLabel = { Digao: 'Digão', Matheus: 'Matheus', Raquel: 'Raquel' };
    this._showOverlay('Editar agendamento', `
      <div class="form-group"><label>Cliente</label><input type="text" id="agendaClientName" value="${this._esc(a.clientName)}" readonly style="opacity:0.6;"></div>
      <div class="form-row">
        <div class="form-group"><label>Data</label><input type="date" id="agendaDate" value="${a.date}"></div>
        <div class="form-group"><label>Hora</label><input type="time" id="agendaTime" value="${a.time}"></div>
        <div class="form-group"><label>Duração (min)</label><input type="number" id="agendaDuration" value="${a.duration || '60'}" min="15" step="15"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Serviço</label>
          <select id="agendaService"><option value="Piercing" ${a.service === 'Piercing' ? 'selected' : ''}>Piercing</option><option value="Tatuagem" ${a.service === 'Tatuagem' ? 'selected' : ''}>Tatuagem</option><option value="Ambos" ${a.service === 'Ambos' ? 'selected' : ''}>Ambos</option></select>
        </div>
        <div class="form-group"><label>Profissional</label>
          <select id="agendaProfessional"><option value="Digao" ${a.professional === 'Digao' ? 'selected' : ''}>Digão</option><option value="Matheus" ${a.professional === 'Matheus' ? 'selected' : ''}>Matheus</option><option value="Raquel" ${a.professional === 'Raquel' ? 'selected' : ''}>Raquel</option></select>
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
  },

  updateAppointment(id) {
    const name = document.getElementById('agendaClientName').value.trim();
    if (!name) return;
    DB.updateAppointment(id, {
      clientName: name,
      date: document.getElementById('agendaDate').value,
      time: document.getElementById('agendaTime').value,
      duration: document.getElementById('agendaDuration').value,
      service: document.getElementById('agendaService').value,
      professional: document.getElementById('agendaProfessional').value,
      status: document.getElementById('agendaStatus').value,
      notes: document.getElementById('agendaNotes').value.trim()
    });
    this._closeOverlay();
    this.renderAgenda();
  },

  confirmAppointment(id) {
    DB.updateAppointment(id, { status: 'confirmed' });
    this.renderAgenda();
  },

  completeAppointment(id) {
    const a = DB.getAppointments().find(x => x.id === id);
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
            <select id="completeProfessional">
              <option value="Digao" ${a.professional === 'Digao' ? 'selected' : ''}>Digão</option>
              <option value="Matheus" ${a.professional === 'Matheus' ? 'selected' : ''}>Matheus</option>
              <option value="Raquel" ${a.professional === 'Raquel' ? 'selected' : ''}>Raquel</option>
            </select>
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
  },

  doComplete(id) {
    const a = DB.getAppointments().find(x => x.id === id);
    if (!a) return;

    DB.updateAppointment(id, { status: 'completed' });

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
    this.renderAgenda();
  },

  deleteAppointment(id) {
    if (!confirm('Remover este agendamento?')) return;
    DB.deleteAppointment(id);
    this.renderAgenda();
  },

  // ───── Clientes ─────
  renderClientes() {
    const container = document.getElementById('moduleContent');
    const clients = DB.getClients();

    let rows = '';
    if (clients.length === 0) {
      rows = '<div class="empty-state">Nenhum cliente encontrado.</div>';
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
  },

  searchClients() {
    const q = document.getElementById('clientSearch').value.trim().toLowerCase();
    const rows = document.querySelectorAll('#clientTable tbody tr');
    rows.forEach(row => {
      const text = row.dataset.search || row.textContent.toLowerCase();
      row.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  },

  showAddClient() {
    this._showOverlay('Novo cliente', `
      <div class="form-group"><label>Nome *</label><input type="text" id="clientName" placeholder="Nome do cliente"></div>
      <div class="form-row">
        <div class="form-group"><label>Telefone</label><input type="text" id="clientPhone" placeholder="(71) 9XXXX-XXXX"></div>
        <div class="form-group"><label>Instagram</label><input type="text" id="clientInstagram" placeholder="@cliente"></div>
      </div>
      <div class="form-group"><label>Tipo de interesse</label>
        <select id="clientInterest"><option value="">—</option><option value="Piercing">Piercing</option><option value="Tatuagem">Tatuagem</option><option value="Ambos">Ambos</option></select>
      </div>
      <div class="form-group"><label>Observações</label><textarea id="clientNotes" rows="2" placeholder="Preferências, histórico..."></textarea></div>
      <div class="overlay-actions">
        <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.addClient()">Salvar</button>
      </div>
    `);
  },

  addClient() {
    const name = document.getElementById('clientName').value.trim();
    if (!name) return;
    DB.addClient({
      name,
      phone: document.getElementById('clientPhone').value.trim(),
      instagram: document.getElementById('clientInstagram').value.trim(),
      interest: document.getElementById('clientInterest').value,
      notes: document.getElementById('clientNotes').value.trim()
    });
    this._closeOverlay();
    this.renderClientes();
  },

  // ───── Painel lateral do cliente ─────
  openClientPanel(id) {
    this._panelClientId = id;
    const c = DB.getClient(id);
    if (!c) return;
    const history = DB.getServiceHistory(id);

    document.getElementById('panelTitle').textContent = c.name;

    let historyHtml = '';
    if (history.length === 0) {
      historyHtml = '<div class="empty-state">Nenhum atendimento registrado.</div>';
    } else {
      historyHtml = history.map(h => {
        const profLabels = { Digao: 'Digão', Matheus: 'Matheus', Raquel: 'Raquel' };
        return `<div class="history-item">
          <div class="h-top">
            <span class="h-service">${this._esc(h.service)}</span>
            <span class="h-value">${h.value ? 'R$ ' + this._esc(h.value) : '—'}</span>
          </div>
          <div class="flex-between">
            <span class="h-date">${h.date}</span>
            <span class="h-prof">${profLabels[h.professional] || this._esc(h.professional)}</span>
          </div>
          ${h.notes ? '<div class="h-notes">' + this._esc(h.notes) + '</div>' : ''}
          <div class="actions mt-12">
            <button class="btn btn-sm btn-danger" onclick="App.deleteServiceHistory('${id}','${h.id}')">Remover</button>
          </div>
        </div>`;
      }).join('');
    }

    document.getElementById('panelBody').innerHTML = `
      <div class="panel-section">
        <div class="panel-section-title">Dados do cliente</div>
        <div class="form-group"><label>Nome</label><input type="text" id="panelName" value="${this._esc(c.name)}"></div>
        <div class="form-row">
          <div class="form-group"><label>Telefone</label><input type="text" id="panelPhone" value="${this._esc(c.phone)}"></div>
          <div class="form-group"><label>Instagram</label><input type="text" id="panelInstagram" value="${this._esc(c.instagram)}"></div>
        </div>
        <div class="form-group"><label>Interesse</label>
          <select id="panelInterest"><option value="">—</option><option value="Piercing" ${c.interest === 'Piercing' ? 'selected' : ''}>Piercing</option><option value="Tatuagem" ${c.interest === 'Tatuagem' ? 'selected' : ''}>Tatuagem</option><option value="Ambos" ${c.interest === 'Ambos' ? 'selected' : ''}>Ambos</option></select>
        </div>
        <div class="form-group"><label>Observações</label><textarea id="panelNotes" rows="2">${this._esc(c.notes)}</textarea></div>
        <div class="flex gap-8 mt-12">
          <button class="btn btn-primary btn-sm" onclick="App.saveClientFromPanel()">Salvar dados</button>
          <button class="btn btn-sm btn-danger" onclick="App.deleteClientFromPanel()">Excluir cliente</button>
        </div>
      </div>

      <div class="panel-divider"></div>

      <div class="panel-section">
        <div class="flex-between mb-12">
          <div class="panel-section-title">Histórico de atendimentos</div>
          <button class="btn btn-primary btn-sm" onclick="App.showAddServiceHistory()">+ Novo</button>
        </div>
        ${historyHtml}
      </div>`;

    document.getElementById('panelOverlay').classList.add('show');
  },

  closeClientPanel() {
    document.getElementById('panelOverlay').classList.remove('show');
    this._panelClientId = null;
  },

  saveClientFromPanel() {
    const id = this._panelClientId;
    if (!id) return;
    const name = document.getElementById('panelName').value.trim();
    if (!name) return;
    DB.updateClient(id, {
      name,
      phone: document.getElementById('panelPhone').value.trim(),
      instagram: document.getElementById('panelInstagram').value.trim(),
      interest: document.getElementById('panelInterest').value,
      notes: document.getElementById('panelNotes').value.trim()
    });
    this.openClientPanel(id);
    this.renderClientes();
  },

  deleteClientFromPanel() {
    const id = this._panelClientId;
    if (!id) return;
    if (!confirm('Excluir este cliente e todo seu histórico?')) return;
    DB.deleteClient(id);
    this.closeClientPanel();
    this.renderClientes();
  },

  // ───── Histórico de atendimentos ─────
  showAddServiceHistory() {
    const id = this._panelClientId;
    if (!id) return;
    this._showOverlay('Novo atendimento', `
      <div class="form-group"><label>Data</label><input type="date" id="histDate" value="${DB._today()}"></div>
      <div class="form-group"><label>Serviço</label>
        <select id="histService"><option value="Piercing">Piercing</option><option value="Tatuagem">Tatuagem</option><option value="Ambos">Ambos</option></select>
      </div>
      <div class="form-group"><label>Profissional</label>
        <select id="histProfessional"><option value="Digao">Digão</option><option value="Matheus">Matheus</option><option value="Raquel">Raquel</option></select>
      </div>
      <div class="form-group"><label>Valor cobrado (R$)</label><input type="text" id="histValue" placeholder="0,00"></div>
      <div class="form-group"><label>Observações</label><textarea id="histNotes" rows="2"></textarea></div>
      <div class="overlay-actions">
        <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.addServiceHistory()">Salvar</button>
      </div>
    `);
  },

  addServiceHistory() {
    const id = this._panelClientId;
    if (!id) return;
    DB.addServiceHistory(id, {
      date: document.getElementById('histDate').value,
      service: document.getElementById('histService').value,
      professional: document.getElementById('histProfessional').value,
      value: document.getElementById('histValue').value.trim(),
      notes: document.getElementById('histNotes').value.trim()
    });
    this._closeOverlay();
    this.openClientPanel(id);
    this.renderClientes();
  },

  deleteServiceHistory(clientId, entryId) {
    if (!confirm('Remover este atendimento do histórico?')) return;
    DB.deleteServiceHistory(clientId, entryId);
    this.openClientPanel(clientId);
    this.renderClientes();
  },

  // ───── Atendimento ─────
  renderAtendimento() {
    const container = document.getElementById('moduleContent');
    const today = DB._today();

    const agendaApps = DB.getAppointmentsByDate(today)
      .filter(a => a.status !== 'cancelled')
      .sort((a, b) => a.time > b.time ? 1 : -1);
    const walkins = DB.getQueue();
    const revenue = DB.getTodayRevenue();

    const waiting = agendaApps.filter(a => a.status === 'pending' || a.status === 'confirmed');
    const inProgress = agendaApps.filter(a => a.status === 'in_progress');
    const done = agendaApps.filter(a => a.status === 'completed');
    const walkinWaiting = walkins.filter(q => q.status === 'waiting');
    const walkinProgress = walkins.filter(q => q.status === 'in_progress');
    const walkinDone = walkins.filter(q => q.status === 'done');

    container.innerHTML = `
      <div class="qs-summary">
        <div class="qs-stat"><span class="qs-num">${agendaApps.length + walkins.length}</span>Total</div>
        <div class="qs-stat"><span class="qs-num qs-yellow">${waiting.length + walkinWaiting.length}</span>Aguardando</div>
        <div class="qs-stat"><span class="qs-num qs-red">${inProgress.length + walkinProgress.length}</span>Atendendo</div>
        <div class="qs-stat"><span class="qs-num qs-green">${done.length + walkinDone.length}</span>Concluídos</div>
        <div class="qs-stat"><span class="qs-num qs-gold">R$ ${revenue.toFixed(2).replace('.', ',')}</span>Faturamento</div>
      </div>

      <div class="qs-agenda">
        <div class="flex-between mb-12">
          <div class="section-title">Agendamentos de hoje</div>
        </div>
        ${agendaApps.length === 0 ? '<div class="empty-state">Nenhum agendamento para hoje.</div>' : ''}
        <div class="qs-list">${agendaApps.map(a => this._renderQueueItem(a, 'agenda')).join('')}</div>
      </div>

      <div class="qs-walkin">
        <div class="flex-between mb-12">
          <div class="section-title">Avulsos</div>
          <button class="btn btn-primary" onclick="App.showAddToQueue()">+ Adicionar avulso</button>
        </div>
        ${walkins.length === 0 ? '<div class="empty-state">Nenhum cliente avulso.</div>' : ''}
        <div class="qs-list">${walkins.map(q => this._renderQueueItem(q, 'walkin')).join('')}</div>
      </div>`;
  },

  _renderQueueItem(item, type) {
    const profLabel = { Digao: 'Digão', Matheus: 'Matheus', Raquel: 'Raquel' };
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
    const profDisplay = isAppointment && item.professional ? ` — ${profLabel[item.professional] || item.professional}` : '';
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
  },

  queueStart(id, type) {
    if (type === 'agenda') {
      DB.updateAppointment(id, { status: 'in_progress' });
    } else {
      DB.updateQueueStatus(id, 'in_progress');
    }
    this.renderAtendimento();
  },

  queueFinish(id, type) {
    if (type === 'agenda') {
      const a = DB.getAppointments().find(x => x.id === id);
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
      const q = DB.getQueue().find(x => x.id === id);
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
  },

  doFinishAppointment(id) {
    const value = document.getElementById('finishValue').value.trim();
    const postNotes = document.getElementById('finishPostNotes').value.trim();
    const regHistory = document.getElementById('finishRegHistory').checked;
    DB.updateAppointment(id, { status: 'completed', value, postNotes });

    if (regHistory) {
      const a = DB.getAppointments().find(x => x.id === id);
      if (a && a.clientId) {
        DB.addServiceHistory(a.clientId, {
          date: a.date,
          service: a.service,
          professional: a.professional,
          value,
          notes: postNotes
        });
      }
    }
    this._closeOverlay();
    this.renderAtendimento();
  },

  doFinishWalkin(id) {
    const value = document.getElementById('finishValue').value.trim();
    const postNotes = document.getElementById('finishPostNotes').value.trim();
    DB.updateQueueEntry(id, { status: 'done', value, postNotes });
    this._closeOverlay();
    this.renderAtendimento();
  },

  queueCancel(id, type) {
    if (!confirm('Cancelar este atendimento?')) return;
    if (type === 'agenda') {
      DB.updateAppointment(id, { status: 'cancelled' });
    } else {
      DB.removeFromQueue(id);
    }
    this.renderAtendimento();
  },

  showAddToQueue() {
    this._showOverlay('Adicionar avulso', `
      <div class="form-group"><label>Cliente</label><input type="text" id="queueClientName" placeholder="Nome do cliente"></div>
      <div class="form-row">
        <div class="form-group"><label>Serviço</label>
          <select id="queueService"><option value="Piercing">Piercing</option><option value="Tatuagem">Tatuagem</option><option value="Ambos">Ambos</option></select>
        </div>
        <div class="form-group"><label>Profissional</label>
          <select id="queueProfessional"><option value="">—</option><option value="Digao">Digão</option><option value="Matheus">Matheus</option><option value="Raquel">Raquel</option></select>
        </div>
      </div>
      <div class="form-group"><label>Observações</label><textarea id="queueNotes" rows="2"></textarea></div>
      <div class="overlay-actions">
        <button class="btn" onclick="App._closeOverlay()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.addToQueue()">Adicionar</button>
      </div>
    `);
  },

  addToQueue() {
    const name = document.getElementById('queueClientName').value.trim();
    if (!name) return;
    DB.addToQueue({
      clientName: name,
      service: document.getElementById('queueService').value,
      professional: document.getElementById('queueProfessional').value,
      notes: document.getElementById('queueNotes').value.trim()
    });
    this._closeOverlay();
    this.renderAtendimento();
  },

  // ───── Studio ─────
  renderStudio() {
    const container = document.getElementById('moduleContent');
    const s = DB.getSettings();

    container.innerHTML = `
      <div class="module-section">
        <div class="section-title">Configurações do estúdio</div>
        <div class="card">
          <div class="form-group"><label>Nome do estúdio</label><input type="text" id="cfgName" value="${this._esc(s.studioName)}"></div>
          <div class="form-group"><label>Endereço</label><input type="text" id="cfgAddress" value="${this._esc(s.address)}"></div>
          <div class="form-row">
            <div class="form-group"><label>Telefone</label><input type="text" id="cfgPhone" value="${this._esc(s.phone)}"></div>
            <div class="form-group"><label>Horário de funcionamento</label><input type="text" id="cfgHours" value="${this._esc(s.businessHours)}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Instagram (estúdio)</label><input type="text" id="cfgInsta" value="${this._esc(s.instagram)}"></div>
            <div class="form-group"><label>Instagram (Digão)</label><input type="text" id="cfgInstaDigao" value="${this._esc(s.instagramDigao)}"></div>
          </div>
          <div class="form-group"><label>Tempo padrão por serviço (min)</label><input type="text" id="cfgTime" value="${this._esc(s.defaultServiceTime)}"></div>
          <div class="form-group"><label>Sobre</label><textarea id="cfgAbout" rows="3">${this._esc(s.about)}</textarea></div>
          <button class="btn btn-primary mt-12" onclick="App.saveStudio()">Salvar configurações</button>
        </div>
      </div>`;
  },

  saveStudio() {
    DB.saveSettings({
      studioName: document.getElementById('cfgName').value.trim(),
      address: document.getElementById('cfgAddress').value.trim(),
      phone: document.getElementById('cfgPhone').value.trim(),
      businessHours: document.getElementById('cfgHours').value.trim(),
      instagram: document.getElementById('cfgInsta').value.trim(),
      instagramDigao: document.getElementById('cfgInstaDigao').value.trim(),
      defaultServiceTime: document.getElementById('cfgTime').value.trim(),
      about: document.getElementById('cfgAbout').value.trim()
    });
    this.renderStudio();
  },

  // ───── Overlay helpers ─────
  _showOverlay(title, bodyHtml) {
    const overlay = document.getElementById('overlay');
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlayBody').innerHTML = bodyHtml;
    overlay.classList.add('show');
  },

  _closeOverlay() {
    document.getElementById('overlay').classList.remove('show');
  },

  _esc(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
