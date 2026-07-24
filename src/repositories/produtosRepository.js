Repos.produtos = {
  list() { return DB.getProducts(); },
  get(id) { return DB.getProducts().find(p => p.id === id) || null; },
  active() { return DB.getActiveProducts(); },
  create(data) { return DB.addProduct(data); },
  update(id, data) { return DB.updateProduct(id, data); },
  categories: {
    list() { return DB.getCategories(); },
    active() { return DB.getActiveCategories(); },
    create(data) { return DB.addCategory(data); },
    update(id, data) { return DB.updateCategory(id, data); },
  },
  movements: {
    list(productId) { return DB.getMovements(productId); },
    create(data) { return DB.addMovement(data); },
  },
  sales: {
    list() { return DB.getSales(); },
    create(data) { return DB.addSale(data); },
  },
};
