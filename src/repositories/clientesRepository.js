Repos.clientes = {
  list() { return DB.getClients(); },
  get(id) { return DB.getClient(id); },
  search(query) { return DB.searchClients(query); },
  create(data) { return DB.addClient(data); },
  update(id, data) { return DB.updateClient(id, data); },
  remove(id) { return DB.deleteClient(id); },
  history: {
    list(clientId) { return DB.getServiceHistory(clientId); },
    create(clientId, data) { return DB.addServiceHistory(clientId, data); },
    remove(clientId, entryId) { return DB.deleteServiceHistory(clientId, entryId); },
  },
};
