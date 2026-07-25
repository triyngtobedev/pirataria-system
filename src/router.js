App._pendingNavigation = null;

App.navigate = function(module) {
  if (!Permissions.canAccess(module)) {
    var def = this._getDefaultModule();
    if (def) module = def;
    else return;
  }

  if (this._isDirty && this._isDirty()) {
    App._pendingNavigation = module;
    App._checkDirty(function() {
      App._doNavigate(App._pendingNavigation);
      App._pendingNavigation = null;
    });
    return;
  }

  this._doNavigate(module);
};

App._doNavigate = function(module) {
  this.currentModule = module;

  document.querySelectorAll('[data-module]').forEach(function(a) {
    a.classList.toggle('active', a.dataset.module === module);
  });

  document.getElementById('moduleTitle').textContent = MODULE_TITLES[module] || 'Dashboard';

  var renderers = { hoje: 'renderHoje', comunicacao: 'renderComunicacao', confirmacao: 'renderConfirmacao', inbox: 'renderInbox', orcamentos: 'renderOrcamentos', oportunidades: 'renderOportunidades', filas: 'renderFilas', marketing: 'renderMarketing', conhecimento: 'renderConhecimento', aihub: 'renderAIHub', agenda: 'renderAgenda', clientes: 'renderClientes', atendimento: 'renderAtendimento', studio: 'renderStudio', relatorios: 'renderRelatorios', estoque: 'renderEstoque', financeiro: 'renderFinanceiro', os: 'renderOS', termos: 'renderTermos', lembretes: 'renderLembretes', comissoes: 'renderComissoes', vales: 'renderVales', pacotes: 'renderPacotes' };
  if (renderers[module]) this[renderers[module]]();
};
