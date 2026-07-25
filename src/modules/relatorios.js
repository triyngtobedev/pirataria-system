App._reportRange = 'today';

App.renderRelatorios = function() {
  const container = document.getElementById('moduleContent');

  container.innerHTML = `
    <div class="rp-controls">
      <div class="section-title">Período</div>
      <div class="rp-filters">
        <button class="btn btn-sm ${this._reportRange === 'today' ? 'btn-primary' : ''}" onclick="App._setReportRange('today')">Hoje</button>
        <button class="btn btn-sm ${this._reportRange === '7days' ? 'btn-primary' : ''}" onclick="App._setReportRange('7days')">7 dias</button>
        <button class="btn btn-sm ${this._reportRange === '30days' ? 'btn-primary' : ''}" onclick="App._setReportRange('30days')">30 dias</button>
        <span style="display:flex;gap:6px;align-items:center;margin-left:4px;">
          <input type="date" id="rpStart" value="${this._customStart || ''}" style="width:140px;padding:5px 8px;font-size:0.78rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <span style="color:var(--text-dim);font-size:0.75rem;">até</span>
          <input type="date" id="rpEnd" value="${this._customEnd || ''}" style="width:140px;padding:5px 8px;font-size:0.78rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);">
          <button class="btn btn-sm" onclick="App._applyCustomRange()">Aplicar</button>
        </span>
      </div>
    </div>
    <div id="reportContent"></div>`;
  this._renderReports();
};

App._setReportRange = function(range) {
  this._reportRange = range;
  this.renderRelatorios();
};

App._applyCustomRange = function() {
  const s = document.getElementById('rpStart').value;
  const e = document.getElementById('rpEnd').value;
  if (!s || !e) return;
  this._reportRange = 'custom';
  this._customStart = s;
  this._customEnd = e;
  this.renderRelatorios();
};

App._getRange = function() {
  if (this._reportRange === 'custom' && this._customStart && this._customEnd) {
    return { start: this._customStart, end: this._customEnd };
  }
  return Reports._resolveRange(this._reportRange);
};

