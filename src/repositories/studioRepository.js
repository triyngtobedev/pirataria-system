Repos.studio = {
  settings: {
    get() { return DB.getSettings(); },
    save(data) { return DB.saveSettings(data); },
  },
  professionals: {
    list() { return DB.getProfessionals(); },
    active() { return DB.getActiveProfessionals(); },
    label(id) { return DB.getProfessionalLabel(id); },
    create(data) { return DB.addProfessional(data); },
    update(id, data) { return DB.updateProfessional(id, data); },
  },
  services: {
    list() { return DB.getServices(); },
    active() { return DB.getActiveServices(); },
    create(data) { return DB.addService(data); },
    update(id, data) { return DB.updateService(id, data); },
  },
  hours: {
    get() { return DB.getBusinessHours(); },
    save(data) { return DB.saveBusinessHours(data); },
  },
};
