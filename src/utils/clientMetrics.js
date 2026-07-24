App._clientMetrics = function(clientId) {
  const c = DB.getClient(clientId);
  if (!c) return null;
  const history = DB.getServiceHistory(clientId);
  const appointments = DB.getAppointments().filter(a => a.clientId === clientId);
  const queueEntries = DB.getQueue().filter(q => q.clientName === c.name);

  const totalVisits = c.totalVisits || 0;
  const totalSpent = history.reduce((sum, h) => sum + parseFloat(String(h.value || '0').replace(',', '.')), 0);
  const avgTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;

  const serviceCount = {};
  history.forEach(h => { if (h.service) serviceCount[h.service] = (serviceCount[h.service] || 0) + 1; });
  const topService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0];

  const profCount = {};
  history.forEach(h => { if (h.professional) profCount[h.professional] = (profCount[h.professional] || 0) + 1; });
  const topProf = Object.entries(profCount).sort((a, b) => b[1] - a[1])[0];

  const createdAt = c.createdAt ? c.createdAt.slice(0, 10) : null;
  const lastVisit = c.lastVisit;
  const daysSinceLastVisit = lastVisit ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000) : null;

  const isNew = totalVisits <= 1;
  const isRecurring = totalVisits > 1;
  const isInactive = daysSinceLastVisit !== null && daysSinceLastVisit > 90;

  let avgFrequency = null;
  if (totalVisits > 1 && createdAt) {
    const firstHistory = history.length > 0 ? history[history.length - 1] : null;
    if (firstHistory) {
      const firstDate = new Date(firstHistory.date);
      const lastDate = lastVisit ? new Date(lastVisit) : new Date();
      const daysSpan = Math.round((lastDate.getTime() - firstDate.getTime()) / 86400000);
      avgFrequency = daysSpan > 0 ? Math.round(daysSpan / totalVisits) : null;
    }
  }

  return {
    totalVisits,
    totalSpent,
    avgTicket,
    topService: topService ? { name: topService[0], count: topService[1] } : null,
    topProf: topProf ? { id: topProf[0], name: DB.getProfessionalLabel(topProf[0]), count: topProf[1] } : null,
    createdAt,
    lastVisit,
    daysSinceLastVisit,
    isNew,
    isRecurring,
    isInactive,
    avgFrequency,
  };
};

App._clientTimeline = function(clientId) {
  const c = DB.getClient(clientId);
  if (!c) return [];

  const events = [];

  if (c.createdAt) {
    events.push({ date: c.createdAt.slice(0, 10), time: c.createdAt.slice(11, 16), type: 'cadastro', label: 'Cliente cadastrado' });
  }

  const appointments = DB.getAppointments().filter(a => a.clientId === clientId);
  appointments.forEach(a => {
    events.push({ date: a.date, time: a.time, type: a.status === 'cancelled' ? 'cancelamento' : 'agendamento', label: a.status === 'cancelled' ? 'Agendamento cancelado: ' + (a.service || '') : 'Agendamento criado: ' + (a.service || '') + ' às ' + a.time });
    if (a.status === 'completed') {
      events.push({ date: a.date, time: a.time, type: 'atendimento', label: 'Atendimento concluído: ' + (a.service || '') });
    }
  });

  const history = DB.getServiceHistory(clientId);
  history.forEach(h => {
    if (!appointments.some(a => a.date === h.date && a.service === h.service)) {
      events.push({ date: h.date, time: '00:00', type: 'atendimento', label: 'Atendimento registrado: ' + (h.service || '') + (h.value ? ' (R$ ' + h.value + ')' : '') });
    }
  });

  events.sort((a, b) => (a.date + a.time) > (b.date + b.time) ? -1 : 1);
  return events;
};
