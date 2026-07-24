const Permissions = {
  _rules: {
    admin: {
      modules: ['agenda', 'clientes', 'atendimento', 'financeiro', 'estoque', 'relatorios', 'studio', 'os', 'termos', 'lembretes', 'comissoes', 'vales', 'pacotes'],
      canManageUsers: true,
      canManageSettings: true,
    },
    piercer: {
      modules: ['agenda', 'clientes', 'atendimento', 'os', 'termos', 'pacotes'],
      canManageUsers: false,
      canManageSettings: false,
    },
    reception: {
      modules: ['agenda', 'clientes', 'atendimento', 'estoque', 'os', 'termos', 'vales', 'pacotes'],
      canManageUsers: false,
      canManageSettings: false,
    },
    management: {
      modules: ['agenda', 'clientes', 'atendimento', 'financeiro', 'estoque', 'relatorios', 'os', 'termos', 'lembretes', 'comissoes', 'vales', 'pacotes'],
      canManageUsers: false,
      canManageSettings: true,
    },
  },

  canAccess(module) {
    const session = Auth.session();
    if (!session) return false;
    const role = this._rules[session.role];
    if (!role) return false;
    return role.modules.includes(module);
  },

  canManageUsers() {
    const session = Auth.session();
    return session && this._rules[session.role] && this._rules[session.role].canManageUsers;
  },

  canManageSettings() {
    const session = Auth.session();
    return session && this._rules[session.role] && this._rules[session.role].canManageSettings;
  },

  allowedModules() {
    const session = Auth.session();
    if (!session) return [];
    const role = this._rules[session.role];
    return role ? role.modules : [];
  },

  hasAnyModule() {
    return this.allowedModules().length > 0;
  },
};
