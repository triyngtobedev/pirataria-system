App._estoqueTab = 'produtos';

App.renderEstoque = function() {
  const container = document.getElementById('moduleContent');
  const tabs = [
    { id: 'produtos', label: 'Produtos' },
    { id: 'categorias', label: 'Categorias' },
    { id: 'movimentos', label: 'Movimentações' },
    { id: 'vendas', label: 'Vendas' },
  ];
  container.innerHTML = `
    <div class="et-tabs">
      ${tabs.map(t => `<button class="btn btn-sm ${this._estoqueTab === t.id ? 'btn-primary' : ''}" onclick="App._setEstoqueTab('${t.id}')">${t.label}</button>`).join('')}
    </div>
    <div id="estoqueContent"></div>`;
  this._renderEstoqueTab();
};

App._setEstoqueTab = function(tab) {
  this._estoqueTab = tab;
  this.renderEstoque();
};

App._renderEstoqueTab = function() {
  const el = document.getElementById('estoqueContent');
  if (this._estoqueTab === 'produtos') this._renderProdutos(el);
  else if (this._estoqueTab === 'categorias') this._renderCategorias(el);
  else if (this._estoqueTab === 'movimentos') this._renderMovimentos(el);
  else if (this._estoqueTab === 'vendas') this._renderVendas(el);
};

// ─── Produtos ───
App._renderProdutos = function(el) {
  const products = Repos.produtos.list();
  const alerts = Inventory.alerts();
  el.innerHTML = `
    <div class="et-alerts">
      ${alerts.outOfStock.length > 0 ? `<div class="od-alert od-alert-danger"><span class="od-alert-title">Sem estoque (${alerts.outOfStock.length})</span><span class="od-alert-text">${alerts.outOfStock.map(p => p.name).join(', ')}</span></div>` : ''}
      ${alerts.belowMin.length > 0 ? `<div class="od-alert od-alert-warning"><span class="od-alert-title">Abaixo do mínimo (${alerts.belowMin.length})</span><span class="od-alert-text">${alerts.belowMin.map(p => p.name).join(', ')}</span></div>` : ''}
      ${alerts.inactiveWithStock.length > 0 ? `<div class="od-alert od-alert-info"><span class="od-alert-title">Inativos com estoque (${alerts.inactiveWithStock.length})</span><span class="od-alert-text">${alerts.inactiveWithStock.map(p => p.name).join(', ')}</span></div>` : ''}
    </div>
    <div class="flex-between mb-12"><div class="section-title">Produtos (${products.length})</div><button class="btn btn-primary btn-sm" onclick="App._showAddProduct()">+ Novo</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nome</th><th>Categoria</th><th>Venda</th><th>Custo</th><th>Estoque</th><th>Mín.</th><th>Status</th><th></th></tr></thead>
      <tbody>${products.map(p => {
        const status = !p.active ? '<span class="badge badge-cancelled">Inativo</span>' : p.stock <= 0 ? '<span class="badge badge-cancelled">Sem estoque</span>' : p.stock <= p.minStock ? '<span class="badge badge-scheduled">Mínimo</span>' : '<span class="badge badge-completed">OK</span>';
        return `<tr><td><strong>${App._esc(p.name)}</strong></td><td class="text-muted text-sm">${App._esc(p.category) || '—'}</td><td>${p.salePrice ? 'R$ ' + App._esc(p.salePrice) : '—'}</td><td class="text-muted text-sm">${p.costPrice ? 'R$ ' + App._esc(p.costPrice) : '—'}</td><td>${p.stock}</td><td class="text-muted text-sm">${p.minStock}</td><td>${status}</td>
        <td><div class="actions"><button class="btn btn-sm" onclick="App._editProduct('${p.id}')">Editar</button><button class="btn btn-sm" onclick="App._showStockEntry('${p.id}')">Entrada</button><button class="btn btn-sm btn-danger" onclick="App._toggleProduct('${p.id}')">${p.active ? 'Desativar' : 'Ativar'}</button></div></td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
};

