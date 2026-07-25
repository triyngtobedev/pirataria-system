const GoogleCalendar = {
  KEY: 'pirataria_google_calendar',
  SCOPES: 'https://www.googleapis.com/auth/calendar.events',

  getConfig: function() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch(e) { return {}; }
  },

  saveConfig: function(data) {
    var current = this.getConfig();
    var merged = {};
    Object.keys(current).forEach(function(k) { merged[k] = current[k]; });
    Object.keys(data).forEach(function(k) { merged[k] = data[k]; });
    merged.updatedAt = new Date().toISOString();
    localStorage.setItem(this.KEY, JSON.stringify(merged));
    return merged;
  },

  isConnected: function() {
    var cfg = this.getConfig();
    return !!(cfg.accessToken && cfg.calendarId);
  },

  getSyncStatus: function() {
    var cfg = this.getConfig();
    return { connected: this.isConnected(), calendarId: cfg.calendarId || null, email: cfg.email || null, ultimaSincronizacao: cfg.ultimaSincronizacao || null, eventosSincronizados: cfg.eventosSincronizados || 0, falha: cfg.ultimaFalha || null };
  },

  // OAuth flow — abre janela de autorização
  authorize: function(clientId) {
    if (!clientId) { App._toast('Configure o Client ID do Google primeiro.', 'warning'); return; }
    this.saveConfig({ clientId: clientId });
    var redirectUri = window.location.origin + '/';
    var state = Math.random().toString(36).slice(2);
    this.saveConfig({ oauthState: state });

    var url = 'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' + encodeURIComponent(clientId) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&response_type=token' +
      '&scope=' + encodeURIComponent(this.SCOPES) +
      '&state=' + state +
      '&include_granted_scopes=true';

    window.open(url, '_blank', 'width=600,height=700');
    App._toast('Fa\u00e7a login na janela aberta. Ap\u00f3s autorizar, copie o token da URL e cole abaixo.', 'info');

    // Prompt for token after redirect
    setTimeout(function() {
      var token = prompt('Cole o access_token da URL (após o #access_token=):');
      if (token) {
        GoogleCalendar.saveConfig({ accessToken: token });
        // Fetch calendar list
        GoogleCalendar._fetchCalendars(token);
      }
    }, 2000);
  },

  _fetchCalendars: function(token) {
    fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) { App._toast('Erro: ' + (data.error.message || 'Token inv\u00e1lido'), 'error'); return; }
      var items = data.items || [];
      if (items.length === 0) { App._toast('Nenhum calend\u00e1rio encontrado.', 'warning'); return; }
      GoogleCalendar._showCalendarSelector(items, token);
    }).catch(function(err) { App._toast('Erro ao listar calend\u00e1rios.', 'error'); });
  },

  _showCalendarSelector: function(calendars, token) {
    var html = '<p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:12px;">Selecione o calend\u00e1rio para sincronizar:</p><div style="display:flex;flex-direction:column;gap:6px;">';
    calendars.forEach(function(cal) {
      html += '<div style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:10px 12px;cursor:pointer;" onclick="GoogleCalendar._selectCalendar(\'' + cal.id + '\',\'' + App._esc(cal.summary || '') + '\',\'' + token + '\')">' +
        '<strong>' + App._esc(cal.summary || 'Sem nome') + '</strong>' +
        (cal.primary ? ' <span class="badge badge-completed">Principal</span>' : '') +
        '<br><span style="font-size:0.72rem;color:var(--text-muted);">' + App._esc((cal.description || '').substring(0, 80)) + '</span></div>';
    });
    html += '</div>';
    App._showOverlay('Selecionar calend\u00e1rio', html);
  },

  _selectCalendar: function(calendarId, calendarName, token) {
    this.saveConfig({ calendarId: calendarId, calendarName: calendarName, accessToken: token, email: token ? 'Conectado' : null });
    App._closeOverlay();
    App._toast('Google Calendar conectado: ' + calendarName, 'success');
    this.syncAll();
  },

  disconnect: function() {
    App._confirm('Desconectar Google Calendar?', function() {
      GoogleCalendar.saveConfig({ accessToken: null, calendarId: null, email: null, calendarName: null, eventosSincronizados: 0, ultimaSincronizacao: null });
      App._toast('Google Calendar desconectado.', 'info');
    });
  },

  // API calls
  _api: function(method, path, body) {
    var cfg = this.getConfig();
    if (!cfg.accessToken) return Promise.reject('Not authenticated');
    return fetch('https://www.googleapis.com/calendar/v3' + path, {
      method: method,
      headers: { 'Authorization': 'Bearer ' + cfg.accessToken, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function(r) {
      if (r.status === 401) { GoogleCalendar.saveConfig({ ultimaFalha: 'Token expirado. Reconecte.' }); return Promise.reject('Token expired'); }
      return r.json();
    });
  },

  createEvent: function(appointment) {
    if (!this.isConnected()) return Promise.reject('Google Calendar not connected');
    var cfg = this.getConfig();
    var event = {
      summary: appointment.clientName + (appointment.service ? ' — ' + appointment.service : ''),
      description: 'Cliente: ' + (appointment.clientName || '') + '\nServi\u00e7o: ' + (appointment.service || '') + '\nProfissional: ' + (appointment.professional || '') + '\nObserva\u00e7\u00f5es: ' + (appointment.notes || '') + '\nID interno: ' + appointment.id,
      start: { dateTime: appointment.date + 'T' + (appointment.time || '10:00') + ':00', timeZone: 'America/Bahia' },
      end: { dateTime: appointment.date + 'T' + (appointment.time ? this._addHour(appointment.time) : '11:00') + ':00', timeZone: 'America/Bahia' }
    };
    var self = this;
    return this._api('POST', '/calendars/' + encodeURIComponent(cfg.calendarId) + '/events', event).then(function(data) {
      if (data.id) {
        self.saveConfig({ eventosSincronizados: (cfg.eventosSincronizados || 0) + 1, ultimaSincronizacao: new Date().toISOString(), ultimaFalha: null });
        return data.id;
      }
      return null;
    });
  },

  updateEvent: function(eventId, appointment) {
    if (!this.isConnected()) return Promise.reject('Not connected');
    var cfg = this.getConfig();
    var event = {
      summary: appointment.clientName + (appointment.service ? ' — ' + appointment.service : ''),
      description: 'Cliente: ' + (appointment.clientName || '') + '\nServi\u00e7o: ' + (appointment.service || '') + '\nProfissional: ' + (appointment.professional || '') + '\nObserva\u00e7\u00f5es: ' + (appointment.notes || '') + '\nID interno: ' + appointment.id,
      start: { dateTime: appointment.date + 'T' + (appointment.time || '10:00') + ':00', timeZone: 'America/Bahia' },
      end: { dateTime: appointment.date + 'T' + (appointment.time ? this._addHour(appointment.time) : '11:00') + ':00', timeZone: 'America/Bahia' }
    };
    return this._api('PUT', '/calendars/' + encodeURIComponent(cfg.calendarId) + '/events/' + encodeURIComponent(eventId), event);
  },

  deleteEvent: function(eventId) {
    if (!this.isConnected()) return Promise.reject('Not connected');
    var cfg = this.getConfig();
    return this._api('DELETE', '/calendars/' + encodeURIComponent(cfg.calendarId) + '/events/' + encodeURIComponent(eventId));
  },

  listEvents: function(dateMin, dateMax) {
    if (!this.isConnected()) return Promise.reject('Not connected');
    var cfg = this.getConfig();
    var params = '?timeMin=' + encodeURIComponent((dateMin || new Date().toISOString().slice(0, 10)) + 'T00:00:00-03:00') +
      '&timeMax=' + encodeURIComponent((dateMax || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)) + 'T23:59:59-03:00') +
      '&singleEvents=true&orderBy=startTime';
    return this._api('GET', '/calendars/' + encodeURIComponent(cfg.calendarId) + '/events' + params);
  },

  // Sync all internal appointments to Google Calendar
  syncAll: function() {
    if (!this.isConnected()) return;
    var hoje = DB._today();
    var apps = DB.getAppointments().filter(function(a) { return a.date >= hoje && a.status !== 'cancelled'; });
    var count = 0;
    var self = this;

    function syncNext(idx) {
      if (idx >= apps.length) {
        self.saveConfig({ ultimaSincronizacao: new Date().toISOString(), ultimaFalha: null });
        App._toast('Sincroniza\u00e7\u00e3o conclu\u00edda: ' + count + ' evento' + (count !== 1 ? 's' : '') + '.', 'success');
        return;
      }
      var a = apps[idx];
      if (a.googleEventId) {
        self.updateEvent(a.googleEventId, a).then(function() { count++; syncNext(idx + 1); }).catch(function() { syncNext(idx + 1); });
      } else {
        self.createEvent(a).then(function(eventId) {
          if (eventId) {
            Repos.agenda.update(a.id, { googleEventId: eventId });
            count++;
          }
          syncNext(idx + 1);
        }).catch(function() { syncNext(idx + 1); });
      }
    }
    syncNext(0);
  },

  _addHour: function(time) {
    var parts = time.split(':').map(Number);
    return (parts[0] + 1).toString().padStart(2, '0') + ':' + (parts[1] || '00').toString().padStart(2, '0');
  }
};
