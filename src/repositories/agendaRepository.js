Repos.agenda = {
  list() { return DB.getAppointments(); },
  get(id) { return DB.getAppointments().find(a => a.id === id) || null; },
  byDate(date) { return DB.getAppointmentsByDate(date); },
  byDateRange(start, end) { return DB.getAppointmentsByDateRange(start, end); },
  byProfessional(professional, date) { return DB.getAppointmentsByProfessional(professional, date); },
  upcoming(limit) { return DB.getUpcomingAppointments(limit); },
  create(data) { return DB.addAppointment(data); },
  update(id, data) { return DB.updateAppointment(id, data); },
  remove(id) { return DB.deleteAppointment(id); },
  today() { return DB._today(); },
};