App._showAddProduct = function() {
  const cats = Repos.produtos.categories.active();
  this._showOverlay('Novo produto', `
    <div class="form-group"><label>Nome *</label><input type="text" id="pName"></div>
    <div class="form-row"><div class="form-group"><label>Categoria</label><select id="pCategory"><option value="">—</option>${cats.map(c => '<option value="' + App._esc(c.name) + '">' + App._esc(c.name) + '</option>').join('')}</select></div>
    <div class="form-group"><label>SKU</label><input type="text" id="pSku"></div></div>
    <div class="form-row"><div class="form-group"><label>Valor de custo (R$)</label><input type="text" id="pCost"></div><div class="form-group"><label>Valor de venda (R$)</label><input type="text" id="pPrice"></div></div>
    <div class="form-row"><div class="form-group"><label>Estoque inicial</label><input type="number" id="pStock" value="0" min="0"></div><div class="form-group"><label>Estoque mínimo</label><input type="number" id="pMinStock" value="0" min="0"></div></div>
    <div class="form-group"><label>Observações</label><textarea id="pNotes" rows="2"></textarea></div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._addProduct()">Salvar</button></div>
  `);
};

App._addProduct = function() {
  const name = document.getElementById('pName').value.trim();
  if (!name) return;
  const stock = parseInt(document.getElementById('pStock').value) || 0;
  const product = Repos.produtos.create({ name, category: document.getElementById('pCategory').value, sku: document.getElementById('pSku').value.trim(), costPrice: document.getElementById('pCost').value.trim(), salePrice: document.getElementById('pPrice').value.trim(), stock, minStock: document.getElementById('pMinStock').value, notes: document.getElementById('pNotes').value.trim() });
  if (stock > 0 && product) Repos.produtos.movements.create({ productId: product.id, type: 'entrada', qty: stock, reason: 'Estoque inicial' });
  this._closeOverlay(); this.renderEstoque();
};

App._editProduct = function(id) {
  const p = Repos.produtos.list().find(x => x.id === id); if (!p) return;
  const cats = Repos.produtos.categories.active();
  this._showOverlay('Editar produto', `
    <div class="form-group"><label>Nome *</label><input type="text" id="pName" value="${this._esc(p.name)}"></div>
    <div class="form-row"><div class="form-group"><label>Categoria</label><select id="pCategory"><option value="">—</option>${cats.map(c => '<option value="' + App._esc(c.name) + '"' + (c.name === p.category ? ' selected' : '') + '>' + App._esc(c.name) + '</option>').join('')}</select></div>
    <div class="form-group"><label>SKU</label><input type="text" id="pSku" value="${this._esc(p.sku)}"></div></div>
    <div class="form-row"><div class="form-group"><label>Valor de custo (R$)</label><input type="text" id="pCost" value="${this._esc(p.costPrice)}"></div><div class="form-group"><label>Valor de venda (R$)</label><input type="text" id="pPrice" value="${this._esc(p.salePrice)}"></div></div>
    <div class="form-row"><div class="form-group"><label>Estoque</label><input type="number" id="pStock" value="${p.stock}" min="0"></div><div class="form-group"><label>Estoque mínimo</label><input type="number" id="pMinStock" value="${p.minStock}" min="0"></div></div>
    <div class="form-group"><label>Observações</label><textarea id="pNotes" rows="2">${this._esc(p.notes)}</textarea></div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._doEditProduct('${id}')">Salvar</button></div>
  `);
};
App._doEditProduct = function(id) {
  Repos.produtos.update(id, { name: document.getElementById('pName').value.trim(), category: document.getElementById('pCategory').value, sku: document.getElementById('pSku').value.trim(), costPrice: document.getElementById('pCost').value.trim(), salePrice: document.getElementById('pPrice').value.trim(), stock: parseInt(document.getElementById('pStock').value) || 0, minStock: parseInt(document.getElementById('pMinStock').value) || 0, notes: document.getElementById('pNotes').value.trim() });
  this._closeOverlay(); this.renderEstoque();
};

App._toggleProduct = function(id) {
  const p = Repos.produtos.list().find(x => x.id === id); if (!p) return;
  Repos.produtos.update(id, { active: !p.active }); this.renderEstoque();
};

App._showStockEntry = function(id) {
  this._showOverlay('Entrada de estoque', `
    <div class="form-group"><label>Quantidade</label><input type="number" id="entryQty" value="1" min="1"></div>
    <div class="form-group"><label>Motivo</label><input type="text" id="entryReason" placeholder="Ex: reposição"></div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._doStockEntry('${id}')">Registrar</button></div>
  `);
};
App._doStockEntry = function(id) {
  const p = Repos.produtos.list().find(x => x.id === id); if (!p) return;
  const qty = parseInt(document.getElementById('entryQty').value) || 0;
  if (qty <= 0) return;
  Repos.produtos.update(id, { stock: (p.stock || 0) + qty });
  Repos.produtos.movements.create({ productId: id, type: 'entrada', qty, reason: document.getElementById('entryReason').value.trim() || 'Entrada manual' });
  this._closeOverlay(); this.renderEstoque();
};

