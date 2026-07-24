Repos.financeiro = {
  paymentMethods: {
    list() { return DB.getPaymentMethods(); },
    create(data) { return DB.addPaymentMethod(data); },
    update(id, data) { return DB.updatePaymentMethod(id, data); },
  },
  cashier: {
    getOpen() { return DB.getOpenCashier(); },
    open(data) { return DB.openCashier(data); },
    close(id, data) { return DB.closeCashier(id, data); },
    list() { return DB._get('caixas'); },
  },
  ledger: {
    list(date, type) { return DB.getLedger(date, type); },
    create(data) { return DB.addLedger(data); },
  },
};
