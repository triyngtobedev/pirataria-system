Repos.atendimento = {
  queue: {
    list() { return DB.getQueue(); },
    byStatus(status) { return DB.getQueueByStatus(status); },
    add(data) { return DB.addToQueue(data); },
    updateStatus(id, status) { return DB.updateQueueStatus(id, status); },
    updateEntry(id, data) { return DB.updateQueueEntry(id, data); },
    remove(id) { return DB.removeFromQueue(id); },
    clearToday() { return DB.clearTodayQueue(); },
  },
  revenueToday() { return DB.getTodayRevenue(); },
};
