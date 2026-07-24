const Finance = {
  todaySummary() {
    const today = DB._today();
    const entries = DB.getLedger(today, 'entrada');
    const exits = DB.getLedger(today, 'saida');
    const totalIn = entries.reduce((s, l) => s + l.value, 0);
    const totalOut = exits.reduce((s, l) => s + l.value, 0);
    const cashier = DB.getOpenCashier();

    const byMethod = {};
    const allToday = DB.getLedger(today);
    allToday.forEach(l => {
      const m = l.paymentMethod || 'Outro';
      if (!byMethod[m]) byMethod[m] = { method: m, entries: 0, exits: 0, total: 0 };
      if (l.type === 'entrada') { byMethod[m].entries += l.value; byMethod[m].total += l.value; }
      else { byMethod[m].exits += l.value; byMethod[m].total -= l.value; }
    });

    const byOrigin = {};
    allToday.forEach(l => {
      const o = l.origin || 'manual';
      if (!byOrigin[o]) byOrigin[o] = { origin: o, entries: 0, exits: 0 };
      if (l.type === 'entrada') byOrigin[o].entries += l.value;
      else byOrigin[o].exits += l.value;
    });

    return {
      cashier,
      totalIn, totalOut, balance: cashier ? cashier.currentBalance : 0,
      grossProfit: totalIn - totalOut,
      transactions: allToday.length,
      byMethod: Object.values(byMethod),
      byOrigin: Object.values(byOrigin),
      entries, exits, allToday,
    };
  },

  periodSummary(range) {
    const { start, end } = Reports._resolveRange(range);
    const all = DB.getLedger().filter(l => l.date >= start && l.date <= end);
    const entries = all.filter(l => l.type === 'entrada').reduce((s, l) => s + l.value, 0);
    const exits = all.filter(l => l.type === 'saida').reduce((s, l) => s + l.value, 0);

    const daily = {};
    all.forEach(l => {
      if (!daily[l.date]) daily[l.date] = { date: l.date, entries: 0, exits: 0 };
      if (l.type === 'entrada') daily[l.date].entries += l.value;
      else daily[l.date].exits += l.value;
    });

    const byCategory = {};
    all.forEach(l => {
      const cat = l.category || 'Sem categoria';
      if (!byCategory[cat]) byCategory[cat] = { category: cat, entries: 0, exits: 0 };
      if (l.type === 'entrada') byCategory[cat].entries += l.value;
      else byCategory[cat].exits += l.value;
    });

    return { entries, exits, balance: entries - exits, count: all.length, daily: Object.values(daily).sort((a, b) => a.date > b.date ? 1 : -1), byCategory: Object.values(byCategory).sort((a, b) => (b.entries - b.exits) - (a.entries - a.exits)) };
  },

  autoRegister(type, origin, description, value, paymentMethod, refId, operator) {
    if (!value || value <= 0) return null;
    return DB.addLedger({ type, origin, category: origin === 'venda' ? 'Produtos' : 'Serviços', description, value, paymentMethod: paymentMethod || '', refId, operator: operator || 'sistema' });
  },
};
