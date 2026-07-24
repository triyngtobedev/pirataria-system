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
    if (data.status === 'in_progress' && appointments[idx].status !== 'in_progress') {
      data.startedAt = this._now();
    }
    if (data.status === 'completed' && appointments[idx].status !== 'completed') {
      data.completedAt = this._now();
    }
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
    const now = this._now();
    const extra = status === 'in_progress' ? { startedAt: now } : status === 'done' ? { completedAt: now } : {};
    queue[idx] = { ...queue[idx], status, ...extra };
    this._set('atendimento', queue);
    return queue[idx];
  },

  updateQueueEntry(id, data) {
    const queue = this._get('atendimento');
    const idx = queue.findIndex(q => q.id === id);
    if (idx === -1) return null;
    if (data.status === 'done' && queue[idx].status !== 'done') {
      data.completedAt = this._now();
    }
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

  // ─── Profissionais ───
  getProfessionals() {
    const data = this._get('profissionais');
    if (data.length === 0) {
      const defaults = [
        { id: 'Digao', name: 'Digao', displayName: 'Digão', active: true, commissionPct: '0' },
        { id: 'Matheus', name: 'Matheus', displayName: 'Matheus', active: true, commissionPct: '0' },
        { id: 'Raquel', name: 'Raquel', displayName: 'Raquel', active: true, commissionPct: '0' },
      ];
      this._set('profissionais', defaults);
      return defaults;
    }
    return data;
  },

  getActiveProfessionals() {
    return this.getProfessionals().filter(p => p.active);
  },

  getProfessionalLabel(id) {
    const p = this.getProfessionals().find(x => x.id === id);
    return p ? p.displayName : id;
  },

  getProfessionalCommission(id) {
    const p = this.getProfessionals().find(x => x.id === id);
    return p ? parseFloat(p.commissionPct) || 0 : 0;
  },

  addProfessional(data) {
    const list = this.getProfessionals();
    const entry = { id: this._id(), name: data.name, displayName: data.displayName, active: true, commissionPct: data.commissionPct || '0' };
    list.push(entry);
    this._set('profissionais', list);
    return entry;
  },

  updateProfessional(id, data) {
    const list = this.getProfessionals();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this._set('profissionais', list);
    return list[idx];
  },

  // ─── Serviços ───
  getServices() {
    const data = this._get('servicos');
    if (data.length === 0) {
      const defaults = [
        { id: 'Piercing', name: 'Piercing', defaultPrice: '', defaultDuration: '45', active: true },
        { id: 'Tatuagem', name: 'Tatuagem', defaultPrice: '', defaultDuration: '120', active: true },
        { id: 'Ambos', name: 'Ambos', defaultPrice: '', defaultDuration: '90', active: true },
      ];
      this._set('servicos', defaults);
      return defaults;
    }
    return data;
  },

  getActiveServices() {
    return this.getServices().filter(s => s.active);
  },

  addService(data) {
    const list = this.getServices();
    const entry = { id: this._id(), name: data.name, defaultPrice: data.defaultPrice || '', defaultDuration: data.defaultDuration || '60', active: true };
    list.push(entry);
    this._set('servicos', list);
    return entry;
  },

  updateService(id, data) {
    const list = this.getServices();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this._set('servicos', list);
    return list[idx];
  },

  // ─── Horários ───
  getBusinessHours() {
    const defaults = { open: '10:00', close: '19:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] };
    try {
      const saved = localStorage.getItem(this._key('horarios'));
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  },

  saveBusinessHours(data) {
    const current = this.getBusinessHours();
    const updated = { ...current, ...data };
    localStorage.setItem(this._key('horarios'), JSON.stringify(updated));
    return updated;
  },

  // ─── Studio ───
  getSettings() {
    const defaults = {
      studioName: 'Pirataria Body Art',
      address: 'Santo Antônio Além do Carmo, Centro Histórico de Salvador, BA',
      phone: '(71) 9XXXX-XXXX',
      instagram: '@piratariabodyart_',
      instagramDigao: '@digao.piercer',
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

  // ─── Produtos ───
  getProducts() { return this._get('produtos'); },
  getActiveProducts() { return this._get('produtos').filter(p => p.active); },
  addProduct(data) {
    const list = this._get('produtos');
    const entry = { id: this._id(), name: data.name, category: data.category || '', sku: data.sku || '', barcode: data.barcode || '', costPrice: data.costPrice || '', salePrice: data.salePrice || '', stock: parseInt(data.stock) || 0, minStock: parseInt(data.minStock) || 0, active: true, notes: data.notes || '', createdAt: this._now() };
    list.push(entry); this._set('produtos', list); return entry;
  },
  updateProduct(id, data) {
    const list = this._get('produtos'); const idx = list.findIndex(p => p.id === id); if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data }; this._set('produtos', list); return list[idx];
  },

  // ─── Categorias ───
  getCategories() {
    const data = this._get('categorias');
    if (data.length === 0) {
      const defaults = ['Tabacaria', 'Vestuário', 'Piercing', 'Cosméticos', 'Outros'].map(name => ({ id: this._id(), name, active: true }));
      this._set('categorias', defaults); return defaults;
    }
    return data;
  },
  getActiveCategories() { return this.getCategories().filter(c => c.active); },
  addCategory(data) { const list = this.getCategories(); const entry = { id: this._id(), name: data.name, active: true }; list.push(entry); this._set('categorias', list); return entry; },
  updateCategory(id, data) { const list = this._get('categorias'); const idx = list.findIndex(c => c.id === id); if (idx === -1) return null; list[idx] = { ...list[idx], ...data }; this._set('categorias', list); return list[idx]; },

  // ─── Movimentações ───
  getMovements(productId) {
    const all = this._get('movimentos');
    return productId ? all.filter(m => m.productId === productId).sort((a, b) => b.createdAt > a.createdAt ? 1 : -1) : all.sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);
  },
  addMovement(data) {
    const list = this._get('movimentos');
    const entry = { id: this._id(), productId: data.productId, type: data.type, qty: parseInt(data.qty) || 0, reason: data.reason || '', value: data.value || '', user: data.user || 'sistema', createdAt: this._now() };
    list.push(entry); this._set('movimentos', list); return entry;
  },

  // ─── Vendas ───
  getSales() { return this._get('vendas').sort((a, b) => b.createdAt > a.createdAt ? 1 : -1); },
  addSale(data) {
    const list = this._get('vendas');
    const entry = { id: this._id(), items: data.items || [], discount: parseFloat(data.discount) || 0, total: parseFloat(data.total) || 0, paymentMethod: data.paymentMethod || '', notes: data.notes || '', createdAt: this._now() };
    list.push(entry); this._set('vendas', list);
    entry.items.forEach(item => {
      const product = this._get('produtos').find(p => p.id === item.productId);
      if (product) { product.stock = Math.max(0, (product.stock || 0) - (parseInt(item.qty) || 0)); this.updateProduct(item.productId, { stock: product.stock }); }
      this.addMovement({ productId: item.productId, type: 'saida', qty: item.qty, reason: 'Venda #' + entry.id.slice(-6), value: item.subtotal });
    });
    return entry;
  },

  // ─── Financeiro ───
  getPaymentMethods() {
    const d = this._get('pagamentos');
    if (d.length === 0) { const defs = ['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Transferência', 'Outro'].map(n => ({ id: this._id(), name: n, active: true })); this._set('pagamentos', defs); return defs; }
    return d;
  },
  addPaymentMethod(data) { const l = this._get('pagamentos'); const e = { id: this._id(), name: data.name, active: true }; l.push(e); this._set('pagamentos', l); return e; },
  updatePaymentMethod(id, data) { const l = this._get('pagamentos'); const i = l.findIndex(x => x.id === id); if (i === -1) return null; l[i] = { ...l[i], ...data }; this._set('pagamentos', l); return l[i]; },

  getOpenCashier() { const all = this._get('caixas').filter(c => !c.closedAt); return all.length > 0 ? all[0] : null; },
  openCashier(data) {
    if (this.getOpenCashier()) return null;
    const list = this._get('caixas'); const entry = { id: this._id(), date: this._today(), openedAt: this._now(), openedBy: data.operator || 'sistema', initialBalance: parseFloat(data.initialBalance) || 0, currentBalance: parseFloat(data.initialBalance) || 0, closedAt: null, closedBy: null, notes: '', closingData: null };
    list.push(entry); this._set('caixas', list); return entry;
  },
  closeCashier(id, data) {
    const list = this._get('caixas'); const i = list.findIndex(c => c.id === id); if (i === -1) return null;
    list[i].closedAt = this._now(); list[i].closedBy = data.operator || 'sistema'; list[i].notes = data.notes || '';
    list[i].closingData = data.closingData || null; this._set('caixas', list); return list[i];
  },

  addLedger(data) {
    const list = this._get('lancamentos'); const entry = { id: this._id(), type: data.type, origin: data.origin || 'manual', category: data.category || '', description: data.description, value: parseFloat(data.value) || 0, paymentMethod: data.paymentMethod || '', refId: data.refId || null, date: this._today(), createdAt: this._now(), operator: data.operator || 'sistema' };
    list.push(entry); this._set('lancamentos', list);
    const cashier = this.getOpenCashier();
    if (cashier) { const amt = entry.type === 'entrada' ? entry.value : -entry.value; this._updateCashierBalance(cashier.id, amt); }
    return entry;
  },
  getLedger(date, type) { const all = this._get('lancamentos'); let f = all; if (date) f = f.filter(l => l.date === date); if (type) f = f.filter(l => l.type === type); return f.sort((a, b) => b.createdAt > a.createdAt ? 1 : -1); },
  _updateCashierBalance(id, amount) { const list = this._get('caixas'); const i = list.findIndex(c => c.id === id); if (i === -1) return; list[i].currentBalance = (parseFloat(list[i].currentBalance) || 0) + amount; this._set('caixas', list); },

  // ─── Ordem de Serviço ───
  _osCounter: 0,
  _nextOsNumber() {
    const all = this._get('ordensServico');
    const max = all.reduce((m, o) => Math.max(m, parseInt(o.osNumber, 10) || 0), 0);
    return String(max + 1).padStart(5, '0');
  },
  getOrdensServico() { return this._get('ordensServico').sort((a, b) => b.createdAt > a.createdAt ? 1 : -1); },
  getOrdemServico(id) { return this._get('ordensServico').find(o => o.id === id) || null; },
  addOrdemServico(data) {
    const list = this._get('ordensServico');
    const entry = { id: this._id(), osNumber: this._nextOsNumber(), clientName: data.clientName, clientId: data.clientId || null, professional: data.professional || '', service: data.service || '', date: data.date, time: data.time || '', value: data.value || '', paymentMethod: data.paymentMethod || '', status: data.status || 'open', notes: data.notes || '', signature: data.signature || '', createdAt: this._now(), completedAt: data.completedAt || null };
    list.push(entry); this._set('ordensServico', list); return entry;
  },
  updateOrdemServico(id, data) {
    const list = this._get('ordensServico'); const i = list.findIndex(o => o.id === id); if (i === -1) return null;
    if (data.status === 'completed' && list[i].status !== 'completed') data.completedAt = this._now();
    list[i] = { ...list[i], ...data }; this._set('ordensServico', list); return list[i];
  },

  // ─── Termos de Consentimento ───
  getTermos() { return this._get('termosConsentimento').sort((a, b) => b.createdAt > a.createdAt ? 1 : -1); },
  getTermo(id) { return this._get('termosConsentimento').find(t => t.id === id) || null; },
  getTermosByClient(clientId) { return this._get('termosConsentimento').filter(t => t.clientId === clientId); },
  addTermo(data) {
    const list = this._get('termosConsentimento');
    const entry = { id: this._id(), clientName: data.clientName, clientId: data.clientId || null, procedure: data.procedure, professional: data.professional || '', termText: data.termText || '', status: data.status || 'pending', signature: data.signature || '', notes: data.notes || '', createdAt: this._now(), signedAt: null };
    list.push(entry); this._set('termosConsentimento', list); return entry;
  },
  updateTermo(id, data) {
    const list = this._get('termosConsentimento'); const i = list.findIndex(t => t.id === id); if (i === -1) return null;
    if (data.status === 'signed' && list[i].status !== 'signed') data.signedAt = this._now();
    list[i] = { ...list[i], ...data }; this._set('termosConsentimento', list); return list[i];
  },

  // ─── Pacotes de Serviços ───
  getPacotes() { return this._get('pacotes').sort((a, b) => b.createdAt > a.createdAt ? 1 : -1); },
  getPacote(id) { return this._get('pacotes').find(p => p.id === id) || null; },
  getPacotesByClient(clientId) { return this._get('pacotes').filter(p => p.clientId === clientId).sort((a, b) => a.createdAt > b.createdAt ? 1 : -1); },
  getPacotesAtivosByClientAndService(clientId, service) {
    return this._get('pacotes').filter(p => p.clientId === clientId && p.service === service && p.status === 'ativo').sort((a, b) => a.createdAt > b.createdAt ? 1 : -1);
  },
  addPacote(data) {
    const list = this._get('pacotes');
    const entry = { id: this._id(), clientName: data.clientName, clientId: data.clientId || null, name: data.name, service: data.service, totalQty: parseInt(data.qty) || 1, usedQty: 0, remainingQty: parseInt(data.qty) || 1, totalValue: parseFloat(data.value) || 0, purchaseDate: data.purchaseDate || DB._today(), expiresAt: data.expiresAt || null, status: 'ativo', notes: data.notes || '', createdAt: this._now(), usageHistory: [] };
    list.push(entry); this._set('pacotes', list); return entry;
  },
  usePacote(clientId, service, refId, professional) {
    const pacotes = this.getPacotesAtivosByClientAndService(clientId, service);
    for (const p of pacotes) {
      if (p.remainingQty <= 0) continue;
      p.usedQty = (p.usedQty || 0) + 1;
      p.remainingQty = (p.remainingQty || 0) - 1;
      p.usageHistory = p.usageHistory || [];
      p.usageHistory.push({ date: DB._today(), refId: refId || '', professional: professional || '', usedQty: 1, remainingQty: p.remainingQty });
      if (p.remainingQty <= 0) p.status = 'concluido';
      this._set('pacotes', this._get('pacotes'));
      return { pacote: p, used: true };
    }
    return { pacote: null, used: false };
  },
  updatePacote(id, data) {
    const list = this._get('pacotes'); const i = list.findIndex(p => p.id === id); if (i === -1) return null;
    list[i] = { ...list[i], ...data }; this._set('pacotes', list); return list[i];
  },

  // ─── Vales (Crédito do Cliente) ───
  getVales() { return this._get('vales').sort((a, b) => a.createdAt > b.createdAt ? 1 : -1); },
  getValesByClient(clientId) { return this._get('vales').filter(v => v.clientId === clientId); },
  getVale(id) { return this._get('vales').find(v => v.id === id) || null; },
  getValesAtivosByClient(clientId) { return this._get('vales').filter(v => v.clientId === clientId && v.status === 'ativo').sort((a, b) => a.createdAt > b.createdAt ? 1 : -1); },
  getClientValeBalance(clientId) { return this.getValesAtivosByClient(clientId).reduce((s, v) => s + (parseFloat(v.balance) || 0), 0); },
  addVale(data) {
    const list = this._get('vales');
    const entry = { id: this._id(), clientName: data.clientName, clientId: data.clientId || null, originalValue: parseFloat(data.value) || 0, balance: parseFloat(data.value) || 0, reason: data.reason || '', expiresAt: data.expiresAt || null, status: 'ativo', notes: data.notes || '', createdAt: this._now(), usageHistory: [] };
    list.push(entry); this._set('vales', list); return entry;
  },
  useVale(clientId, amount, operation, refId) {
    const vales = this.getValesAtivosByClient(clientId);
    let remaining = parseFloat(amount) || 0;
    const used = [];
    for (const v of vales) {
      if (remaining <= 0) break;
      const useAmt = Math.min(remaining, parseFloat(v.balance) || 0);
      if (useAmt <= 0) continue;
      v.balance = (parseFloat(v.balance) || 0) - useAmt;
      v.usageHistory = v.usageHistory || [];
      v.usageHistory.push({ date: this._today(), operation, refId: refId || '', amount: useAmt, remainingBalance: v.balance });
      if (v.balance <= 0) v.status = 'utilizado';
      used.push({ valeId: v.id, amount: useAmt });
      remaining -= useAmt;
    }
    this._set('vales', this._get('vales'));
    return { used, totalUsed: (parseFloat(amount) || 0) - remaining };
  },

  updateVale(id, data) {
    const list = this._get('vales'); const i = list.findIndex(v => v.id === id); if (i === -1) return null;
    list[i] = { ...list[i], ...data }; this._set('vales', list); return list[i];
  },

  // ─── Comissões ───
  getComissoes() { return this._get('comissoes').sort((a, b) => b.createdAt > a.createdAt ? 1 : -1); },
  addComissao(data) {
    const list = this._get('comissoes');
    const entry = { id: this._id(), professional: data.professional, type: data.type, refId: data.refId || '', description: data.description, operationValue: parseFloat(data.operationValue) || 0, percent: parseFloat(data.percent) || 0, commissionValue: parseFloat(data.commissionValue) || 0, status: 'pending', operationDate: data.operationDate || DB._today(), paidAt: null, createdAt: this._now() };
    list.push(entry); this._set('comissoes', list); return entry;
  },
  updateComissao(id, data) {
    const list = this._get('comissoes'); const i = list.findIndex(c => c.id === id); if (i === -1) return null;
    if (data.status === 'paid' && list[i].status !== 'paid') data.paidAt = this._now();
    if (data.status === 'pending') data.paidAt = null;
    list[i] = { ...list[i], ...data }; this._set('comissoes', list); return list[i];
  },

  // ─── Lembretes ───
  getLembretes() { return this._get('lembretes').sort((a, b) => (a.date + a.time) > (b.date + b.time) ? 1 : -1); },
  getLembrete(id) { return this._get('lembretes').find(l => l.id === id) || null; },
  addLembrete(data) {
    const list = this._get('lembretes');
    const entry = { id: this._id(), title: data.title, description: data.description || '', date: data.date, time: data.time || '12:00', priority: data.priority || 'medium', status: data.status || 'pending', responsible: data.responsible || '', clientId: data.clientId || null, clientName: data.clientName || '', createdAt: this._now(), completedAt: null };
    list.push(entry); this._set('lembretes', list); return entry;
  },
  updateLembrete(id, data) {
    const list = this._get('lembretes'); const i = list.findIndex(l => l.id === id); if (i === -1) return null;
    if (data.status === 'completed' && list[i].status !== 'completed') data.completedAt = this._now();
    list[i] = { ...list[i], ...data }; this._set('lembretes', list); return list[i];
  },
  deleteLembrete(id) { this._set('lembretes', this._get('lembretes').filter(l => l.id !== id)); },

  // ─── Anexos ───
  getAnexos(entity, entityId) {
    const all = this._get('anexos');
    return entity ? all.filter(a => a.entity === entity && a.entityId === entityId).sort((a, b) => b.createdAt > a.createdAt ? 1 : -1) : all.sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);
  },
  addAnexo(data) {
    const list = this._get('anexos');
    const entry = { id: this._id(), entity: data.entity, entityId: data.entityId, clientName: data.clientName || '', fileName: data.fileName, fileType: data.fileType, fileSize: data.fileSize, content: data.content, notes: data.notes || '', createdAt: this._now() };
    list.push(entry); this._set('anexos', list); return entry;
  },
  deleteAnexo(id) {
    this._set('anexos', this._get('anexos').filter(a => a.id !== id));
  },

  // ─── Usuários ───
  getUsers() { return this._get('usuarios'); },
  getUser(id) { return this._get('usuarios').find(u => u.id === id) || null; },
  getUserByLogin(login) { return this._get('usuarios').find(u => u.login === login) || null; },
  addUser(data) { const l = this._get('usuarios'); const e = { id: this._id(), name: data.name, login: data.login, password: data.password, role: data.role || 'reception', active: true, lastAccess: null, createdAt: this._now() }; l.push(e); this._set('usuarios', l); return e; },
  updateUser(id, data) { const l = this._get('usuarios'); const i = l.findIndex(u => u.id === id); if (i === -1) return null; l[i] = { ...l[i], ...data }; this._set('usuarios', l); return l[i]; },

  // ─── Logs ───
  addLog(data) {
    const l = this._get('logs');
    l.push({ id: this._id(), userId: data.userId || '', userName: data.userName || '', action: data.action, module: data.module || '', refId: data.refId || '', description: data.description || '', createdAt: this._now() });
    if (l.length > 5000) l.splice(0, l.length - 5000);
    this._set('logs', l);
  },
  getLogs(limit) { const all = this._get('logs').sort((a, b) => b.createdAt > a.createdAt ? 1 : -1); return limit ? all.slice(0, limit) : all; },

  // ─── Backup ───
  _collections: ['agenda', 'clientes', 'historico', 'atendimento', 'profissionais', 'servicos', 'horarios', 'studio', 'produtos', 'categorias', 'movimentos', 'vendas', 'caixas', 'lancamentos', 'pagamentos', 'usuarios', 'logs', 'ordensServico', 'termosConsentimento', 'anexos', 'lembretes', 'comissoes', 'vales', 'pacotes'],

  exportAll() {
    const data = {};
    this._collections.forEach(c => {
      const raw = localStorage.getItem(this._key(c));
      if (raw) {
        try { data[c] = JSON.parse(raw); } catch { data[c] = []; }
      } else {
        data[c] = c === 'horarios' || c === 'studio' ? null : [];
      }
    });
    return data;
  },

  importAll(data) {
    this._collections.forEach(c => {
      if (data[c] !== undefined) {
        localStorage.setItem(this._key(c), JSON.stringify(data[c]));
      }
    });
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
