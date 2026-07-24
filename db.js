const DB = {
  _prefix: 'pirataria_',

  _key(collection) {
    return this._prefix + collection;
  },

  _get(collection) {
    try {
      const data = localStorage.getItem(this._key(collection));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  _set(collection, data) {
    localStorage.setItem(this._key(collection), JSON.stringify(data));
  },

  _id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  _now() {
    return new Date().toISOString();
  },

  _today() {
    return new Date().toISOString().slice(0, 10);
  },

  // ─── Agenda ───
  getAppointments() {
    return this._get('agenda').sort((a, b) => (a.date + a.time) > (b.date + b.time) ? 1 : -1);
  },

  getAppointmentsByDate(date) {
    return this._get('agenda').filter(a => a.date === date);
  },

  getAppointmentsByDateRange(start, end) {
    return this._get('agenda')
      .filter(a => a.date >= start && a.date <= end)
      .sort((a, b) => (a.date + a.time) > (b.date + b.time) ? 1 : -1);
  },

  getAppointmentsByProfessional(professional, date) {
    const all = date
      ? this._get('agenda').filter(a => a.date === date)
      : this._get('agenda');
    if (!professional || professional === 'todos') return all;
    return all.filter(a => a.professional === professional);
  },

  getUpcomingAppointments(limit) {
    const today = this._today();
    const all = this._get('agenda')
      .filter(a => a.date >= today && a.status !== 'cancelled')
      .sort((a, b) => (a.date + a.time) > (b.date + b.time) ? 1 : -1);
    return limit ? all.slice(0, limit) : all;
  },

  addAppointment(data) {
    const appointments = this._get('agenda');
    const appointment = {
      id: this._id(),
      clientId: data.clientId || null,
      clientName: data.clientName,
      service: data.service || '',
      professional: data.professional || '',
      duration: data.duration || '60',
      date: data.date,
      time: data.time || '12:00',
      status: data.status || 'pending',
      value: data.value || '',
      postNotes: data.postNotes || '',
      notes: data.notes || '',
      createdAt: this._now()
    };
    appointments.push(appointment);
    this._set('agenda', appointments);
    return appointment;
  },

  updateAppointment(id, data) {
    const appointments = this._get('agenda');
    const idx = appointments.findIndex(a => a.id === id);
    if (idx === -1) return null;
    appointments[idx] = { ...appointments[idx], ...data };
    this._set('agenda', appointments);
    return appointments[idx];
  },

  deleteAppointment(id) {
    const appointments = this._get('agenda').filter(a => a.id !== id);
    this._set('agenda', appointments);
  },

  // ─── Clientes ───
  getClients() {
    return this._get('clientes').sort((a, b) => a.name.localeCompare(b.name));
  },

  searchClients(query) {
    const q = query.toLowerCase();
    return this._get('clientes').filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  },

  getClient(id) {
    return this._get('clientes').find(c => c.id === id) || null;
  },

  addClient(data) {
    const clients = this._get('clientes');
    const client = {
      id: this._id(),
      name: data.name,
      phone: data.phone || '',
      instagram: data.instagram || '',
      interest: data.interest || '',
      notes: data.notes || '',
      totalVisits: 0,
      lastVisit: null,
      createdAt: this._now()
    };
    clients.push(client);
    this._set('clientes', clients);
    return client;
  },

  updateClient(id, data) {
    const clients = this._get('clientes');
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return null;
    clients[idx] = { ...clients[idx], ...data };
    this._set('clientes', clients);
    return clients[idx];
  },

  deleteClient(id) {
    const clients = this._get('clientes').filter(c => c.id !== id);
    this._set('clientes', clients);
    const allHistory = this._get('historico');
    this._set('historico', allHistory.filter(h => h.clientId !== id));
  },

  // ─── Histórico de atendimentos ───
  getServiceHistory(clientId) {
    return (this._get('historico').filter(h => h.clientId === clientId))
      .sort((a, b) => b.date > a.date ? 1 : -1);
  },

  addServiceHistory(clientId, data) {
    const all = this._get('historico');
    const entry = {
      id: this._id(),
      clientId,
      date: data.date || this._today(),
      service: data.service,
      professional: data.professional,
      value: data.value || '',
      notes: data.notes || '',
      createdAt: this._now()
    };
    all.push(entry);
    this._set('historico', all);

    const clients = this._get('clientes');
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      clients[idx].totalVisits = (clients[idx].totalVisits || 0) + 1;
      clients[idx].lastVisit = entry.date;
      this._set('clientes', clients);
    }
    return entry;
  },

  deleteServiceHistory(clientId, entryId) {
    const all = this._get('historico').filter(h => !(h.clientId === clientId && h.id === entryId));
    this._set('historico', all);
  },

  incrementClientVisit(id) {
    const clients = this._get('clientes');
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return null;
    clients[idx].totalVisits = (clients[idx].totalVisits || 0) + 1;
    clients[idx].lastVisit = this._today();
    this._set('clientes', clients);
    return clients[idx];
  },

  // ─── Atendimento (fila do dia) ───
  getQueue() {
    return this._get('atendimento');
  },

  getQueueByStatus(status) {
    return this._get('atendimento').filter(q => q.status === status);
  },

  addToQueue(data) {
    const queue = this._get('atendimento');
    const entry = {
      id: this._id(),
      clientName: data.clientName,
      service: data.service,
      professional: data.professional || '',
      status: data.status || 'waiting',
      value: data.value || '',
      postNotes: data.postNotes || '',
      notes: data.notes || '',
      date: this._today(),
      createdAt: this._now()
    };
    queue.push(entry);
    this._set('atendimento', queue);
    return entry;
  },

  updateQueueStatus(id, status) {
    const queue = this._get('atendimento');
    const idx = queue.findIndex(q => q.id === id);
    if (idx === -1) return null;
    queue[idx].status = status;
    this._set('atendimento', queue);
    return queue[idx];
  },

  updateQueueEntry(id, data) {
    const queue = this._get('atendimento');
    const idx = queue.findIndex(q => q.id === id);
    if (idx === -1) return null;
    queue[idx] = { ...queue[idx], ...data };
    this._set('atendimento', queue);
    return queue[idx];
  },

  removeFromQueue(id) {
    const queue = this._get('atendimento').filter(q => q.id !== id);
    this._set('atendimento', queue);
  },

  clearTodayQueue() {
    const today = this._today();
    const queue = this._get('atendimento').filter(q => q.date !== today);
    this._set('atendimento', queue);
  },

  getTodayRevenue() {
    const today = this._today();
    let total = 0;
    const appointments = this._get('agenda').filter(a => a.date === today && a.status === 'completed');
    appointments.forEach(a => { if (a.value) total += parseFloat(a.value.replace(',', '.')) || 0; });
    const walkins = this._get('atendimento').filter(q => q.date === today && q.status === 'done');
    walkins.forEach(q => { if (q.value) total += parseFloat(q.value.replace(',', '.')) || 0; });
    return total;
  },

  // ─── Studio ───
  getSettings() {
    const defaults = {
      studioName: 'Pirataria Body Art',
      address: 'Santo Antônio Além do Carmo, Centro Histórico de Salvador, BA',
      phone: '(71) 9XXXX-XXXX',
      instagram: '@piratariabodyart_',
      instagramDigao: '@digao.piercer',
      businessHours: 'Seg–Sex: 10h–19h | Sáb: 10h–17h',
      defaultServiceTime: '60',
      about: 'Body Piercing com mais de 18 anos de experiência. Tatuagem com Matheus e Raquel.'
    };
    try {
      const saved = localStorage.getItem(this._key('studio'));
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  },

  saveSettings(data) {
    const current = this.getSettings();
    const updated = { ...current, ...data };
    localStorage.setItem(this._key('studio'), JSON.stringify(updated));
    return updated;
  },

  // ─── Seed ───
  seed() {
    if (localStorage.getItem(this._key('agenda'))) return;

    const today = this._today();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    this.addAppointment({ clientName: 'Ana Beatriz', service: 'Piercing', professional: 'Digao', duration: '45', date: today, time: '10:00', status: 'confirmed', notes: 'Hélix com opalito' });
    this.addAppointment({ clientName: 'Carlos Mendes', service: 'Tatuagem', professional: 'Matheus', duration: '120', date: today, time: '14:00', status: 'pending', notes: 'Âncora no antebraço' });
    this.addAppointment({ clientName: 'Marina Costa', service: 'Ambos', professional: 'Digao', duration: '90', date: today, time: '16:30', status: 'confirmed', notes: 'Retorno para retoque + piercing no umbigo' });
    this.addAppointment({ clientName: 'Thiago Alves', service: 'Piercing', professional: 'Digao', duration: '30', date: tomorrow, time: '09:30', status: 'pending', notes: 'Septum' });
    this.addAppointment({ clientName: 'Larissa Souza', service: 'Tatuagem', professional: 'Raquel', duration: '90', date: tomorrow, time: '13:00', status: 'confirmed', notes: 'Flor de lótus na costela' });

    const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    this.addAppointment({ clientName: 'Rafael Oliveira', service: 'Tatuagem', professional: 'Matheus', duration: '60', date: dayAfter, time: '11:00', status: 'pending', notes: 'Turista de SP, mandala no braço' });

    const c1 = this.addClient({ name: 'Ana Beatriz', phone: '(71) 98888-0001', instagram: '@anabeatriz', interest: 'Piercing', notes: 'Cliente fiel, já fez 3 piercings' });
    const c2 = this.addClient({ name: 'Carlos Mendes', phone: '(71) 98888-0002', interest: 'Tatuagem', notes: 'Primeira tatuagem' });
    const c3 = this.addClient({ name: 'Marina Costa', phone: '(71) 98888-0003', instagram: '@marinacosta', interest: 'Ambos', notes: 'Retorno para retoque' });
    const c4 = this.addClient({ name: 'Thiago Alves', phone: '(71) 98888-0004', interest: 'Piercing', notes: 'Indicado por amigo' });
    const c5 = this.addClient({ name: 'Larissa Souza', phone: '(71) 98888-0005', interest: 'Tatuagem', notes: '' });
    const c6 = this.addClient({ name: 'Rafael Oliveira', phone: '(71) 98888-0006', interest: 'Tatuagem', notes: 'Turista de SP' });

    const d1 = '2026-07-10', d2 = '2026-07-05', d3 = '2026-06-28';
    this.addServiceHistory(c1.id, { date: d1, service: 'Piercing', professional: 'Digao', value: '150', notes: 'Hélix com opalito' });
    this.addServiceHistory(c1.id, { date: d2, service: 'Piercing', professional: 'Digao', value: '100', notes: 'Lóbulo duplo' });
    this.addServiceHistory(c2.id, { date: d1, service: 'Tatuagem', professional: 'Matheus', value: '350', notes: 'Âncora no antebraço, preto e cinza' });
    this.addServiceHistory(c3.id, { date: d3, service: 'Piercing', professional: 'Digao', value: '120', notes: 'Umbigo' });
    this.addServiceHistory(c3.id, { date: d2, service: 'Tatuagem', professional: 'Raquel', value: '280', notes: 'Flor de lótus na costela' });
    this.addServiceHistory(c4.id, { date: d1, service: 'Piercing', professional: 'Digao', value: '80', notes: 'Septum' });
    this.addServiceHistory(c5.id, { date: d3, service: 'Tatuagem', professional: 'Matheus', value: '200', notes: 'Nome no pulso' });

    this.addToQueue({ clientName: 'Pedro Santos', service: 'Piercing', status: 'in_progress', notes: 'Lóbulo duplo' });
    this.addToQueue({ clientName: 'Juliana Lima', service: 'Tatuagem', status: 'waiting', notes: 'Nome no pulso' });
    this.addToQueue({ clientName: 'Ricardo Barbosa', service: 'Piercing', status: 'done', notes: 'Hélix' });
    this.addToQueue({ clientName: 'Fernanda Rocha', service: 'Ambos', status: 'waiting', notes: 'Piercing + retoque' });
  }
};
