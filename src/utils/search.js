const Search = {
  _results: [],

  _normalize(str) {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },

  _match(text, query) {
    return this._normalize(text).includes(this._normalize(query));
  },

  index() {
    return {
      clientes: DB.getClients().map(c => ({
        id: c.id, module: 'clientes',
        label: c.name,
        sub: c.phone || c.instagram || '—',
        searchFields: [c.name, c.phone, c.instagram],
      })),

      agenda: DB.getAppointments().map(a => ({
        id: a.id, module: 'agenda',
        label: a.clientName + ' — ' + (a.service || ''),
        sub: a.date + ' às ' + a.time + (a.professional ? ' — ' + DB.getProfessionalLabel(a.professional) : ''),
        searchFields: [a.clientName, a.service, a.professional, a.date, a.notes],
      })),

      atendimento: DB.getAppointmentsByDate(DB._today())
        .filter(a => a.status !== 'cancelled')
        .map(a => ({
          id: a.id, module: 'atendimento',
          label: a.clientName + ' — ' + (a.service || ''),
          sub: a.time + ' · ' + (STATUS_LABELS[a.status] || a.status),
          searchFields: [a.clientName, a.service, a.status],
        }))
        .concat(
          DB.getQueue().map(q => ({
            id: q.id, module: 'atendimento',
            label: q.clientName + ' — ' + (q.service || ''),
            sub: 'Avulso · ' + (q.status === 'waiting' ? 'Aguardando' : q.status === 'in_progress' ? 'Em atendimento' : 'Concluído'),
            searchFields: [q.clientName, q.service, q.status],
          }))
        ),
    };
  },

  query(text) {
    const q = text.trim();
    if (!q) return [];
    const index = this.index();
    const results = [];
    for (const category of ['clientes', 'agenda', 'atendimento']) {
      for (const item of index[category]) {
        if (item.searchFields.some(f => this._match(f, q))) {
          results.push({ ...item, category });
        }
      }
    }
    results.sort((a, b) => a.label.localeCompare(b.label));
    this._results = results;
    return results;
  },

  navigate(idx) {
    const item = this._results[idx];
    if (!item) return;
    App._closeSearchPanel();

    if (item.module === 'clientes') {
      App.navigate('clientes');
      setTimeout(() => App.openClientPanel(item.id), 120);
    } else if (item.module === 'agenda') {
      const a = DB.getAppointments().find(x => x.id === item.id);
      App.navigate('agenda');
      if (a) {
        setTimeout(() => {
          App._focusedDay = a.date;
          App._agendaView = 'day';
          App._renderWeek();
        }, 120);
      }
    } else if (item.module === 'atendimento') {
      App.navigate('atendimento');
    }
  },
};

App._onGlobalSearch = function() {
  const panel = document.getElementById('searchPanel');
  const q = document.getElementById('globalSearch').value;
  if (!q.trim()) { panel.classList.remove('show'); return; }

  const results = Search.query(q);
  if (results.length === 0) {
    panel.innerHTML = '<div class="sp-empty">Nenhum resultado encontrado.</div>';
    panel.classList.add('show');
    return;
  }

  const catLabels = { clientes: 'Clientes', agenda: 'Agenda', atendimento: 'Atendimento' };
  const groups = {};
  results.forEach((r, i) => {
    r._idx = i;
    if (!groups[r.category]) groups[r.category] = [];
    groups[r.category].push(r);
  });

  let html = '';
  for (const [cat, items] of Object.entries(groups)) {
    html += `<div class="sp-group"><div class="sp-cat">${catLabels[cat] || cat}</div>`;
    items.forEach(item => {
      html += `<div class="sp-item" onclick="Search.navigate(${item._idx})">
        <span class="sp-label">${App._esc(item.label)}</span>
        <span class="sp-sub">${App._esc(item.sub)}</span>
      </div>`;
    });
    html += `</div>`;
  }
  panel.innerHTML = html;
  panel.classList.add('show');
};

App._closeSearchPanel = function() {
  const panel = document.getElementById('searchPanel');
  if (panel) panel.classList.remove('show');
};

document.addEventListener('click', function(e) {
  const panel = document.getElementById('searchPanel');
  const input = document.getElementById('globalSearch');
  if (panel && input && !input.contains(e.target) && !panel.contains(e.target)) {
    panel.classList.remove('show');
  }
});
