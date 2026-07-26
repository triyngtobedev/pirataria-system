const Reports = {
  _resolveRange(range) {
    if (range && typeof range === 'object' && range.start && range.end) {
      return range;
    }
    const map = {
      today: () => { const d = DB._today(); return { start: d, end: d }; },
      '7days': () => { const e = DB._today(); const s = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10); return { start: s, end: e }; },
      '30days': () => { const e = DB._today(); const s = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10); return { start: s, end: e }; },
    };
    return (map[range] || map['30days'])();
  },

  _inRange(dateStr, start, end) {
    return dateStr && dateStr >= start && dateStr <= end;
  },

  _getCompleted(range) {
    const { start, end } = this._resolveRange(range);
    const fromAgenda = DB.getAppointments().filter(a => a.status === 'completed' && this._inRange(a.date, start, end));
    const fromQueue = DB.getQueue().filter(q => q.status === 'done' && this._inRange(q.date, start, end));
    const fromHistory = DB._get('historico').filter(h => this._inRange(h.date, start, end));
    return { start, end, fromAgenda, fromQueue, fromHistory };
  },

  _parseMoney(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace(',', '.')) || 0;
  },

  // ─── Visão Geral ───
  revenue(range) {
    const d = this._getCompleted(range);
    let total = 0;
    d.fromAgenda.forEach(a => total += this._parseMoney(a.value));
    d.fromQueue.forEach(q => total += this._parseMoney(q.value));
    return total;
  },

  totalServices(range) {
    const d = this._getCompleted(range);
    return d.fromAgenda.length + d.fromQueue.length;
  },

  avgTicket(range) {
    const d = this._getCompleted(range);
    const count = d.fromAgenda.length + d.fromQueue.length;
    if (count === 0) return 0;
    let total = 0;
    d.fromAgenda.forEach(a => total += this._parseMoney(a.value));
    d.fromQueue.forEach(q => total += this._parseMoney(q.value));
    return total / count;
  },

  overview(range) {
    const d = this._getCompleted(range);
    const count = d.fromAgenda.length + d.fromQueue.length;
    let total = 0;
    d.fromAgenda.forEach(a => total += this._parseMoney(a.value));
    d.fromQueue.forEach(q => total += this._parseMoney(q.value));
    return { count, revenue: total, avgTicket: count > 0 ? total / count : 0 };
  },

  // ─── Profissionais ───
  professionalRanking(range) {
    const d = this._getCompleted(range);
    const map = {};
    const add = (professional) => {
      if (!professional) return;
      if (!map[professional]) map[professional] = { id: professional, count: 0, revenue: 0 };
      map[professional].count++;
    };
    d.fromAgenda.forEach(a => { add(a.professional); map[a.professional].revenue += this._parseMoney(a.value); });
    d.fromQueue.forEach(q => { add(q.professional); map[q.professional].revenue += this._parseMoney(q.value); });
    d.fromHistory.forEach(h => { add(h.professional); map[h.professional].revenue += this._parseMoney(h.value); });

    return Object.values(map)
      .map(p => ({ ...p, name: DB.getProfessionalLabel(p.id), avgTicket: p.count > 0 ? p.revenue / p.count : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  },

  // ─── Serviços ───
  serviceRanking(range) {
    const d = this._getCompleted(range);
    const map = {};
    const add = (service, value) => {
      if (!service) return;
      if (!map[service]) map[service] = { name: service, count: 0, revenue: 0 };
      map[service].count++;
      map[service].revenue += this._parseMoney(value);
    };
    d.fromAgenda.forEach(a => add(a.service, a.value));
    d.fromQueue.forEach(q => add(q.service, q.value));
    d.fromHistory.forEach(h => add(h.service, h.value));

    const arr = Object.values(map).sort((a, b) => b.count - a.count);
    const total = arr.reduce((s, x) => s + x.count, 0);
    arr.forEach(x => { x.pct = total > 0 ? (x.count / total) * 100 : 0; });
    return arr;
  },

  // ─── Clientes ───
  clientMetrics(range) {
    const { start, end } = this._resolveRange(range);
    const clients = DB.getClients();
    const history = DB._get('historico').filter(h => this._inRange(h.date, start, end));
    const servicedIds = new Set(history.map(h => h.clientId));
    const newClients = clients.filter(c => c.createdAt && this._inRange(c.createdAt.slice(0, 10), start, end));
    const recurring = clients.filter(c => servicedIds.has(c.id) && (c.totalVisits || 0) > 1);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const inactive = clients.filter(c => {
      if (!c.lastVisit) return false;
      return c.lastVisit < ninetyDaysAgo && servicedIds.has(c.id);
    });
    return { newClients: newClients.length, recurring: recurring.length, inactive: inactive.length };
  },

  // ─── Inventário ───
  inventorySummary(range) {
    const summary = Inventory.salesSummary(range);
    return summary;
  },

  // ─── Financeiro ───
  financialSummary(range) {
    const summary = Finance.periodSummary(range);
    return summary;
  },

  // ─── Agenda ───
  agendaRates(range) {
    const { start, end } = this._resolveRange(range);
    const apps = DB.getAppointments().filter(a => this._inRange(a.date, start, end));
    const total = apps.length;
    if (total === 0) return { completionRate: 0, cancelRate: 0, pendingRate: 0, total };
    const completed = apps.filter(a => a.status === 'completed').length;
    const cancelled = apps.filter(a => a.status === 'cancelled').length;
    const pending = apps.filter(a => a.status === 'pending').length;
    return {
      completionRate: (completed / total) * 100,
      cancelRate: (cancelled / total) * 100,
      pendingRate: (pending / total) * 100,
      total, completed, cancelled, pending,
    };
  },
};