App._renderReports = function() {
  const el = document.getElementById('reportContent');
  el.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="loading-spinner-inline"></div><br><br>Calculando indicadores...</div>';
  const range = this._getRange();
  const overview = Reports.overview(range);
  const profRank = Reports.professionalRanking(range);
  const servRank = Reports.serviceRanking(range);
  const clientMet = Reports.clientMetrics(range);
  const agendaRates = Reports.agendaRates(range);
  const invSummary = Reports.inventorySummary(range);
  const finSummary = Reports.financialSummary(range);

  el.innerHTML = `
    <div class="rp-section">
      ${C.sectionTitle('Visão Geral')}
      ${C.statGrid([
        { value: 'R$ ' + overview.revenue.toFixed(2).replace('.', ','), label: 'Faturamento' },
        { value: overview.count, label: 'Atendimentos' },
        { value: 'R$ ' + overview.avgTicket.toFixed(2).replace('.', ','), label: 'Ticket médio' },
      ])}
    </div>

    <div class="rp-section">
      <div class="section-title">Profissionais</div>
      ${profRank.length === 0 ? L.empty('Nenhum dado no período.') : `
      <div class="rp-table-wrap"><table>
        <thead><tr><th>Profissional</th><th>Atendimentos</th><th>Faturamento</th><th>Ticket médio</th></tr></thead>
        <tbody>${profRank.map(p => `
          <tr>
            <td><strong>${this._esc(p.name)}</strong></td>
            <td>${p.count}</td>
            <td>R$ ${p.revenue.toFixed(2).replace('.', ',')}</td>
            <td>R$ ${p.avgTicket.toFixed(2).replace('.', ',')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`}
    </div>

    <div class="rp-section">
      <div class="section-title">Serviços</div>
      ${servRank.length === 0 ? L.empty('Nenhum dado no período.') : `
      <div class="rp-table-wrap"><table>
        <thead><tr><th>Serviço</th><th>Atendimentos</th><th>%</th><th>Faturamento</th></tr></thead>
        <tbody>${servRank.map(s => `
          <tr>
            <td><strong>${this._esc(s.name)}</strong></td>
            <td>${s.count}</td>
            <td>
              <div class="rp-bar-wrap">
                <div class="rp-bar" style="width:${s.pct}%"></div>
                <span class="rp-bar-lbl">${s.pct.toFixed(1)}%</span>
              </div>
            </td>
            <td>R$ ${s.revenue.toFixed(2).replace('.', ',')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`}
    </div>

    <div class="rp-section">
      <div class="section-title">Clientes</div>
      <div class="rp-grid">
        <div class="rp-card"><span class="rp-num">${clientMet.newClients}</span><span class="rp-lbl">Novos</span></div>
        <div class="rp-card"><span class="rp-num">${clientMet.recurring}</span><span class="rp-lbl">Recorrentes</span></div>
        <div class="rp-card rp-card-warn"><span class="rp-num">${clientMet.inactive}</span><span class="rp-lbl">Inativos (+90 dias)</span></div>
      </div>
    </div>

    <div class="rp-section">
      <div class="section-title">Agenda</div>
      ${agendaRates.total === 0 ? L.empty('Nenhum agendamento no período.') : `
      <div class="rp-grid">
        <div class="rp-card rp-card-green"><span class="rp-num">${agendaRates.completionRate.toFixed(1)}%</span><span class="rp-lbl">Conclusão</span></div>
        <div class="rp-card rp-card-red"><span class="rp-num">${agendaRates.cancelRate.toFixed(1)}%</span><span class="rp-lbl">Cancelamento</span></div>
        <div class="rp-card rp-card-yellow"><span class="rp-num">${agendaRates.pendingRate.toFixed(1)}%</span><span class="rp-lbl">Não confirmados</span></div>
      </div>
      <div style="margin-top:8px;font-size:0.78rem;color:var(--text-muted);">
        Total no período: ${agendaRates.total} · Concluídos: ${agendaRates.completed} · Cancelados: ${agendaRates.cancelled} · Pendentes: ${agendaRates.pending}
      </div>`}
    </div>

    <div class="rp-section">
      <div class="section-title">Produtos</div>
      ${invSummary.count === 0 ? L.empty('Nenhuma venda', 'Nenhuma venda no per\u00edodo selecionado.', 'cart') : `
      <div class="rp-grid">
        <div class="rp-card"><span class="rp-num">${invSummary.count}</span><span class="rp-lbl">Vendas</span></div>
        <div class="rp-card"><span class="rp-num">R$ ${invSummary.totalRevenue.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Faturamento</span></div>
        <div class="rp-card"><span class="rp-num">R$ ${invSummary.avgTicket.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Ticket médio</span></div>
        <div class="rp-card"><span class="rp-num">${invSummary.grossMargin.toFixed(1)}%</span><span class="rp-lbl">Margem bruta</span></div>
      </div>
      <div style="margin-top:12px;">
        <div class="section-title" style="font-size:0.68rem;">Produtos mais vendidos</div>
        <div class="table-wrap"><table><thead><tr><th>Produto</th><th>Qtd</th><th>Faturamento</th></tr></thead>
        <tbody>${invSummary.topProducts.slice(0, 10).map(p => `
          <tr><td>${this._esc(p.name)}</td><td>${p.qty}</td><td>R$ ${p.revenue.toFixed(2).replace('.', ',')}</td></tr>
        `).join('')}</tbody></table></div>
      </div>
      <div style="margin-top:12px;">
        <div class="section-title" style="font-size:0.68rem;">Faturamento por categoria</div>
        <div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Qtd</th><th>Faturamento</th><th>Margem</th></tr></thead>
        <tbody>${invSummary.byCategory.map(c => `
          <tr><td>${this._esc(c.category)}</td><td>${c.qty}</td><td>R$ ${c.revenue.toFixed(2).replace('.', ',')}</td><td>${c.margin.toFixed(1)}%</td></tr>
        `).join('')}</tbody></table></div>
      </div>`}
    </div>

    <div class="rp-section">
      <div class="section-title">Financeiro</div>
      ${finSummary.count === 0 ? L.empty('Nenhum lançamento no período.') : `
      <div class="rp-grid">
        <div class="rp-card rp-card-green"><span class="rp-num">R$ ${finSummary.entries.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Receitas</span></div>
        <div class="rp-card rp-card-red"><span class="rp-num">R$ ${finSummary.exits.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Despesas</span></div>
        <div class="rp-card ${finSummary.balance >= 0 ? 'rp-card-green' : 'rp-card-red'}"><span class="rp-num">R$ ${finSummary.balance.toFixed(2).replace('.', ',')}</span><span class="rp-lbl">Lucro operacional</span></div>
      </div>
      <div style="margin-top:12px;">
        <div class="section-title" style="font-size:0.68rem;">Receitas por categoria</div>
        <div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Entradas</th><th>Saídas</th></tr></thead>
        <tbody>${finSummary.byCategory.map(c => `<tr><td>${this._esc(c.category)}</td><td>R$ ${c.entries.toFixed(2).replace('.', ',')}</td><td style="color:#f87171;">R$ ${c.exits.toFixed(2).replace('.', ',')}</td></tr>`).join('')}</tbody></table></div>
      </div>`}
    </div>`;
};