// ─── Categorias ───
App._renderCategorias = function(el) {
  const cats = Repos.produtos.categories.list();
  el.innerHTML = `
    <div class="flex-between mb-12"><div class="section-title">Categorias</div><button class="btn btn-primary btn-sm" onclick="App._showAddCategory()">+ Nova</button></div>
    <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Status</th><th></th></tr></thead>
    <tbody>${cats.map(c => `<tr><td><strong>${this._esc(c.name)}</strong></td><td><span class="badge ${c.active ? 'badge-completed' : 'badge-cancelled'}">${c.active ? 'Ativa' : 'Inativa'}</span></td>
    <td><div class="actions"><button class="btn btn-sm" onclick="App._editCategory('${c.id}')">Editar</button><button class="btn btn-sm ${c.active ? 'btn-warning' : 'btn-success'}" onclick="App._toggleCategory('${c.id}')">${c.active ? 'Desativar' : 'Ativar'}</button></div></td></tr>`).join('')}</tbody></table></div>`;
};
App._showAddCategory = function() {
  this._showOverlay('Nova categoria', `<div class="form-group"><label>Nome</label><input type="text" id="catName"></div>
    <div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._addCategory()">Salvar</button></div>`);
};
App._addCategory = function() { const n = document.getElementById('catName').value.trim(); if (!n) return; Repos.produtos.categories.create({ name: n }); this._closeOverlay(); App._toast('Categoria adicionada.', 'success'); this.renderEstoque(); };
App._editCategory = function(id) { const c = Repos.produtos.categories.list().find(x => x.id === id); if (!c) return; this._showOverlay('Editar categoria', `<div class="form-group"><label>Nome</label><input type="text" id="catName" value="${this._esc(c.name)}"></div><div class="overlay-actions"><button class="btn" onclick="App._closeOverlay()">Cancelar</button><button class="btn btn-primary" onclick="App._doEditCategory('${id}')">Salvar</button></div>`); };
App._doEditCategory = function(id) { Repos.produtos.categories.update(id, { name: document.getElementById('catName').value.trim() }); this._closeOverlay(); App._toast('Categoria atualizada.', 'success'); this.renderEstoque(); };
App._toggleCategory = function(id) { const c = Repos.produtos.categories.list().find(x => x.id === id); if (!c) return; Repos.produtos.categories.update(id, { active: !c.active }); App._toast('Categoria ' + (c.active ? 'desativada' : 'ativada') + '.', 'success'); this.renderEstoque(); };

