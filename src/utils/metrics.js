App._getTodayData = function() {
  const today = DB._today();
  const now = new Date();
  const apps = DB.getAppointmentsByDate(today);
  const walkins = DB.getQueue();
  const allItems = [
    ...apps.map(a => ({ ...a, _type: 'agenda' })),
    ...walkins.map(w => ({ ...w, _type: 'walkin' }))
  ];
  return { today, now, apps, walkins, allItems };
};

App._isWaiting = function(item) {
  return item._type === 'agenda'
    ? (item.status === 'pending' || item.status === 'confirmed')
    : item.status === 'waiting';
};

App._isInProgress = function(item) {
  return item.status === 'in_progress';
};

App._isDone = function(item) {
  return item.status === 'completed' || item.status === 'done';
};

App._isCancelled = function(item) {
  return item.status === 'cancelled';
};

App._getMinutesSince = function(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Math.round((Date.now() - d.getTime()) / 60000);
};

App._getMinutesFromTime = function(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return Math.round((Date.now() - d.getTime()) / 60000);
};

App._formatDuration = function(min) {
  if (min === null || min === undefined) return '—';
  if (min < 0) return '0min';
  if (min < 60) return min + 'min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? h + 'h' + m + 'min' : h + 'h';
};

App._formatTime = function(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// ─── Indicadores individuais ───

App._metricNextAppointment = function(data) {
  const pending = data.allItems
    .filter(i => this._isWaiting(i) && i._type === 'agenda')
    .sort((a, b) => a.time > b.time ? 1 : -1);
  if (pending.length === 0) return { label: 'Próximo', value: '—' };
  const next = pending[0];
  return { label: 'Próximo', value: next.clientName + ' às ' + next.time, extra: next.service };
};

App._metricCountWaiting = function(data) {
  return { label: 'Aguardando', value: data.allItems.filter(i => this._isWaiting(i)).length };
};

App._metricCountInProgress = function(data) {
  return { label: 'Em atendimento', value: data.allItems.filter(i => this._isInProgress(i)).length };
};

App._metricCountDone = function(data) {
  return { label: 'Concluídos', value: data.allItems.filter(i => this._isDone(i)).length };
};

App._metricCountCancelled = function(data) {
  return { label: 'Cancelados', value: data.apps.filter(a => a.status === 'cancelled').length };
};

App._metricAvgWaitTime = function(data) {
  const started = data.allItems.filter(i => i.startedAt);
  if (started.length === 0) return { label: 'Espera média', value: '—' };
  const total = started.reduce((sum, i) => {
    const scheduled = i._type === 'agenda' ? this._getMinutesFromTime(i.time) : this._getMinutesSince(i.createdAt);
    const startedMin = this._getMinutesSince(i.startedAt);
    if (scheduled === null || startedMin === null) return sum;
    const wait = scheduled < 0 ? startedMin : startedMin - scheduled;
    return sum + Math.max(0, wait);
  }, 0);
  const avg = Math.round(total / started.length);
  return { label: 'Espera média', value: this._formatDuration(avg) };
};

App._metricAvgServiceTime = function(data) {
  const completed = data.allItems.filter(i => i.completedAt && i.startedAt);
  if (completed.length === 0) return { label: 'Atend. médio', value: '—' };
  const total = completed.reduce((sum, i) => {
    const start = this._getMinutesSince(i.startedAt);
    const end = this._getMinutesSince(i.completedAt);
    if (start === null || end === null) return sum;
    return sum + (start - end);
  }, 0);
  const avg = Math.round(Math.abs(total) / completed.length);
  return { label: 'Atend. médio', value: this._formatDuration(avg) };
};

App._metricRevenue = function(data) {
  const total = DB.getTodayRevenue();
  return { label: 'Faturamento', value: 'R$ ' + total.toFixed(2).replace('.', ','), cls: 'gold' };
};

App._metricAvgTicket = function(data) {
  const completed = data.allItems.filter(i => this._isDone(i));
  const total = DB.getTodayRevenue();
  const avg = completed.length > 0 ? total / completed.length : 0;
  return { label: 'Ticket médio', value: avg > 0 ? 'R$ ' + avg.toFixed(2).replace('.', ',') : '—' };
};

App._metricTopProfessional = function(data) {
  const completed = data.allItems.filter(i => this._isDone(i) && i.professional);
  if (completed.length === 0) return { label: 'Top profissional', value: '—' };
  const count = {};
  completed.forEach(i => { count[i.professional] = (count[i.professional] || 0) + 1; });
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return { label: 'Top profissional', value: DB.getProfessionalLabel(top[0]), extra: top[1] + ' atend.' };
};

App._metricTopService = function(data) {
  const completed = data.allItems.filter(i => this._isDone(i) && i.service);
  if (completed.length === 0) return { label: 'Top serviço', value: '—' };
  const count = {};
  completed.forEach(i => { count[i.service] = (count[i.service] || 0) + 1; });
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return { label: 'Top serviço', value: top[0], extra: top[1] + ' vez' + (top[1] > 1 ? 'es' : '') };
};

// ─── Alertas ───

App._alertLateAppointments = function(data) {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const late = data.apps.filter(a => {
    if (a.status !== 'pending' && a.status !== 'confirmed') return false;
    const [h, m] = (a.time || '00:00').split(':').map(Number);
    const aptMin = h * 60 + m;
    return aptMin < currentMin;
  });
  return late;
};

App._alertLongWait = function(data) {
  const now = Date.now();
  return data.allItems.filter(i => {
    if (!this._isWaiting(i)) return false;
    const ref = i._type === 'agenda' ? (() => {
      const [h, m] = (i.time || '00:00').split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      return d.getTime();
    })() : new Date(i.createdAt).getTime();
    return (now - ref) > 15 * 60 * 1000;
  });
};

App._alertUnconfirmed = function(data) {
  return data.apps.filter(a => a.status === 'pending');
};

// ─── Dashboard completo ───

App._calcDashboard = function() {
  const data = this._getTodayData();

  const metrics = [
    this._metricNextAppointment(data),
    this._metricCountWaiting(data),
    this._metricCountInProgress(data),
    this._metricCountDone(data),
    this._metricCountCancelled(data),
    this._metricAvgWaitTime(data),
    this._metricAvgServiceTime(data),
    this._metricRevenue(data),
    this._metricAvgTicket(data),
    this._metricTopProfessional(data),
    this._metricTopService(data),
  ];

  const alerts = {
    late: this._alertLateAppointments(data),
    longWait: this._alertLongWait(data),
    unconfirmed: this._alertUnconfirmed(data),
  };

  return { metrics, alerts };
};

App._renderDashboardHtml = function() {
  const d = this._calcDashboard();
  const now = new Date();
  const todayStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  let html = `
    <div class="od-today">${todayStr}</div>
    <div class="od-metrics">`;
  d.metrics.forEach(m => {
    const cls = m.cls ? ' od-val-' + m.cls : '';
    html += `<div class="od-metric">
      <span class="od-label">${m.label}</span>
      <span class="od-val${cls}">${m.value}</span>
      ${m.extra ? '<span class="od-extra">' + m.extra + '</span>' : ''}
    </div>`;
  });
  html += `</div>`;

  const hasAlerts = d.alerts.late.length > 0 || d.alerts.longWait.length > 0 || d.alerts.unconfirmed.length > 0;
  if (hasAlerts) {
    html += `<div class="od-alerts">`;
    if (d.alerts.late.length > 0) {
      html += `<div class="od-alert od-alert-danger">
        <span class="od-alert-title">Atrasados (${d.alerts.late.length})</span>
        <span class="od-alert-text">${d.alerts.late.map(a => a.clientName + ' (' + a.time + ')').join(', ')}</span>
      </div>`;
    }
    if (d.alerts.longWait.length > 0) {
      html += `<div class="od-alert od-alert-warning">
        <span class="od-alert-title">Aguardando > 15min (${d.alerts.longWait.length})</span>
        <span class="od-alert-text">${d.alerts.longWait.map(i => i.clientName + (i.time ? ' (' + i.time + ')' : '')).join(', ')}</span>
      </div>`;
    }
    if (d.alerts.unconfirmed.length > 0) {
      html += `<div class="od-alert od-alert-info">
        <span class="od-alert-title">Não confirmados (${d.alerts.unconfirmed.length})</span>
        <span class="od-alert-text">${d.alerts.unconfirmed.map(a => a.clientName + ' (' + a.time + ')').join(', ')}</span>
      </div>`;
    }
    html += `</div>`;
  }

  return html;
};
