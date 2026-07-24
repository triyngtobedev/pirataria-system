const App = {
  currentModule: null,
  _agendaView: 'week',
  _weekOffset: 0,
  _focusedDay: null,
  _profFilter: 'todos',
  _panelClientId: null,

  init() {
    Migrations.run();
    Auth.init();
    if (Auth.isAuthenticated()) {
      this._boot();
    } else {
      this._showLogin();
    }
  },

  _boot() {
    DB.seed();
    document.getElementById('loginOverlay').classList.remove('show');
    document.getElementById('appShell').classList.add('show');
    this._applyPermissions();
    this.bindNav();
    this.navigate(this._getDefaultModule());
  },

  _applyPermissions() {
    document.querySelectorAll('[data-module]').forEach(link => {
      const mod = link.dataset.module;
      link.style.display = Permissions.canAccess(mod) ? '' : 'none';
    });
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      const s = Auth.session();
      logoutBtn.textContent = 'Sair (' + (s ? s.userName : '') + ')';
    }
  },

  _getDefaultModule() {
    const modules = Permissions.allowedModules();
    return modules.length > 0 ? modules[0] : null;
  },

  _showLogin() {
    document.getElementById('loginOverlay').classList.add('show');
    document.getElementById('appShell').classList.remove('show');
  },

  _doLogin() {
    const login = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    if (!login || !password) return;
    const result = Auth.login(login, password);
    if (result.ok) {
      this._boot();
    } else {
      document.getElementById('loginError').textContent = result.error;
      document.getElementById('loginError').style.display = 'block';
    }
  },

  _doLogout() {
    Auth.logout();
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('loginError').style.display = 'none';
    this._showLogin();
  },

  bindNav() {
    document.querySelectorAll('[data-module]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(link.dataset.module);
      });
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