// ─── Movimentações ───
App._renderMovimentos = function(el) {
  const movs = Repos.produtos.movements.list();
  el.innerHTML = `
    <div class="flex-between mb-12"><div class="section-title">Histórico de movimentações</div></div>
    <div class="table-wrap"><table><thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Motivo</th></tr></thead>
    <tbody>${movs.slice(0, 200).map(m => {
      const p = Repos.produtos.list().find(x => x.id === m.productId);
      return `<tr><td class="text-muted text-sm">${m.createdAt ? m.createdAt.slice(0, 16).replace('T', ' ') : '—'}</td>
      <td>${p ? App._esc(p.name) : '—'}</td>
      <td><span class="badge ${m.type === 'entrada' ? 'badge-completed' : 'badge-cancelled'}">${m.type === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
      <td>${m.qty}</td><td class="text-muted text-sm">${App._esc(m.reason) || '—'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
};

// ─── Vendas ───
App._vendaItems = [];

App._renderVendas = function(el) {
  const sales = Repos.produtos.sales.list();
  const products = Repos.produtos.active().filter(p => p.stock > 0);

  let cartHtml = L.empty('Carrinho vazio', 'Clique nos produtos ao lado para adicioná-los ao carrinho.', 'cart');
  if (this._vendaItems.length > 0) {
    const subtotal = this._vendaItems.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0);
    cartHtml = `<table><thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Subtotal</th><th></th></tr></thead><tbody>
      ${this._vendaItems.map((item, idx) => `<tr><td>${App._esc(item.name)}</td><td>${item.qty}</td><td>R$ ${App._esc(item.price)}</td><td>R$ ${parseFloat(item.subtotal).toFixed(2).replace('.',',')}</td>
      <td><button class="btn btn-sm btn-danger" onclick="App._removeVendaItem(${idx})">Remover</button></td></tr>`).join('')}
      <tr><td colspan="3" style="text-align:right;font-weight:600;">Subtotal</td><td>R$ ${subtotal.toFixed(2).replace('.',',')}</td><td></td></tr>
    </tbody></table>
    <div class="flex gap-8 mt-12"><div class="form-group" style="max-width:160px;"><label>Desconto (R$)</label><input type="text" id="vendaDiscount" value="0" oninput="App._updateVendaTotal()"></div>
    <div class="form-group" style="max-width:160px;"><label>Total</label><strong style="font-size:1.1rem;color:var(--gold);display:block;padding-top:4px;" id="vendaTotal">R$ ${subtotal.toFixed(2).replace('.',',')}</strong></div></div>
    <div class="flex gap-8 mt-12"><button class="btn btn-primary" onclick="App._finishVenda()">Finalizar venda</button><button class="btn btn-sm btn-danger" onclick="App._clearVenda()">Limpar carrinho</button></div>`;
  }

  el.innerHTML = `
    <div class="et-venda-layout">
      <div class="et-venda-products">
        <div class="section-title">Produtos</div>
        <div class="et-prod-list">${products.map(p => `
          <div class="et-prod-card" onclick="App._addVendaItem('${p.id}')">
            <span class="et-prod-name">${this._esc(p.name)}</span>
            <span class="et-prod-price">R$ ${this._esc(p.salePrice)}</span>
            <span class="et-prod-stock">Est: ${p.stock}</span>
          </div>
        `).join('')}${products.length === 0 ? C.emptyStateFull({icon:'box', title:'Nenhum produto', desc:'Cadastre produtos na aba "Produtos".', btnLabel:'+ Novo produto', btnAction:"App._showAddProduct()"}) : ''}</div>
      </div>
      <div class="et-venda-cart">
        <div class="section-title">Carrinho</div>
        ${cartHtml}
      </div>
    </div>
    <div class="module-section" style="margin-top:24px;">
      <div class="section-title">Vendas recentes</div>
      ${sales.length === 0 ? L.empty('Nenhuma venda registrada.') :
      `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Itens</th><th>Desconto</th><th>Total</th></tr></thead><tbody>
      ${sales.slice(0, 50).map(s => `<tr><td class="text-muted text-sm">${s.createdAt ? s.createdAt.slice(0, 16).replace('T', ' ') : '—'}</td><td>${(s.items || []).length}</td><td class="text-muted text-sm">R$ ${(parseFloat(s.discount) || 0).toFixed(2).replace('.',',')}</td><td><strong>R$ ${(parseFloat(s.total) || 0).toFixed(2).replace('.',',')}</strong></td></tr>`).join('')}
      </tbody></table></div>`}
    </div>`;
};

App._addVendaItem = function(productId) {
  const p = Repos.produtos.list().find(x => x.id === productId);
  if (!p || p.stock <= 0) return;
  const existing = this._vendaItems.find(i => i.productId === productId);
  if (existing) { existing.qty++; existing.subtotal = (parseFloat(existing.price) * existing.qty).toFixed(2); }
  else { this._vendaItems.push({ productId, name: p.name, price: p.salePrice, qty: 1, subtotal: p.salePrice }); }
  this.renderEstoque();
};

App._removeVendaItem = function(idx) { this._vendaItems.splice(idx, 1); this.renderEstoque(); };
App._clearVenda = function() { this._vendaItems = []; this.renderEstoque(); };

App._updateVendaTotal = function() {
  const subtotal = this._vendaItems.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0);
  const disc = parseFloat(document.getElementById('vendaDiscount').value.replace(',', '.')) || 0;
  const total = Math.max(0, subtotal - disc);
  document.getElementById('vendaTotal').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
};

App._finishVenda = function() {
  if (this._vendaItems.length === 0) return;
  if (App._locks['finishVenda']) return;
  App._locks['finishVenda'] = true;
  const subtotal = this._vendaItems.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0);
  const disc = parseFloat(document.getElementById('vendaDiscount').value.replace(',', '.')) || 0;
  const total = Math.max(0, subtotal - disc);
  const sale = Repos.produtos.sales.create({ items: this._vendaItems.map(i => ({ ...i })), discount: disc, total });
  Events.emit('venda.completed', { id: sale.id, total, items: this._vendaItems.map(i => ({ ...i })) });
  Audit.action('create', 'estoque', sale.id, 'Venda finalizada');
  this._vendaItems = [];
  App._locks['finishVenda'] = false;
  App._toast('Venda finalizada com sucesso!', 'success');
  this.renderEstoque();
};
