App.navigate = function(module) {
  if (!Permissions.canAccess(module)) {
    const def = this._getDefaultModule();
    if (def) module = def;
    else return;
  }

  this.currentModule = module;

  document.querySelectorAll('[data-module]').forEach(a => {
    a.classList.toggle('active', a.dataset.module === module);
  });

  document.getElementById('moduleTitle').textContent = MODULE_TITLES[module] || 'Dashboard';

  const renderers = { agenda: 'renderAgenda', clientes: 'renderClientes', atendimento: 'renderAtendimento', studio: 'renderStudio', relatorios: 'renderRelatorios', estoque: 'renderEstoque', financeiro: 'renderFinanceiro', os: 'renderOS', termos: 'renderTermos', lembretes: 'renderLembretes', comissoes: 'renderComissoes', vales: 'renderVales', pacotes: 'renderPacotes' };
  if (renderers[module]) this[renderers[module]]();
};
