const Inventory = {
  alerts() {
    const products = DB.getProducts();
    return {
      outOfStock: products.filter(p => p.active && p.stock <= 0),
      belowMin: products.filter(p => p.active && p.stock > 0 && p.stock <= p.minStock),
      inactiveWithStock: products.filter(p => !p.active && p.stock > 0),
    };
  },

  productStats(productId) {
    const p = DB.getProducts().find(x => x.id === productId);
    if (!p) return null;
    const movements = DB.getMovements(productId);
    const totalIn = movements.filter(m => m.type === 'entrada').reduce((s, m) => s + (parseInt(m.qty) || 0), 0);
    const totalOut = movements.filter(m => m.type === 'saida').reduce((s, m) => s + (parseInt(m.qty) || 0), 0);
    return { product: p, totalIn, totalOut, currentStock: p.stock, movements };
  },

  salesSummary(range) {
    const { start, end } = Reports._resolveRange(range);
    const sales = DB.getSales().filter(s => s.createdAt && s.createdAt.slice(0, 10) >= start && s.createdAt.slice(0, 10) <= end);
    const totalRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const totalDiscount = sales.reduce((sum, s) => sum + (parseFloat(s.discount) || 0), 0);
    const count = sales.length;

    const productMap = {};
    sales.forEach(s => (s.items || []).forEach(item => {
      if (!productMap[item.productId]) productMap[item.productId] = { productId: item.productId, qty: 0, revenue: 0 };
      productMap[item.productId].qty += parseInt(item.qty) || 0;
      productMap[item.productId].revenue += parseFloat(item.subtotal) || 0;
    }));

    const topProducts = Object.values(productMap)
      .map(p => ({ ...p, name: (DB.getProducts().find(x => x.id === p.productId) || {}).name || '—' }))
      .sort((a, b) => b.revenue - a.revenue);

    const catMap = {};
    sales.forEach(s => (s.items || []).forEach(item => {
      const p = DB.getProducts().find(x => x.id === item.productId);
      const cat = p ? p.category : 'Outros';
      if (!catMap[cat]) catMap[cat] = { category: cat, qty: 0, revenue: 0, cost: 0 };
      catMap[cat].qty += parseInt(item.qty) || 0;
      catMap[cat].revenue += parseFloat(item.subtotal) || 0;
      catMap[cat].cost += (parseFloat(p ? p.costPrice : 0) || 0) * (parseInt(item.qty) || 0);
    }));

    const byCategory = Object.values(catMap).map(c => ({
      ...c, margin: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    const totalCost = byCategory.reduce((s, c) => s + c.cost, 0);
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    return { count, totalRevenue, totalDiscount, avgTicket: count > 0 ? totalRevenue / count : 0, grossMargin, topProducts, byCategory };
  },
};
